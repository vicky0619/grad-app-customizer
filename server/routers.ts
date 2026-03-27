import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { encrypt, decrypt } from "./_core/crypto";
import type { LLMConfig } from "./_core/llm";

function getUserLLMConfig(user: { llmApiKey?: string | null; llmBaseUrl?: string | null; llmModel?: string | null }): LLMConfig {
  return {
    apiKey: user.llmApiKey ? decrypt(user.llmApiKey) : undefined,
    baseUrl: user.llmBaseUrl ?? undefined,
    model: user.llmModel ?? undefined,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "信箱或密碼錯誤" });
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "信箱或密碼錯誤" });
        }
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "此信箱已被使用" });
        }
        const openId = nanoid();
        const passwordHash = await hashPassword(input.password);
        await db.upsertUser({
          openId,
          email: input.email,
          name: input.name,
          loginMethod: "email",
          passwordHash,
          lastSignedIn: new Date(),
        });
        const token = await sdk.createSessionToken(openId, { name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return {
        hasApiKey: !!ctx.user.llmApiKey,
        llmBaseUrl: ctx.user.llmBaseUrl ?? "",
        llmModel: ctx.user.llmModel ?? "",
      };
    }),
    saveSettings: protectedProcedure
      .input(z.object({
        apiKey: z.string().optional(),
        llmBaseUrl: z.string(),
        llmModel: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const update: Parameters<typeof db.upsertUser>[0] = {
          openId: ctx.user.openId,
          llmBaseUrl: input.llmBaseUrl || null,
          llmModel: input.llmModel || null,
        };
        if (input.apiKey && input.apiKey.trim().length > 0) {
          update.llmApiKey = encrypt(input.apiKey.trim());
        }
        await db.upsertUser(update);
        return { success: true } as const;
      }),
  }),

  // Template management router
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserTemplates(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        documentType: z.enum(["cv", "sop", "lor"]),
        orientation: z.enum(["general", "job_hunting", "employment", "entrepreneurship"]),
        name: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const templateId = await db.createTemplate({
          userId: ctx.user.id,
          ...input,
        });
        return { templateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.updateTemplate(input.id, {
          name: input.name,
          content: input.content,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.deleteTemplate(input.id);
        return { success: true };
      }),

    getByType: protectedProcedure
      .input(z.object({ documentType: z.enum(["cv", "sop", "lor"]) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserTemplatesByType(ctx.user.id, input.documentType);
      }),
  }),

  programs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPrograms(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        universityName: z.string(),
        programName: z.string(),
        country: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const programId = await db.createProgram({
          userId: ctx.user.id,
          ...input,
        });
        return { programId };
      }),
    
    getById: protectedProcedure
      .input(z.object({ programId: z.number() }))
      .query(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return program;
      }),
    
    researchProgram: protectedProcedure
      .input(z.object({ programId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        await db.updateProgramStatus(input.programId, "researching");
        
        const promptText = `請搜索以下碩士項目的完整詳細信息:

大學: ${program.universityName}
項目: ${program.programName}
${program.country ? `國家: ${program.country}` : ''}

請提供以下方面的詳細信息:

1. **課程設置** (Courses)
   - 完整的核心課程(required courses)列表,包含課程代碼和名稱
   - 選修課程(elective courses)方向和具體課程列表
   - 課程結構和學分要求
   - 搜索網路上其他學生推薦的課表和選課建議

2. **教職員信息** (Faculty Members)
   - 重點教授名單及其研究方向
   - 實驗室/研究組信息
   - 教授的代表性研究成果

3. **入學要求** (Requirements)
   - 學術背景要求
   - 語言成績要求(TOEFL/IELTS)
   - 先修課程要求
   - GPA/GRE等標準化考試要求

4. **項目特色** (Unique Characteristics)
   - 項目獨特優勢和亮點
   - Women in STEM 社群的具體名稱和活動
   - 特殊項目/計劃
   - 研究機會和資源

5. **研究領域** (Research Areas)
   - 主要研究方向
   - 跨學科合作領域
   - 新興研究主題和趨勢

6. **畢業要求和規劃** (Graduation Requirements)
   - 總學分要求
   - 論文/項目要求
   - 典型的課程時間規劃(coursework timeline)
   - 畢業條件和里程碑

7. **就業資源** (Career Resources)
   - Career center 提供的服務
   - 企業合作夥伴
   - 實習機會
   - 校友網絡
   - 就業率和畢業生去向

8. **項目取向** (Program Orientation)
   請判斷這個項目主要屬於以下哪種取向:
   - job_hunting (找工取向): 課程強調算法、數據結構、系統設計,有技術面試準備資源
   - employment (就業取向): 強調產業合作、實習機會、企業贊助項目
   - entrepreneurship (新創取向): 提供創業支持、孵化器、創新創業課程
   - mixed (混合取向): 兼具多種取向特徵

9. **技術方向** (Technical Focus)
   請仔細分析項目的技術重點,判斷主要focus在以下哪些方向(可多選):
   - NLP (Natural Language Processing): 自然語言處理、語言模型、文本分析
   - ML (Machine Learning): 機器學習、深度學習、模型訓練
   - AI (Artificial Intelligence): 人工智能、計算機視覺、強化學習
   - System (Systems): 分佈式系統、操作系統、雲計算
   - Network (Networking): 網絡安全、網絡協議、通信系統
   - Data (Data Science): 數據分析、大數據、數據工程
   - HCI (Human-Computer Interaction): 人機交互、用戶體驗
   - Other: 其他方向
   
   請根據課程設置、教授研究方向、項目特色來判斷,並列出該項目最重視的2-3個技術方向。

10. **必修課程詳細列表** (Required Courses)
   列出所有必修課程,包含:
   - 課程代碼
   - 課程名稱
   - 學分數
   - 課程簡介

11. **選修課程詳細列表** (Elective Courses)
   列出主要選修課程,按方向分類:
   - 課程代碼
   - 課程名稱
   - 學分數
   - 所屬方向

12. **Track選項** (Track Options)
   詳細說明項目提供的track選項:
   - Non-thesis track: 要求、課程安排、適合對象
   - Thesis track: 要求、研究內容、適合對象
   - Coursework track: 要求、課程安排、適合對象
   - 其他特殊track
   
   請特別關注non-thesis和coursework track的詳細信息。

13. **申請文件要求** (Admission Document Requirements)
   詳細說明申請時需要提交的文件,特別關注:
   - 文件類型: Statement of Purpose / Personal Statement / Essay Questions / 其他
   - 字數限制: 如果有明確限制請註明(例如: 500 words, 1000 words, 2 pages)
   - 具體問題: 如果有多個問題需要回答,請列出每個問題的完整文字和字數限制
   - 格式要求: 是否有特殊格式要求
   
   例如:
   - 如果是標準SoP: {"documentType": "sop", "wordLimit": 1000}
   - 如果是多個問題: {"documentType": "essay_questions", "questions": [{"question": "Why this program?", "wordLimit": 500}, {"question": "Career goals?", "wordLimit": 500}]}

請盡可能詳細和具體,提供真實準確的信息。`;
        
        // Use LLM to search for program information
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a research assistant specializing in graduate programs. Provide detailed, accurate information about master's programs based on the latest available data."
            },
            {
              role: "user",
              content: promptText
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "program_research",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  courses: { type: "string", description: "Detailed course information" },
                  facultyMembers: { type: "string", description: "Faculty information" },
                  requirements: { type: "string", description: "Admission requirements" },
                  uniqueCharacteristics: { type: "string", description: "Unique program features" },
                  researchAreas: { type: "string", description: "Research areas" },
                  graduationRequirements: { type: "string", description: "Graduation requirements" },
                  careerResources: { type: "string", description: "Career resources" },
                  programOrientation: { 
                    type: "string", 
                    enum: ["job_hunting", "employment", "entrepreneurship", "mixed"],
                    description: "Program orientation type"
                  },
                  technicalFocus: { type: "string", description: "Technical focus areas (NLP/ML/AI/System/Network/Data/HCI)" },
                  requiredCourses: { type: "string", description: "Detailed list of required courses" },
                  electiveCourses: { type: "string", description: "Detailed list of elective courses" },
                  trackOptions: { type: "string", description: "Track options (non-thesis, thesis, coursework)" },
                  recommendedCourses: { type: "string", description: "Recommended course selection" },
                  admissionRequirements: { type: "string", description: "Admission document requirements in JSON format" },
                },
                required: ["courses", "facultyMembers", "requirements", "uniqueCharacteristics", "researchAreas", "graduationRequirements", "careerResources", "programOrientation", "technicalFocus", "requiredCourses", "electiveCourses", "trackOptions"],
                additionalProperties: false,
              },
            },
          },
        }, getUserLLMConfig(ctx.user));

        const content = response.choices[0].message.content;
        if (typeof content !== 'string') {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid LLM response" });
        }
        const researchData = JSON.parse(content);
        
        // Check if research already exists
        const existingResearch = await db.getProgramResearch(input.programId);
        if (existingResearch) {
          await db.updateProgramResearch(input.programId, researchData);
        } else {
          await db.createProgramResearch({
            programId: input.programId,
            ...researchData,
          });
        }
        
        await db.updateProgramStatus(input.programId, "draft");
        
        return researchData;
      }),
    
    getResearch: protectedProcedure
      .input(z.object({ programId: z.number() }))
      .query(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const research = await db.getProgramResearch(input.programId);
        return research || null;
      }),
    
    generateDocument: protectedProcedure
      .input(z.object({
        programId: z.number(),
        documentType: z.enum(["cv", "sop", "lor"]),
        userInstructions: z.string().optional(),
        admissionRequirements: z.any().optional(), // {documentType, wordLimit, questions}
      }))
      .mutation(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        await db.updateProgramStatus(input.programId, "generating");
        
        // Get user templates
        const templates = await db.getUserTemplatesByType(ctx.user.id, input.documentType);
        if (templates.length === 0) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `No ${input.documentType.toUpperCase()} templates found. Please create templates first.` 
          });
        }
        
        // Get program research
        const research = await db.getProgramResearch(input.programId);
        if (!research) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Program research not found. Please research the program first." });
        }
        
        let selectedTemplate;
        let selectionReasoning = "";
        
        // For SoP, use LLM to select the best template
        if (input.documentType === "sop" && templates.length > 1) {
          const templatesInfo = templates.map((t, idx) => 
            `${idx + 1}. SoP範本 - ${t.orientation === "job_hunting" ? "找工取向" : t.orientation === "employment" ? "就業取向" : t.orientation === "entrepreneurship" ? "新創取向" : "通用"}\n${t.content.substring(0, 500)}...`
          ).join("\n\n");
          
          const selectionPrompt = `任務: 為目標項目選擇最適合的SoP範本

項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 項目取向: ${research.programOrientation}
- 項目特色: ${research.uniqueCharacteristics?.substring(0, 300)}
- 就業資源: ${research.careerResources?.substring(0, 300)}

可用範本:
${templatesInfo}

請根據項目取向選擇最匹配的範本。如果項目特色涵蓋多個取向,可以選擇主要範本並說明是否需要融合其他範本的元素。

輸出格式: JSON
{
  "selected_index": 1或2或3,
  "should_blend": true/false,
  "blend_elements": ["從其他範本融合的具體元素"],
  "reasoning": "選擇理由"
}`;

          const selectionResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an expert in graduate school applications. Select the most appropriate template based on program characteristics."
              },
              {
                role: "user",
                content: selectionPrompt
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "template_selection",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    selected_index: { type: "number" },
                    should_blend: { type: "boolean" },
                    blend_elements: { 
                      type: "array",
                      items: { type: "string" }
                    },
                    reasoning: { type: "string" },
                  },
                  required: ["selected_index", "should_blend", "blend_elements", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          }, getUserLLMConfig(ctx.user));

          const selectionContent = selectionResponse.choices[0].message.content;
          if (typeof selectionContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          const selection = JSON.parse(selectionContent);
          selectedTemplate = templates[selection.selected_index - 1];
          selectionReasoning = selection.reasoning;
          
          // Check if we have specific admission requirements
          const admissionReq = input.admissionRequirements || (research.admissionRequirements ? JSON.parse(research.admissionRequirements) : null);
          const isMultiQuestion = admissionReq?.documentType === "essay_questions" && admissionReq?.questions?.length > 0;
          const wordLimit = admissionReq?.wordLimit || 1000;
          
          // Generate document with selected template
          const generatePrompt = isMultiQuestion ? 
            `任務: 根據多個Essay Questions客製化申請文件

選定範本: ${selectedTemplate.orientation === "job_hunting" ? "找工取向" : selectedTemplate.orientation === "employment" ? "就業取向" : selectedTemplate.orientation === "entrepreneurship" ? "新創取向" : "通用"}
範本內容:
${selectedTemplate.content}

Essay Questions:
${admissionReq.questions.map((q: any, i: number) => `
問題 ${i + 1}: ${q.question}
字數限制: ${q.wordLimit} words`).join('\n')}

目標項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 項目取向: ${research.programOrientation}
- 技術方向: ${research.technicalFocus}
- 課程: ${research.courses}
- 必修課程: ${research.requiredCourses}
- 選修課程: ${research.electiveCourses}
- Track選項: ${research.trackOptions}
- 教職員: ${research.facultyMembers}
- 項目特色: ${research.uniqueCharacteristics}
- 研究領域: ${research.researchAreas}
- 畢業規劃: ${research.graduationRequirements}
- 就業資源: ${research.careerResources}

重要指示:
1. **為每個問題單獨生成回答**
2. **嚴格遵守每個問題的字數限制**
3. **從範本中提取相關內容並重新組織以回答每個問題**
4. **保持範本的語句、用詞、語氣和整體敘事風格**
5. 根據項目技術方向(${research.technicalFocus})替換技術關鍵字
6. 調整經歷描述以匹配項目特色
${input.userInstructions ? `

**重要: 以下是用戶與AI助手的討論歷史,包含了對之前生成版本的反饋和修改建議:**
${input.userInstructions}

請仔細閱讀討論內容,理解用戶的具體要求和期望,並在生成新版本時充分考慮這些反饋。特別注意:
- 用戶提出的具體修改點
- AI助手給出的建議
- 用戶強調的重點方向
請在changes中明確說明如何根據討論反饋進行了調整。` : ''}

輸出格式: JSON
{
  "answers": [
    {
      "question": "問題文字",
      "answer": "回答內容",
      "wordCount": 實際字數
    }
  ],
  "changes": [
    {
      "type": "更動類型",
      "original": "原始內容",
      "modified": "修改後內容",
      "reason": "修改原因"
    }
  ]
}

請為每個問題生成回答並詳細記錄所有更動。` 
            : `任務: 客製化 Statement of Purpose

字數限制: ${wordLimit} words (±100)

選定範本: ${selectedTemplate.orientation === "job_hunting" ? "找工取向" : selectedTemplate.orientation === "employment" ? "就業取向" : selectedTemplate.orientation === "entrepreneurship" ? "新創取向" : "通用"}
範本內容:
${selectedTemplate.content}

${selection.should_blend ? `融合元素: ${selection.blend_elements.join(", ")}` : ''}

目標項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 項目取向: ${research.programOrientation}
- 技術方向: ${research.technicalFocus}
- 課程: ${research.courses}
- 必修課程: ${research.requiredCourses}
- 選修課程: ${research.electiveCourses}
- Track選項: ${research.trackOptions}
- 教職員: ${research.facultyMembers}
- 項目特色: ${research.uniqueCharacteristics}
- 研究領域: ${research.researchAreas}
- 畢業規劃: ${research.graduationRequirements}
- 就業資源: ${research.careerResources}

重要指示:
1. **嚴格保持範本的語句、用詞、語氣和整體敘事風格**
2. **保持範本的故事架構、段落結構和邏輯流程**
3. **不要改寫範本中的個人經歷、成就和背景描述**
4. 只針對以下內容進行精準替換:
   - **技術關鍵字** → 根據項目技術方向(${research.technicalFocus})替換範本中的技術關鍵字
     * 例如: 範本focus在Data,目標項目focus在AI,則將"data analysis"改為"AI model development"
     * 例如: 範本focus在ML,目標項目focus在NLP,則將"machine learning"改為"natural language processing"
     * 仔細分析項目的技術方向(NLP/ML/AI/System/Network/Data/HCI),將範本中的技術術語替換為目標方向的術語
   - **經歷描述** → 根據項目技術方向調整經歷中的技術描述和關鍵字
     * 突出與目標技術方向相關的技能和經驗
     * 調整技術細節的描述方式以匹配目標方向
   - 教授名字 → 替換為目標項目的相關教授(根據研究方向匹配)
   - 課程名稱 → 替換為目標項目的對應課程(從必修和選修課程列表中選擇)
   - 研究關鍵字 → 調整為目標項目的研究領域關鍵字
   - Women in STEM社群 → 替換為目標項目的具體社群名稱
   - 畢業規劃 → 調整為符合目標項目的要求(特別是non-thesis/coursework track)
   - 就業資源/創業支持 → 根據項目取向提及相應資源
   - 項目特色 → 自然融入目標項目的獨特優勢
5. ${selection.should_blend ? '適當融合其他取向的元素,但保持主範本的核心風格' : ''}
6. 確保修改後的內容流暢自然,符合項目取向和技術方向
${input.userInstructions ? `

**重要: 以下是用戶與AI助手的討論歷史,包含了對之前生成版本的反饋和修改建議:**
${input.userInstructions}

請仔細閱讀討論內容,理解用戶的具體要求和期望,並在生成新版本時充分考慮這些反饋。特別注意:
- 用戶提出的具體修改點
- AI助手給出的建議
- 用戶強調的重點方向
請在changes中明確說明如何根據討論反饋進行了調整。` : ''}

輸出格式: JSON
{
  "content": "客製化後的完整SoP文字(${wordLimit} words ±100)",
  "changes": [
    {
      "type": "更動類型(技術關鍵字/經歷描述/教授名字/課程名稱/等)",
      "original": "原始內容",
      "modified": "修改後內容",
      "reason": "修改原因(例如: UMD是AI top 2學校,強調AI方向)"
    }
  ]
}

請生成客製化的SoP並詳細記錄所有更動。`;

          const generateResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an expert in graduate school applications. Customize documents while preserving the original writing style."
              },
              {
                role: "user",
                content: generatePrompt
              }
            ],
          }, getUserLLMConfig(ctx.user));

          const responseContent = generateResponse.choices[0].message.content;
          if (typeof responseContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          
          // Clean markdown code blocks from LLM response
          const cleanedContent = responseContent
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          
          const responseData = JSON.parse(cleanedContent);
          
          // Handle different response formats
          let generatedContent: string;
          if (isMultiQuestion && responseData.answers) {
            // Multi-question format: combine all answers
            generatedContent = responseData.answers.map((a: any, i: number) => 
              `Question ${i + 1}: ${a.question}\n\n${a.answer}\n\n(Word count: ${a.wordCount})`
            ).join('\n\n---\n\n');
          } else {
            // Standard SoP format
            generatedContent = responseData.content;
          }
          
          const changesLog = JSON.stringify(responseData.changes, null, 2);
          
          // Save generated document
          const randomSuffix = Math.random().toString(36).substring(7);
          const fileKey = `${ctx.user.id}/programs/${input.programId}/generated_sop-${randomSuffix}.txt`;
          const buffer = Buffer.from(generatedContent, "utf-8");
          const { url } = await storagePut(fileKey, buffer, "text/plain");
          
          const documentId = await db.createDocument({
            programId: input.programId,
            documentType: "generated_sop",
            fileUrl: url,
            fileKey,
            fileName: `sop_${program.universityName}_${program.programName}.txt`,
            content: generatedContent,
            templateId: selectedTemplate.id,
            selectionReasoning,
            changesLog,
            userInstructions: input.userInstructions || null,
          });
          
          await db.updateProgramStatus(input.programId, "draft");
          
          return { 
            documentId, 
            content: generatedContent, 
            fileUrl: url, 
            templateUsed: selectedTemplate.name, 
            reasoning: selectionReasoning,
            changes: responseData.changes,
            originalTemplate: selectedTemplate.content,
          };
          
        } else {
          // For CV and LoR, or single SoP template, use the first/only template
          selectedTemplate = templates[0];
          
          const formatMap = {
            cv: "LaTeX",
            sop: "純文字",
            lor: "純文字",
          };
          
          const generatePrompt = `任務: 客製化 ${input.documentType.toUpperCase()}

範本內容:
${selectedTemplate.content}

目標項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 項目取向: ${research.programOrientation}
- 技術方向: ${research.technicalFocus}
- 課程: ${research.courses}
- 必修課程: ${research.requiredCourses}
- 選修課程: ${research.electiveCourses}
- Track選項: ${research.trackOptions}
- 教職員: ${research.facultyMembers}
- 項目特色: ${research.uniqueCharacteristics}
- 研究領域: ${research.researchAreas}
- 畢業規劃: ${research.graduationRequirements}
- 就業資源: ${research.careerResources}

重要指示:
1. **嚴格保持範本的語句、用詞、語氣和整體風格**
2. **保持範本的故事架構和段落結構**
3. **不要改寫範本中的個人經歷和成就**
4. 只針對以下內容進行精準替換:
   - **技術關鍵字** → 根據項目技術方向(${research.technicalFocus})替換範本中的技術關鍵字
     * 仔細分析項目的技術方向(NLP/ML/AI/System/Network/Data/HCI),將範本中的技術術語替換為目標方向的術語
   - **經歷描述** → 根據項目技術方向調整經歷中的技術描述和關鍵字
     * 突出與目標技術方向相關的技能和經驗
   - 教授名字、課程名稱、研究關鍵字
   - Women in STEM社群名稱
   - 畢業規劃和就業資源
   - 項目特色
5. 確保修改後的內容流暢自然
${input.userInstructions ? `

**重要: 以下是用戶與AI助手的討論歷史,包含了對之前生成版本的反饋和修改建議:**
${input.userInstructions}

請仔細閱讀討論內容,理解用戶的具體要求和期望,並在生成新版本時充分考慮這些反饋。特別注意:
- 用戶提出的具體修改點
- AI助手給出的建議
- 用戶強調的重點方向
請在changes中明確說明如何根據討論反饋進行了調整。` : ''}

輸出格式: JSON
{
  "content": "客製化後的完整${input.documentType.toUpperCase()}文字(${formatMap[input.documentType]}格式)",
  "changes": [
    {
      "type": "更動類型(技術關鍵字/經歷描述/教授名字/課程名稱/等)",
      "original": "原始內容",
      "modified": "修改後內容",
      "reason": "修改原因"
    }
  ]
}

${input.documentType === 'cv' ? '注意: content欄位應使用標準LaTeX格式,包含必要的文檔聲明,確保可以直接編譯。' : '注意: content欄位應使用純文字格式,保持適當段落分隔。'}

請生成客製化的${input.documentType.toUpperCase()}並詳細記錄所有更動。`;

          const generateResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an expert in graduate school applications. Customize documents while preserving the original writing style."
              },
              {
                role: "user",
                content: generatePrompt
              }
            ],
          }, getUserLLMConfig(ctx.user));

          const responseContent = generateResponse.choices[0].message.content;
          if (typeof responseContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          
          // Clean markdown code blocks from LLM response
          const cleanedContent = responseContent
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          
          const responseData = JSON.parse(cleanedContent);
          const generatedContent = responseData.content;
          const changesLog = JSON.stringify(responseData.changes, null, 2);
          
          // Save generated document
          const randomSuffix = Math.random().toString(36).substring(7);
          const fileExtension = input.documentType === 'cv' ? 'tex' : 'txt';
          const fileKey = `${ctx.user.id}/programs/${input.programId}/generated_${input.documentType}-${randomSuffix}.${fileExtension}`;
          const buffer = Buffer.from(generatedContent, "utf-8");
          const mimeType = input.documentType === 'cv' ? 'application/x-tex' : 'text/plain';
          const { url } = await storagePut(fileKey, buffer, mimeType);
          
          const documentId = await db.createDocument({
            programId: input.programId,
            documentType: `generated_${input.documentType}`,
            fileUrl: url,
            fileKey,
            fileName: `${input.documentType}_${program.universityName}_${program.programName}.${fileExtension}`,
            content: generatedContent,
            templateId: selectedTemplate.id,
            selectionReasoning: "Only one template available",
            changesLog,
            userInstructions: input.userInstructions || null,
          });
          
          await db.updateProgramStatus(input.programId, "draft");
          
          return { 
            documentId, 
            content: generatedContent, 
            fileUrl: url, 
            templateUsed: selectedTemplate.name,
            changes: responseData.changes,
            originalTemplate: selectedTemplate.content,
          };
        }
      }),
    
    getDocuments: protectedProcedure
      .input(z.object({ programId: z.number() }))
      .query(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return await db.getProgramDocuments(input.programId);
      }),
    
    getDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const program = await db.getProgramById(document.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return document;
      }),
    
    getDiscussions: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const program = await db.getProgramById(document.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return await db.getDocumentDiscussions(input.documentId);
      }),
    
    discuss: protectedProcedure
      .input(z.object({ 
        documentId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const program = await db.getProgramById(document.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Save user message
        await db.createDiscussionMessage({
          documentId: input.documentId,
          userId: ctx.user.id,
          role: "user",
          message: input.message,
        });
        
        // Get program research for context
        const research = await db.getProgramResearch(program.id);
        if (!research) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Program research not found" });
        }
        
        // Get template used
        let templateContent = "";
        if (document.templateId) {
          const template = await db.getTemplateById(document.templateId);
          if (template) {
            templateContent = template.content;
          }
        }
        
        // Call LLM for response
        const discussionPrompt = `你是一個碩士申請文件客製化專家。用戶正在討論他們的${document.documentType}文檔。

目標項目:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 技術方向: ${research.technicalFocus}

原始範本:
${templateContent.substring(0, 1000)}...

當前生成的文檔:
${document.content?.substring(0, 1000)}...

之前的更動記錄:
${document.changesLog || "無"}

用戶問題/意見:
${input.message}

請回應用戶的問題或意見,並提供具體的修改建議。如果用戶要求修改,請說明如何調整。`;
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert in graduate school applications. Help users refine their customized documents."
            },
            {
              role: "user",
              content: discussionPrompt
            }
          ],
        }, getUserLLMConfig(ctx.user));

        const assistantMessage = response.choices[0].message.content;
        if (typeof assistantMessage !== 'string') {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        
        // Save assistant message
        await db.createDiscussionMessage({
          documentId: input.documentId,
          userId: ctx.user.id,
          role: "assistant",
          message: assistantMessage,
        });
        
        return { message: assistantMessage };
      }),
  }),
});

export type AppRouter = typeof appRouter;

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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

請提供以下八個方面的詳細信息:

1. **課程設置** (Courses)
   - 核心課程列表
   - 選修課程方向
   - 課程結構和學分要求

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
                },
                required: ["courses", "facultyMembers", "requirements", "uniqueCharacteristics", "researchAreas", "graduationRequirements", "careerResources", "programOrientation"],
                additionalProperties: false,
              },
            },
          },
        });
        
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
          });
          
          const selectionContent = selectionResponse.choices[0].message.content;
          if (typeof selectionContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          const selection = JSON.parse(selectionContent);
          selectedTemplate = templates[selection.selected_index - 1];
          selectionReasoning = selection.reasoning;
          
          // Generate document with selected template
          const generatePrompt = `任務: 客製化 Statement of Purpose

選定範本: ${selectedTemplate.orientation === "job_hunting" ? "找工取向" : selectedTemplate.orientation === "employment" ? "就業取向" : selectedTemplate.orientation === "entrepreneurship" ? "新創取向" : "通用"}
範本內容:
${selectedTemplate.content}

${selection.should_blend ? `融合元素: ${selection.blend_elements.join(", ")}` : ''}

目標項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 項目取向: ${research.programOrientation}
- 課程: ${research.courses}
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
   - 教授名字 → 替換為目標項目的相關教授
   - 課程名稱 → 替換為目標項目的對應課程
   - 研究關鍵字 → 調整為目標項目的研究領域關鍵字
   - Women in STEM社群 → 替換為目標項目的具體社群名稱
   - 畢業規劃 → 調整為符合目標項目的要求
   - 就業資源/創業支持 → 根據項目取向提及相應資源
   - 項目特色 → 自然融入目標項目的獨特優勢
5. ${selection.should_blend ? '適當融合其他取向的元素,但保持主範本的核心風格' : ''}
6. 確保修改後的內容流暢自然,符合項目取向

輸出格式: 純文字

請生成客製化的SoP。`;

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
          });
          
          const generatedContent = generateResponse.choices[0].message.content;
          if (typeof generatedContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          
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
          });
          
          await db.updateProgramStatus(input.programId, "draft");
          
          return { documentId, content: generatedContent, fileUrl: url, templateUsed: selectedTemplate.name, reasoning: selectionReasoning };
          
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
- 課程: ${research.courses}
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
   - 教授名字、課程名稱、研究關鍵字
   - Women in STEM社群名稱
   - 畢業規劃和就業資源
   - 項目特色
5. 確保修改後的內容流暢自然

輸出格式: ${formatMap[input.documentType]}
${input.documentType === 'cv' ? '- 使用標準LaTeX格式\n- 包含必要的文檔聲明\n- 確保可以直接編譯' : '- 純文字格式\n- 保持適當段落分隔'}

請生成客製化的文檔。`;

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
          });
          
          const generatedContent = generateResponse.choices[0].message.content;
          if (typeof generatedContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          
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
          });
          
          await db.updateProgramStatus(input.programId, "draft");
          
          return { documentId, content: generatedContent, fileUrl: url, templateUsed: selectedTemplate.name };
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
  }),
});

export type AppRouter = typeof appRouter;

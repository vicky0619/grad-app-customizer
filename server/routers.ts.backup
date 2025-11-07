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
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
    
    uploadDocument: protectedProcedure
      .input(z.object({
        programId: z.number(),
        documentType: z.enum(["original_cv", "original_sop", "original_lor"]),
        textContent: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Upload to S3
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${ctx.user.id}/programs/${input.programId}/${input.documentType}-${randomSuffix}.txt`;
        const buffer = Buffer.from(input.textContent, "utf-8");
        const { url } = await storagePut(fileKey, buffer, "text/plain");
        
        // Save to database
        const documentId = await db.createDocument({
          programId: input.programId,
          documentType: input.documentType,
          fileUrl: url,
          fileKey,
          fileName: `${input.documentType}.txt`,
          content: input.textContent,
        });
        
        return { documentId, fileUrl: url };
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

請提供以下七個方面的詳細信息:

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
                  courses: { type: "string", description: "Detailed course information including core courses, electives, and credit structure" },
                  facultyMembers: { type: "string", description: "Faculty information including names, research areas, and labs" },
                  requirements: { type: "string", description: "Admission requirements including academic, language, prerequisites, and test scores" },
                  uniqueCharacteristics: { type: "string", description: "Unique program features including Women in STEM communities and special programs" },
                  researchAreas: { type: "string", description: "Research areas including main directions, interdisciplinary fields, and emerging topics" },
                  graduationRequirements: { type: "string", description: "Graduation requirements including credits, thesis/project, timeline, and milestones" },
                  careerResources: { type: "string", description: "Career resources including career center, company partnerships, internships, alumni network, and placement rates" },
                },
                required: ["courses", "facultyMembers", "requirements", "uniqueCharacteristics", "researchAreas", "graduationRequirements", "careerResources"],
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
        
        // Get original document
        const originalDoc = await db.getDocumentByType(input.programId, `original_${input.documentType}`);
        if (!originalDoc || !originalDoc.content) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Original ${input.documentType.toUpperCase()} not found or empty` });
        }
        
        // Get program research
        let research = await db.getProgramResearch(input.programId);
        
        // Check if research is complete, if not, do additional search
        if (!research || !research.graduationRequirements || !research.careerResources) {
          console.log("[Generate] Research incomplete, performing additional search...");
          
          const supplementPrompt = `請補充搜索以下碩士項目的詳細信息:

大學: ${program.universityName}
項目: ${program.programName}

請特別關注並提供:
1. 畢業要求和規劃 (學分、論文、時間規劃)
2. 就業資源 (career center、企業合作、實習、校友網絡、就業率)
3. 其他所有相關信息

請提供完整詳細的信息。`;

          const suppResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a research assistant. Provide detailed program information."
              },
              {
                role: "user",
                content: supplementPrompt
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "program_research_supplement",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    courses: { type: "string" },
                    facultyMembers: { type: "string" },
                    requirements: { type: "string" },
                    uniqueCharacteristics: { type: "string" },
                    researchAreas: { type: "string" },
                    graduationRequirements: { type: "string" },
                    careerResources: { type: "string" },
                  },
                  required: ["courses", "facultyMembers", "requirements", "uniqueCharacteristics", "researchAreas", "graduationRequirements", "careerResources"],
                  additionalProperties: false,
                },
              },
            },
          });
          
          const suppContent = suppResponse.choices[0].message.content;
          if (typeof suppContent !== 'string') {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid supplement response" });
          }
          const suppData = JSON.parse(suppContent);
          
          // Update research with supplemented data
          await db.updateProgramResearch(input.programId, suppData);
          research = await db.getProgramResearch(input.programId);
        }
        
        if (!research) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Program research not found. Please research the program first." });
        }
        
        // Generate customized document
        const documentTypeMap = {
          cv: "CV (Curriculum Vitae)",
          sop: "Statement of Purpose",
          lor: "Letter of Recommendation",
        };
        
        const formatMap = {
          cv: "LaTeX",
          sop: "純文字 (Plain Text)",
          lor: "純文字 (Plain Text)",
        };
        
        const generatePrompt = `任務: 客製化 ${documentTypeMap[input.documentType]} 以適配目標碩士項目

原始文檔:
${originalDoc.content}

目標項目信息:
- 大學: ${program.universityName}
- 項目: ${program.programName}
- 課程: ${research.courses}
- 教職員: ${research.facultyMembers}
- 入學要求: ${research.requirements}
- 項目特色: ${research.uniqueCharacteristics}
- 研究領域: ${research.researchAreas}
- 畢業要求: ${research.graduationRequirements}
- 就業資源: ${research.careerResources}

重要指示:
1. **保持原文的語句、用詞、語氣和整體風格**
2. **保持整體故事架構、段落結構和敘事邏輯**
3. **不要改寫用戶的個人經歷、成就和背景描述**
4. 只針對以下內容進行精準替換或微調:
   - 教授名字 → 替換為目標項目的相關教授
   - 課程名稱 → 替換為目標項目的對應課程
   - 研究關鍵字 → 調整為目標項目的研究領域關鍵字
   - Women in STEM社群 → 替換為目標項目的具體社群名稱
   - 畢業規劃 → 調整為符合目標項目的要求
   - 就業資源 → 提及目標項目的career支持
5. 只在必要且自然的地方插入項目特定的細節
6. 確保修改後的內容流暢自然,不顯突兀

輸出格式: ${formatMap[input.documentType]}
${input.documentType === 'cv' ? '- 使用標準的LaTeX格式\n- 包含必要的文檔類聲明和包引入\n- 確保可以直接編譯' : '- 使用純文字格式\n- 保持適當的段落分隔'}

請生成客製化的文檔。`;
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert in graduate school applications. Your task is to customize application documents while preserving the original writing style and narrative structure."
            },
            {
              role: "user",
              content: generatePrompt
            }
          ],
        });
        
        const messageContent = response.choices[0].message.content;
        if (typeof messageContent !== 'string') {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid LLM response" });
        }
        const generatedContent = messageContent;
        
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
        });
        
        // Check if all documents are generated
        const docs = await db.getProgramDocuments(input.programId);
        const hasAllGenerated = ["generated_cv", "generated_sop", "generated_lor"].every(
          type => docs.some(d => d.documentType === type)
        );
        
        if (hasAllGenerated) {
          await db.updateProgramStatus(input.programId, "completed");
        } else {
          await db.updateProgramStatus(input.programId, "draft");
        }
        
        return { documentId, content: generatedContent, fileUrl: url };
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

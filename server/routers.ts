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
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
        textContent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const program = await db.getProgramById(input.programId);
        if (!program || program.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Upload to S3
        const buffer = Buffer.from(input.fileContent, "base64");
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${ctx.user.id}/programs/${input.programId}/${input.documentType}-${randomSuffix}`;
        const { url } = await storagePut(fileKey, buffer, "application/octet-stream");
        
        // Save to database
        const documentId = await db.createDocument({
          programId: input.programId,
          documentType: input.documentType,
          fileUrl: url,
          fileKey,
          fileName: input.fileName,
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
        
        const promptText = `Research the following master's program and provide detailed information:

University: ${program.universityName}
Program: ${program.programName}
${program.country ? `Country: ${program.country}` : ''}

Please provide:
1. Core courses and curriculum structure
2. Notable faculty members and their research areas
3. Admission requirements and prerequisites
4. Unique characteristics and strengths of this program
5. Key research areas and specializations

Format your response as JSON with keys: courses, facultyMembers, requirements, uniqueCharacteristics, researchAreas`;
        
        // Use LLM to search for program information
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a research assistant specializing in graduate programs. Provide detailed, accurate information about master's programs."
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
                  courses: { type: "string" },
                  facultyMembers: { type: "string" },
                  requirements: { type: "string" },
                  uniqueCharacteristics: { type: "string" },
                  researchAreas: { type: "string" },
                },
                required: ["courses", "facultyMembers", "requirements", "uniqueCharacteristics", "researchAreas"],
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
        return await db.getProgramResearch(input.programId);
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
        if (!originalDoc) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Original ${input.documentType.toUpperCase()} not found` });
        }
        
        // Get program research
        const research = await db.getProgramResearch(input.programId);
        if (!research) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Program research not found. Please research the program first." });
        }
        
        // Generate customized document
        const documentTypeMap = {
          cv: "CV (Curriculum Vitae)",
          sop: "Statement of Purpose",
          lor: "Letter of Recommendation",
        };
        
        const generatePrompt = `Please customize the following ${documentTypeMap[input.documentType]} for this specific master's program:

Program: ${program.programName} at ${program.universityName}

Program Information:
- Courses: ${research.courses}
- Faculty: ${research.facultyMembers}
- Requirements: ${research.requirements}
- Unique Characteristics: ${research.uniqueCharacteristics}
- Research Areas: ${research.researchAreas}

Original ${documentTypeMap[input.documentType]}:
${originalDoc.content || "(File uploaded, content not extracted)"}

Please:
1. Highlight relevant experiences that align with the program's focus areas
2. Emphasize skills and interests that match faculty research areas
3. Address the program's unique characteristics
4. Ensure the document meets the stated requirements
5. Maintain professional tone and formatting

Provide the customized document in markdown format.`;
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert in graduate school applications. Your task is to customize application documents to align with specific program characteristics and requirements."
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
        const fileKey = `${ctx.user.id}/programs/${input.programId}/generated_${input.documentType}-${randomSuffix}.md`;
        const buffer = Buffer.from(generatedContent, "utf-8");
        const { url } = await storagePut(fileKey, buffer, "text/markdown");
        
        const documentId = await db.createDocument({
          programId: input.programId,
          documentType: `generated_${input.documentType}`,
          fileUrl: url,
          fileKey,
          fileName: `${input.documentType}_${program.universityName}_${program.programName}.md`,
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

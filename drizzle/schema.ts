import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Named PostgreSQL enum types (created as DATABASE TYPES, not inline)
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const programStatusEnum = pgEnum("program_status", [
  "draft",
  "researching",
  "generating",
  "completed",
]);
export const programOrientationEnum = pgEnum("program_orientation", [
  "job_hunting",
  "employment",
  "entrepreneurship",
  "mixed",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "original_cv",
  "original_sop",
  "original_lor",
  "generated_cv",
  "generated_sop",
  "generated_lor",
]);
export const templateDocumentTypeEnum = pgEnum("template_document_type", [
  "cv",
  "sop",
  "lor",
]);
export const templateOrientationEnum = pgEnum("template_orientation", [
  "general",
  "job_hunting",
  "employment",
  "entrepreneurship",
]);
export const discussionRoleEnum = pgEnum("discussion_role", [
  "user",
  "assistant",
]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Unique identifier for the user (nanoid generated on registration). */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"),
  llmApiKey: text("llmApiKey"), // encrypted, see server/_core/crypto.ts
  llmBaseUrl: varchar("llmBaseUrl", { length: 500 }),
  llmModel: varchar("llmModel", { length: 100 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Programs table - stores target master's program information
 */
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  status: programStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

/**
 * Program research table - stores LLM-searched program information
 */
export const programResearch = pgTable("program_research", {
  id: serial("id").primaryKey(),
  programId: integer("programId").notNull(),
  courses: text("courses"),
  facultyMembers: text("facultyMembers"),
  requirements: text("requirements"),
  uniqueCharacteristics: text("uniqueCharacteristics"),
  researchAreas: text("researchAreas"),
  graduationRequirements: text("graduationRequirements"),
  careerResources: text("careerResources"),
  programOrientation: programOrientationEnum("programOrientation"),
  technicalFocus: text("technicalFocus"),
  requiredCourses: text("requiredCourses"),
  electiveCourses: text("electiveCourses"),
  trackOptions: text("trackOptions"),
  recommendedCourses: text("recommendedCourses"),
  admissionRequirements: text("admissionRequirements"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type ProgramResearch = typeof programResearch.$inferSelect;
export type InsertProgramResearch = typeof programResearch.$inferInsert;

/**
 * Documents table - stores original and generated application documents
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  programId: integer("programId").notNull(),
  documentType: documentTypeEnum("documentType").notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  content: text("content"),
  templateId: integer("templateId"),
  selectionReasoning: text("selectionReasoning"),
  changesLog: text("changesLog"),
  userInstructions: text("userInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Templates table - stores user's document templates
 */
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  documentType: templateDocumentTypeEnum("documentType").notNull(),
  orientation: templateOrientationEnum("orientation").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

export const documentDiscussions = pgTable("document_discussions", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId").notNull(),
  userId: integer("userId").notNull(),
  role: discussionRoleEnum("role").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentDiscussion = typeof documentDiscussions.$inferSelect;
export type InsertDocumentDiscussion = typeof documentDiscussions.$inferInsert;

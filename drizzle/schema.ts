import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Programs table - stores target master's program information
 */
export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  status: mysqlEnum("status", ["draft", "researching", "generating", "completed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

/**
 * Program research table - stores LLM-searched program information
 */
export const programResearch = mysqlTable("program_research", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  courses: text("courses"),
  facultyMembers: text("facultyMembers"),
  requirements: text("requirements"),
  uniqueCharacteristics: text("uniqueCharacteristics"),
  researchAreas: text("researchAreas"),
  graduationRequirements: text("graduationRequirements"),
  careerResources: text("careerResources"),
  programOrientation: mysqlEnum("programOrientation", [
    "job_hunting",
    "employment",
    "entrepreneurship",
    "mixed"
  ]),
  technicalFocus: text("technicalFocus"),
  requiredCourses: text("requiredCourses"),
  electiveCourses: text("electiveCourses"),
  trackOptions: text("trackOptions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProgramResearch = typeof programResearch.$inferSelect;
export type InsertProgramResearch = typeof programResearch.$inferInsert;

/**
 * Documents table - stores original and generated application documents
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  documentType: mysqlEnum("documentType", ["original_cv", "original_sop", "original_lor", "generated_cv", "generated_sop", "generated_lor"]).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  content: text("content"),
  templateId: int("templateId"),
  selectionReasoning: text("selectionReasoning"),
  changesLog: text("changesLog"),
  userInstructions: text("userInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Templates table - stores user's document templates
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["cv", "sop", "lor"]).notNull(),
  orientation: mysqlEnum("orientation", [
    "general",
    "job_hunting",
    "employment",
    "entrepreneurship"
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export const documentDiscussions = mysqlTable("document_discussions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentDiscussion = typeof documentDiscussions.$inferSelect;
export type InsertDocumentDiscussion = typeof documentDiscussions.$inferInsert;

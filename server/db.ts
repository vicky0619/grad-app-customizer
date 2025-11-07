import { and, eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, programs, documents, programResearch, templates, documentDiscussions, InsertProgram, InsertDocument, InsertProgramResearch, Template, InsertTemplate, InsertDocumentDiscussion } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Program queries
export async function createProgram(program: InsertProgram) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programs).values(program);
  return result[0].insertId;
}

export async function getUserPrograms(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(programs).where(eq(programs.userId, userId)).orderBy(desc(programs.updatedAt));
}

export async function getProgramById(programId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(programs).where(eq(programs.id, programId)).limit(1);
  return result[0];
}

export async function updateProgramStatus(programId: number, status: "draft" | "researching" | "generating" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programs).set({ status, updatedAt: new Date() }).where(eq(programs.id, programId));
}

// Document queries
export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(document);
  return result[0].insertId;
}

export async function getProgramDocuments(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.programId, programId)).orderBy(desc(documents.createdAt));
}

export async function getDocumentByType(programId: number, documentType: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(
    and(eq(documents.programId, programId), sql`${documents.documentType} = ${documentType}`)
  ).limit(1);
  return result[0];
}

// Program research queries
export async function createProgramResearch(research: InsertProgramResearch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programResearch).values(research);
  return result[0].insertId;
}

export async function getProgramResearch(programId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(programResearch).where(eq(programResearch.programId, programId)).limit(1);
  return result[0];
}

export async function updateProgramResearch(programId: number, data: Partial<InsertProgramResearch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programResearch).set({ ...data, updatedAt: new Date() }).where(eq(programResearch.programId, programId));
}

// Template management functions
export async function createTemplate(template: InsertTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(templates).values(template);
  return Number(result[0].insertId);
}

export async function getUserTemplates(userId: number): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(templates).where(eq(templates.userId, userId));
}

export async function getTemplateById(id: number): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTemplatesByType(
  userId: number,
  documentType: "cv" | "sop" | "lor"
): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(templates).where(
    and(
      eq(templates.userId, userId),
      eq(templates.documentType, documentType)
    )
  );
}

export async function updateTemplate(
  id: number,
  updates: { name?: string; content?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(templates).set(updates).where(eq(templates.id, id));
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(templates).where(eq(templates.id, id));
}

// Document Discussion functions
export async function createDiscussionMessage(discussion: InsertDocumentDiscussion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documentDiscussions).values(discussion);
  return result[0].insertId;
}

export async function getDocumentDiscussions(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(documentDiscussions)
    .where(eq(documentDiscussions.documentId, documentId))
    .orderBy(documentDiscussions.createdAt);
}

export async function getDocumentById(documentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

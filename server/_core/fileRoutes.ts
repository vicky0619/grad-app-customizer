import type { Express, Request, Response } from "express";
import * as db from "../db";
import { isInlineStorageKey } from "../storage";
import { sdk } from "./sdk";

function inferContentType(fileName: string | null | undefined): string {
  const normalized = fileName?.toLowerCase() ?? "";

  if (normalized.endsWith(".tex")) {
    return "application/x-tex; charset=utf-8";
  }

  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }

  return "text/plain; charset=utf-8";
}

function sanitizeFileName(fileName: string | null | undefined): string {
  return (fileName ?? "document.txt").replace(/["\r\n]/g, "_");
}

async function handleInlineFileRequest(req: Request, res: Response) {
  const encodedKey = req.params[0];
  if (!encodedKey) {
    res.status(404).send("File not found");
    return;
  }

  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).send("Unauthorized");
    return;
  }

  const fileKey = decodeURIComponent(encodedKey);
  if (!isInlineStorageKey(fileKey)) {
    res.status(404).send("File not found");
    return;
  }

  const document = await db.getDocumentByFileKey(fileKey);
  if (!document || !document.content) {
    res.status(404).send("File not found");
    return;
  }

  const program = await db.getProgramById(document.programId);
  if (!program || program.userId !== user.id) {
    res.status(403).send("Forbidden");
    return;
  }

  res.setHeader("Content-Type", inferContentType(document.fileName));
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizeFileName(document.fileName)}"`
  );
  res.send(document.content);
}

export function registerFileRoutes(app: Express) {
  app.get("/api/files/*", (req, res) => {
    void handleInlineFileRequest(req, res);
  });
}

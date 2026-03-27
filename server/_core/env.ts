export const ENV = {
  appId: process.env.APP_ID ?? "grad-app",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Server-wide LLM fallback (used if user hasn't set their own key)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
  // Encryption key for user API keys stored in DB (64 hex chars = 32 bytes)
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  // AWS S3 for file storage
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
};

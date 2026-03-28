CREATE TYPE "public"."discussion_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('original_cv', 'original_sop', 'original_lor', 'generated_cv', 'generated_sop', 'generated_lor');--> statement-breakpoint
CREATE TYPE "public"."program_orientation" AS ENUM('job_hunting', 'employment', 'entrepreneurship', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'researching', 'generating', 'completed');--> statement-breakpoint
CREATE TYPE "public"."template_document_type" AS ENUM('cv', 'sop', 'lor');--> statement-breakpoint
CREATE TYPE "public"."template_orientation" AS ENUM('general', 'job_hunting', 'employment', 'entrepreneurship');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "document_discussions" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "discussion_role" NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"programId" integer NOT NULL,
	"documentType" "document_type" NOT NULL,
	"fileUrl" varchar(500) NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"fileName" varchar(255),
	"content" text,
	"templateId" integer,
	"selectionReasoning" text,
	"changesLog" text,
	"userInstructions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_research" (
	"id" serial PRIMARY KEY NOT NULL,
	"programId" integer NOT NULL,
	"courses" text,
	"facultyMembers" text,
	"requirements" text,
	"uniqueCharacteristics" text,
	"researchAreas" text,
	"graduationRequirements" text,
	"careerResources" text,
	"programOrientation" "program_orientation",
	"technicalFocus" text,
	"requiredCourses" text,
	"electiveCourses" text,
	"trackOptions" text,
	"recommendedCourses" text,
	"admissionRequirements" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"universityName" varchar(255) NOT NULL,
	"programName" varchar(255) NOT NULL,
	"country" varchar(100),
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"documentType" "template_document_type" NOT NULL,
	"orientation" "template_orientation" NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"passwordHash" text,
	"llmApiKey" text,
	"llmBaseUrl" varchar(500),
	"llmModel" varchar(100),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

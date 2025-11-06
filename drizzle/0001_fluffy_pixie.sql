CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`documentType` enum('original_cv','original_sop','original_lor','generated_cv','generated_sop','generated_lor') NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255),
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `program_research` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`courses` text,
	`facultyMembers` text,
	`requirements` text,
	`uniqueCharacteristics` text,
	`researchAreas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `program_research_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`universityName` varchar(255) NOT NULL,
	`programName` varchar(255) NOT NULL,
	`country` varchar(100),
	`status` enum('draft','researching','generating','completed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);

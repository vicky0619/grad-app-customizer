CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentType` enum('cv','sop','lor') NOT NULL,
	`orientation` enum('general','job_hunting','employment','entrepreneurship') NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `program_research` ADD `programOrientation` enum('job_hunting','employment','entrepreneurship','mixed');
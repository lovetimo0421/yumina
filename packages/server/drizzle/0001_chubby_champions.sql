ALTER TABLE "worlds" ADD COLUMN "download_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "worlds" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
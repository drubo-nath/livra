ALTER TYPE "public"."payment_method" ADD VALUE 'sslcommerz' BEFORE 'bkash';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer DEFAULT 15 NOT NULL;
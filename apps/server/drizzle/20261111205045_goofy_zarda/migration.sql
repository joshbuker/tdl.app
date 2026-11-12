CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed" (
	"id" bigserial PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"op_seq" bigint,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY,
	"prerequisite_id" uuid NOT NULL,
	"postrequisite_id" uuid NOT NULL,
	CONSTRAINT "links_prerequisite_id_postrequisite_id_unique" UNIQUE("prerequisite_id","postrequisite_id")
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"editors_can_share" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"seq" bigserial PRIMARY KEY,
	"id" uuid NOT NULL UNIQUE,
	"hlc" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"meta" jsonb,
	"content" jsonb,
	"author_id" uuid NOT NULL,
	"session_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revoked_sessions" (
	"token_hash" text PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY,
	"list_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text UNIQUE,
	"display_username" text,
	"given_name" text,
	"family_name" text,
	"terms_accepted_at" timestamp with time zone,
	"default_list_id" uuid
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "feed_user_id_id_index" ON "feed" ("user_id","id");--> statement-breakpoint
CREATE INDEX "grants_user_id_index" ON "grants" ("user_id");--> statement-breakpoint
CREATE INDEX "grants_target_kind_target_id_index" ON "grants" ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX "invitations_invitee_id_index" ON "invitations" ("invitee_id");--> statement-breakpoint
CREATE INDEX "links_postrequisite_id_index" ON "links" ("postrequisite_id");--> statement-breakpoint
CREATE INDEX "operations_record_type_record_id_index" ON "operations" ("record_type","record_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_list_id_index" ON "tasks" ("list_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feed" ADD CONSTRAINT "feed_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "grants" ADD CONSTRAINT "grants_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitee_id_user_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_prerequisite_id_tasks_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "tasks"("id");--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_postrequisite_id_tasks_id_fkey" FOREIGN KEY ("postrequisite_id") REFERENCES "tasks"("id");--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "revoked_sessions" ADD CONSTRAINT "revoked_sessions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id");
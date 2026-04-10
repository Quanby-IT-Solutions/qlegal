CREATE TABLE "contract_agent_message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"sessionId" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "contract_agent_message" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "contract_agent_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"accessToken" varchar(255) NOT NULL,
	"userId" varchar(255),
	"sourceFileName" varchar(255),
	"sourceMimeType" varchar(255),
	"contractTitle" varchar(255),
	"contractText" text,
	"analysis" jsonb,
	"generatedContract" text,
	"generatedContractType" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastInteractionAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "contract_agent_session" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "meeting_message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"meetingId" varchar(255) NOT NULL,
	"senderId" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "meeting_message" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "principal_vault_file" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"folderId" varchar(255),
	"name" varchar(255) NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"storagePath" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "principal_vault_file" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "principal_vault_folder_share" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(128) NOT NULL,
	"folderId" varchar(255) NOT NULL,
	"principalUserId" varchar(255) NOT NULL,
	"recipientEmail" varchar(255) NOT NULL,
	"recipientEnpUserId" varchar(255),
	"note" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principal_vault_folder_share_token_unique" UNIQUE("token")
);

ALTER TABLE "principal_vault_folder_share" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "principal_vault_folder" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"parentId" varchar(255),
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "principal_vault_folder" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "principal_vault_share_file_comment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"shareId" varchar(255) NOT NULL,
	"fileId" varchar(255) NOT NULL,
	"authorId" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "principal_vault_share_file_comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ALTER COLUMN "commissionStatus" SET DEFAULT 'PENDING';
ALTER TABLE "user" ADD COLUMN "prefix" varchar(50);
ALTER TABLE "user" ADD COLUMN "suffix" varchar(50);
ALTER TABLE "user" ADD COLUMN "kycLastExpiredAt" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN "onboardingDetailsCompletedAt" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN "onboardingSnoozedUntil" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN "enpLmsCourseCompletedAt" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN "enpLmsAllModulesCompletedAt" timestamp with time zone;
ALTER TABLE "contract_agent_message" ADD CONSTRAINT "contract_agent_message_sessionId_contract_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."contract_agent_session"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contract_agent_session" ADD CONSTRAINT "contract_agent_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "meeting_message" ADD CONSTRAINT "meeting_message_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "meeting_message" ADD CONSTRAINT "meeting_message_senderId_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_file" ADD CONSTRAINT "principal_vault_file_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_file" ADD CONSTRAINT "principal_vault_file_folderId_principal_vault_folder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_folderId_principal_vault_folder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_principalUserId_user_id_fk" FOREIGN KEY ("principalUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_recipientEnpUserId_user_id_fk" FOREIGN KEY ("recipientEnpUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "principal_vault_folder" ADD CONSTRAINT "principal_vault_folder_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_folder" ADD CONSTRAINT "principal_vault_folder_parentId_principal_vault_folder_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_shareId_principal_vault_folder_share_id_fk" FOREIGN KEY ("shareId") REFERENCES "public"."principal_vault_folder_share"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_fileId_principal_vault_file_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."principal_vault_file"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "contract_agent_message_session_id_idx" ON "contract_agent_message" USING btree ("sessionId");
CREATE INDEX "contract_agent_message_created_at_idx" ON "contract_agent_message" USING btree ("createdAt");
CREATE INDEX "contract_agent_session_user_id_idx" ON "contract_agent_session" USING btree ("userId");
CREATE INDEX "contract_agent_session_updated_at_idx" ON "contract_agent_session" USING btree ("updatedAt");
CREATE INDEX "contract_agent_session_last_interaction_at_idx" ON "contract_agent_session" USING btree ("lastInteractionAt");
CREATE INDEX "meeting_message_meeting_id_idx" ON "meeting_message" USING btree ("meetingId");
CREATE INDEX "meeting_message_created_at_idx" ON "meeting_message" USING btree ("createdAt");
CREATE INDEX "principal_vault_file_user_folder_idx" ON "principal_vault_file" USING btree ("userId","folderId");
CREATE INDEX "principal_vault_file_user_id_idx" ON "principal_vault_file" USING btree ("userId");
CREATE INDEX "principal_vault_folder_share_token_idx" ON "principal_vault_folder_share" USING btree ("token");
CREATE INDEX "principal_vault_folder_share_folder_idx" ON "principal_vault_folder_share" USING btree ("folderId");
CREATE INDEX "principal_vault_folder_user_parent_idx" ON "principal_vault_folder" USING btree ("userId","parentId");
CREATE INDEX "principal_vault_folder_user_id_idx" ON "principal_vault_folder" USING btree ("userId");
CREATE INDEX "principal_vault_share_file_comment_share_file_idx" ON "principal_vault_share_file_comment" USING btree ("shareId","fileId");
CREATE INDEX "principal_vault_share_file_comment_file_idx" ON "principal_vault_share_file_comment" USING btree ("fileId");
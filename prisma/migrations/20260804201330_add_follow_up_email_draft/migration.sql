-- CreateTable
CREATE TABLE "FollowUpEmailDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchEventId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "FollowUpEmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpEmailDraft_searchEventId_key" ON "FollowUpEmailDraft"("searchEventId");

-- CreateIndex
CREATE INDEX "FollowUpEmailDraft_userId_idx" ON "FollowUpEmailDraft"("userId");

-- CreateIndex
CREATE INDEX "FollowUpEmailDraft_status_idx" ON "FollowUpEmailDraft"("status");

-- AddForeignKey
ALTER TABLE "FollowUpEmailDraft" ADD CONSTRAINT "FollowUpEmailDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEmailDraft" ADD CONSTRAINT "FollowUpEmailDraft_searchEventId_fkey" FOREIGN KEY ("searchEventId") REFERENCES "SearchEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ManagedLeaseAudit" ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "ManagedLeaseResource" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "resourceId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseAsset" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseJoinRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedLeaseJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseOrder" (
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestKey" VARCHAR(80) NOT NULL,
    "requestDigest" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "ManagedLeasePostRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestKey" VARCHAR(80) NOT NULL,
    "requestDigest" VARCHAR(64) NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeasePostRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseCircleMute" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "moderatedBy" TEXT NOT NULL,

    CONSTRAINT "ManagedLeaseCircleMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseChatSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "circleId" TEXT,
    "nextSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "requestKey" VARCHAR(80) NOT NULL,
    "requestDigest" VARCHAR(64) NOT NULL,
    "userText" TEXT NOT NULL,
    "assistantText" TEXT,
    "state" VARCHAR(24) NOT NULL DEFAULT 'DISPATCHING',
    "failureCode" VARCHAR(64),
    "providerRequestId" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedLeaseChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedLeaseResource_customerId_applicationId_kind_id_idx" ON "ManagedLeaseResource"("customerId", "applicationId", "kind", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseResource_customerId_kind_resourceId_key" ON "ManagedLeaseResource"("customerId", "kind", "resourceId");

-- CreateIndex
CREATE INDEX "ManagedLeaseAsset_customerId_applicationId_id_idx" ON "ManagedLeaseAsset"("customerId", "applicationId", "id");

-- CreateIndex
CREATE INDEX "ManagedLeaseJoinRequest_customerId_circleId_status_id_idx" ON "ManagedLeaseJoinRequest"("customerId", "circleId", "status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseJoinRequest_customerId_circleId_userId_key" ON "ManagedLeaseJoinRequest"("customerId", "circleId", "userId");

-- CreateIndex
CREATE INDEX "ManagedLeaseOrder_customerId_applicationId_userId_orderId_idx" ON "ManagedLeaseOrder"("customerId", "applicationId", "userId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseOrder_customerId_applicationId_userId_requestKe_key" ON "ManagedLeaseOrder"("customerId", "applicationId", "userId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeasePostRequest_postId_key" ON "ManagedLeasePostRequest"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeasePostRequest_customerId_applicationId_userId_req_key" ON "ManagedLeasePostRequest"("customerId", "applicationId", "userId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseCircleMute_customerId_circleId_userId_key" ON "ManagedLeaseCircleMute"("customerId", "circleId", "userId");

-- CreateIndex
CREATE INDEX "ManagedLeaseChatSession_customerId_applicationId_userId_id_idx" ON "ManagedLeaseChatSession"("customerId", "applicationId", "userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseChatMessage_sessionId_requestKey_key" ON "ManagedLeaseChatMessage"("sessionId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseChatMessage_sessionId_sequence_key" ON "ManagedLeaseChatMessage"("sessionId", "sequence");

-- AddForeignKey
ALTER TABLE "ManagedLeaseOrder" ADD CONSTRAINT "ManagedLeaseOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLeasePostRequest" ADD CONSTRAINT "ManagedLeasePostRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLeaseChatMessage" ADD CONSTRAINT "ManagedLeaseChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ManagedLeaseChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex for recommend engine queries
CREATE INDEX "Like_targetType_createdAt_idx" ON "Like"("targetType", "createdAt");
CREATE INDEX "Collect_targetType_createdAt_idx" ON "Collect"("targetType", "createdAt");

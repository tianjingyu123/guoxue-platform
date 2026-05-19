-- 添加缺失的外键索引，优化 JOIN / 级联删除 / FK 查询性能

-- CourseWork: courseId FK (级联删除时扫描全表)
CREATE INDEX IF NOT EXISTS "CourseWork_courseId_idx" ON "CourseWork"("courseId");

-- CircleInvitation: inviteeId FK (通过被邀请人查询邀请记录)
CREATE INDEX IF NOT EXISTS "CircleInvitation_inviteeId_idx" ON "CircleInvitation"("inviteeId");

-- AiAnalysisRecord: paipanRecordId FK (排盘记录关联查询)
CREATE INDEX IF NOT EXISTS "AiAnalysisRecord_paipanRecordId_idx" ON "AiAnalysisRecord"("paipanRecordId");

-- ToolShare: userId FK (用户分享记录查询)
CREATE INDEX IF NOT EXISTS "ToolShare_userId_idx" ON "ToolShare"("userId");

-- ReadingProgress: chapterId FK (级联删除、章节进度查询)
CREATE INDEX IF NOT EXISTS "ReadingProgress_chapterId_idx" ON "ReadingProgress"("chapterId");

-- EbookProgress: chapterId FK
CREATE INDEX IF NOT EXISTS "EbookProgress_chapterId_idx" ON "EbookProgress"("chapterId");

-- EbookBookmark: chapterId FK
CREATE INDEX IF NOT EXISTS "EbookBookmark_chapterId_idx" ON "EbookBookmark"("chapterId");

-- EbookNote: chapterId FK
CREATE INDEX IF NOT EXISTS "EbookNote_chapterId_idx" ON "EbookNote"("chapterId");

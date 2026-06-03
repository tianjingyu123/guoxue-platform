-- CreateIndex: 发现页排序字段索引
CREATE INDEX "Content_status_likeCount_viewCount_idx" ON "Content"("status", "likeCount", "viewCount");

-- CreateIndex: 课程学生数排序
CREATE INDEX "Course_auditStatus_studentCount_idx" ON "Course"("auditStatus", "studentCount");

-- CreateIndex: 商品销量排序
CREATE INDEX "Product_status_salesCount_idx" ON "Product"("status", "salesCount");

-- CreateIndex: 古籍阅读数排序
CREATE INDEX "ClassicBook_status_viewCount_idx" ON "ClassicBook"("status", "viewCount");

-- CreateIndex: 机器人排序
CREATE INDEX "BotConfig_sortOrder_idx" ON "BotConfig"("sortOrder");

-- CreateIndex: 评论查询优化 (targetType, targetId, parentId, status, createdAt)
CREATE INDEX "Comment_targetType_targetId_parentId_status_createdAt_idx" ON "Comment"("targetType", "targetId", "parentId", "status", "createdAt");

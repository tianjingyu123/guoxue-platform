-- 仅持久化收尾待办，不代表已停止媒体，也不释放资源额度。
ALTER TABLE "ConsultCallMediaBoundary" ADD COLUMN "stopIntent" JSONB;

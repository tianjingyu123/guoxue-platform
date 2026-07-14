-- 汉字笔顺数据（hanzi-writer-data v2.0.1，9575 字）
-- 用途：字典查询页字头卡的笔顺动画。原包 51MB 无法进小程序分包（2MB 上限），故下沉后端按需取。
-- strokes  = 笔画轮廓 SVG path 数组（1024×1024 坐标系，需 translate(0,900) scale(1,-1)）
-- medians  = 每笔中线点列（笔锋行进轨迹，前端据此做「运笔」动画）
-- radStrokes = 属于部首的笔画下标（部首笔画着重色）
-- 幂等：IF NOT EXISTS；重复执行安全。
CREATE TABLE IF NOT EXISTS "HanziStroke" (
  "char" TEXT NOT NULL,
  "strokes" JSONB NOT NULL,
  "medians" JSONB NOT NULL,
  "radStrokes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HanziStroke_pkey" PRIMARY KEY ("char")
);

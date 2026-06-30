#!/bin/bash
# ============================================================
# 检测脚本：扫描所有 .vue 页面是否绕过 API 层直接导入 mock 数据
# 用法：bash scripts/scan-mock-imports.sh
# CI 集成：此脚本返回非零即表示存在违规
# ============================================================

cd "$(dirname "$0")/.."

echo "=== 扫描页面直接导入 mock 数据（绕过 API 层）==="
echo ""

# 所有数据文件中 export 的 mock 变量名（非 API 函数/类型）
# 规则：页面只能导入 xxxApi 对象、类型(interface/type)、工具函数(非数据)
# 禁止导入：mock 数组、mock 对象、mock 常量
MOCK_PATTERNS=(
  # live-data.ts
  'liveList' 'liveHosts' 'liveReplays' 'liveCreateCategories'
  'verticalLiveRoom' 'verticalLiveComments' 'verticalLiveProducts'
  'horizontalLiveRoom' 'horizontalSlides' 'horizontalQuestions'
  'horizontalMessages' 'horizontalFiles'
  'liveWatchRoom' 'liveWatchComments' 'liveWatchRankList' 'liveWatchProducts'
  'livePreviewRoom' 'liveEndRoom' 'liveEndRecommendLives' 'liveEndRecommendCourses'
  'hostLiveStats' 'hostLiveRooms' 'hostLiveTrend'
  'streamConfig' 'obsConfigSteps' 'streamConfigFaq'
  'obsGuideSteps' 'obsGuideRequirements' 'obsGuideFaq'
  'replayCategories' 'replayHotItems' 'replayHomeList' 'replayHotSearches'
  'replayDetail' 'replayCommentAspects' 'replayCommentTagsByRating' 'replayCommentLabels'
  'liveTabs' 'liveCoinBalance' 'playbackSpeeds'
  # course-data.ts
  'allCourses' 'courseBanners' 'categoryNav' 'featured' 'ranking'
  'flashSaleCourses' 'freeCourses' 'newCourses' 'feedFilters'
  'courseDetail' 'courseChapters' 'courseReviews' 'courseProgress'
  'progressChapters' 'learnCourse' 'learnProgress' 'learnChapters'
  'learnNotes' 'learnQuestions' 'playerContent' 'playerChapters'
  'saleSessions' 'saleCourses' 'purchaseCourse' 'purchaseCoupons'
  'courseCertificate' 'studyGoal' 'plannedCourses' 'studyStreak' 'checkInLevels'
  'workRequirement' 'workSubmissions' 'workResult'
  # classics-data.ts
  'CAT_CONFIG' 'CAT_BOOKS'
  # ebook-data.ts
  'ebookShelfBooks' 'ebookShelfFilters'
  # im-data.ts
  'mockConversations' 'mockChatTarget' 'mockChatHistory'
  'mockGroupDetail' 'mockGroupMembers' 'mockGroupChatHistory'
  'mockNotifyMessages' 'mockUnreadCounts' 'messageTabs'
  # operator-data.ts
  'operatorAgreementSections' 'operatorAgreementTip'
  'stationAgreementSections' 'stationAgreementTip'
  'analysisMembers' 'dormantMembers' 'invitedStations'
  'quotaData' 'quotaRecords' 'quotaSaleLink'
  # station-* data
  'defaultStationConfig' 'featuredTypeConfig'
  'stationBrand' 'stationBanners' 'stationFeatures'
  'stationRecommends' 'stationFeedList' 'stationPosterImage'
  # courses-list-data.ts
  'coursesListCategories' 'coursesListItems'
  # instructor-data.ts
  'instructorProfile' 'instructorCourses'
  # agent-data.ts
  'csWelcome' 'csQuick' 'csReplies' 'csDefaultReply'
  'zhixuanWelcome' 'zhixuanQuickPrompts' 'zhixuanReply'
  # post-detail-data.ts
  'postDetailMock'
  # mine-data.ts（仅 mock 数据，不含 UI 配置常量）
  'mineProfile' 'blacklistUsers' 'blacklistSearchPool'
  'aboutStats' 'historyFeedbacks'
  'boundAccounts'
  # order-data.ts（仅 mock 数据，不含 UI 配置常量如 detailSteps/detailStatusConfig/logisticsStatusMap）
  'orderReviewItems' 'refundProgress' 'logisticsDetail'
  # shop-data.ts（仅 mock 数据，不含 UI 配置常量如 payMethods/invoiceOptions）
  'compareProducts' 'comparePickList'
  'groupBuyFail' 'groupBuySuccess'
  'checkoutItems' 'checkoutAddresses'
)

EXIT_CODE=0
COUNT=0

# 单次扫描（取代原"每文件 × 每模式"嵌套 grep）：把所有 mock 名拼成一个交替正则，
# 一次性 grep 出 .vue（非 lib）里 import 行直接引用 mock 名的违规行。
# 原版在 Windows/Git-Bash 上因进程启动慢会跑几分钟甚至卡死并堆积僵尸进程，故改单进程实现。
JOINED=$(IFS='|'; echo "${MOCK_PATTERNS[*]}")

while IFS= read -r line; do
  [ -z "$line" ] && continue
  echo "  ❌ $line"
  EXIT_CODE=1
  COUNT=$((COUNT + 1))
done < <(grep -rEn --include="*.vue" "import[^;]*\b(${JOINED})\b" src 2>/dev/null)

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ 未发现违规 — 所有页面均通过 API 层获取数据"
else
  echo "❌ 发现 $COUNT 处违规 — 页面绕过 API 层直接导入 mock 数据"
  echo "   修复方向：将 import { mockData } 改为调用对应 Api 对象的异步方法"
fi

exit $EXIT_CODE

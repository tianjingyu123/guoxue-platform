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

while IFS= read -r -d '' vuefile; do
  # 跳过数据文件自身
  [[ "$vuefile" == *"/lib/"* ]] && continue
  [[ "$vuefile" == *"node_modules"* ]] && continue

  IMPORTS=$(grep -oP "from ['\"]@/lib/[^'\"]+['\"]" "$vuefile" 2>/dev/null | head -20)
  [ -z "$IMPORTS" ] && continue

  for pattern in "${MOCK_PATTERNS[@]}"; do
    if grep -q "\b${pattern}\b" "$vuefile" 2>/dev/null; then
      # 检查是否确实在该文件中作为导入使用（非类型、非注释）
      if grep -q "import.*${pattern}" "$vuefile" 2>/dev/null; then
        echo "  ❌ $vuefile — 直接导入 mock: $pattern"
        EXIT_CODE=1
        COUNT=$((COUNT + 1))
        break
      fi
    fi
  done
done < <(find src -name "*.vue" -type f -print0 2>/dev/null)

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ 未发现违规 — 所有页面均通过 API 层获取数据"
else
  echo "❌ 发现 $COUNT 处违规 — 页面绕过 API 层直接导入 mock 数据"
  echo "   修复方向：将 import { mockData } 改为调用对应 Api 对象的异步方法"
fi

exit $EXIT_CODE

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 开发环境快速重置数据库（清空所有表，保留表结构） */
async function main() {
  console.log("🗑️  清空所有数据表...");

  // 使用 CASCADE 自动处理外键依赖，无需手动排序
  const tables = [
    "WebhookSubscription",
    "RecommendLog",
    "RecommendRule",
    "UserInterest",
    "UserBehavior",
    "UserEarning",
    "GiftRecord",
    "Gift",
    "AudioCallBilling",
    "AudioCallRecord",
    "PaidQuestion",
    "VirtualCoinRecharge",
    "VirtualCoinTransaction",
    "VirtualCoinAccount",
    "ReferralLink",
    "Withdrawal",
    "CommissionConfig",
    "Bookmark",
    "ReadingProgress",
    "ClassicChapter",
    "ClassicBook",
    "SearchHistory",
    "Notification",
    "ConfigSystem",
    "AuditLog",
    "Report",
    "Collect",
    "Comment",
    "Like",
    "InstituteMember",
    "StationSettlement",
    "StationTeacherBooking",
    "StationOrder",
    "StationProduct",
    "OfflineCourseRegistration",
    "OfflineCourse",
    "StationOffline",
    "StationEarning",
    "Operator",
    "Station",
    "AiAnalysisRecord",
    "PaipanRecord",
    "BotChatLog",
    "BotKnowledgeBase",
    "CircleBot",
    "BotConfig",
    "VideoProduct",
    "Video",
    "LiveAuditLog",
    "LiveFlashSale",
    "LiveMutedUser",
    "LiveSlide",
    "LiveMic",
    "LiveProduct",
    "LiveRoom",
    "OrderLogistics",
    "ProductReview",
    "UserCoupon",
    "Coupon",
    "Order",
    "ProductSku",
    "Product",
    "CourseWork",
    "CourseProgress",
    "CourseChapter",
    "Course",
    "ArticleRecommend",
    "Article",
    "Content",
    "Post",
    "CircleMember",
    "Circle",
    "Follow",
    "ReferralRelation",
    "MemberPurchase",
    "UserRole",
    "Auth",
    "User",
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  console.log("✅ 所有表已清空");
  console.log("💡 运行 pnpm db:seed 重新填充种子数据");
}

main()
  .catch((e) => {
    console.error("❌ 重置失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

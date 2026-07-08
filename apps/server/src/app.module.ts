import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { CircleModule } from "./modules/circle/circle.module";
import { CircleRefundModule } from "./modules/circle-refund/circle-refund.module";
import { GrowthModule } from "./modules/growth/growth.module";
import { ConsultCallModule } from "./modules/consult-call/consult-call.module";
import { ArticleModule } from "./modules/article/article.module";
import { PaipanModule } from "./modules/paipan/paipan.module";
import { CourseModule } from "./modules/course/course.module";
import { InteractionModule } from "./modules/interaction/interaction.module";
import { ShopModule } from "./modules/shop/shop.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { TrackModule } from "./modules/track/track.module";
import { SearchModule } from "./modules/search/search.module";
import { BotModule } from "./modules/bot/bot.module";
import { LiveModule } from "./modules/live/live.module";
import { VideoModule } from "./modules/video/video.module";
import { StationModule } from "./modules/station/station.module";
import { StationPickModule } from "./modules/station-pick/station-pick.module";
import { OfflineModule } from "./modules/offline/offline.module";
import { ClassicModule } from "./modules/classic/classic.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { CommentModule } from "./modules/comment/comment.module";
import { TtsModule } from "./modules/tts/tts.module";
import { RecommendModule } from "./modules/recommend/recommend.module";
import { ContentModule } from "./modules/content/content.module";
import { UploadModule } from "./modules/upload/upload.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { SystemModule } from "./modules/system/system.module";
import { HealthModule } from "./modules/health/health.module";
import { HomeModule } from "./modules/home/home.module";
import { CoinModule } from "./modules/coin/coin.module";
import { QuestionModule } from "./modules/question/question.module";
import { ImModule } from "./modules/im/im.module";
import { AuditModule } from "./modules/audit/audit.module";
import { RevenueModule } from "./modules/revenue/revenue.module";
import { SettlementModule } from "./modules/settlement/settlement.module";
import { AdvisorModule } from "./modules/advisor/advisor.module";
import { UserGrowthModule } from "./modules/user-growth/user-growth.module";
import { MentorshipModule } from "./modules/mentorship/mentorship.module";
import { ContentQualityModule } from "./modules/content-quality/content-quality.module";
import { SmsModule } from "./modules/sms/sms.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { MapModule } from "./modules/map/map.module";
import { EmailModule } from "./modules/email/email.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";
import { AiModule } from "./modules/ai/ai.module";
import { AiGatewayModule } from "./modules/ai-gateway/ai-gateway.module";
import { ContentGenerationModule } from "./modules/content-generation/content-generation.module";
import { OperationRobotModule } from "./modules/operation-robot/operation-robot.module";
import { OperationEngineModule } from "./modules/operation-engine/operation-engine.module";
import { MiniModule } from "./modules/mini/mini.module";
import { WebhookModule } from "./modules/webhook/webhook.module";
import { CallModule } from "./modules/call/call.module";
import { InstituteModule } from "./modules/institute/institute.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { FeatureFlagModule } from "./modules/feature-flag/feature-flag.module";
import { RiskControlModule } from "./modules/risk-control/risk-control.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { MenuModule } from "./modules/menu/menu.module";
import { MerchantModule } from "./modules/merchant/merchant.module";
import { OrderCenterModule } from "./modules/order/order-center.module";
import { MemberModule } from "./modules/member/member.module";
import { QueueModule } from "./modules/queue/queue.module";
import { RenewalModule } from "./modules/renewal/renewal.module";
import { TaskModule } from "./modules/task/task.module";
import { HuifuModule } from "./modules/huifu/huifu.module";
import { FundApprovalModule } from "./modules/fund-approval/fund-approval.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { ChurnModule } from "./modules/churn/churn.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { BountyModule } from "./modules/bounty/bounty.module";
import { ShareModule } from "./modules/share/share.module";
import { CategoryModule } from "./modules/category/category.module";
import { DiscoverModule } from "./modules/discover/discover.module";
import { ToolRegistryModule } from "./modules/tool-registry/tool-registry.module";
import { CompetitionModule } from "./modules/competition/competition.module";
import { BrowseHistoryModule } from "./modules/browse-history/browse-history.module";
import { BundleModule } from "./modules/bundle/bundle.module";
import { CheckinModule } from "./modules/checkin/checkin.module";
import { ExportModule } from "./modules/export/export.module";
import { WannianliModule } from "./modules/wannianli/wannianli.module";
import { TeacherModule } from "./modules/teacher/teacher.module";
import { SharedReadingModule } from "./modules/shared-reading/shared-reading.module";
import { SolarTermModule } from "./modules/solar-term/solar-term.module";
import { OpsModule } from "./modules/ops/ops.module";
import { CrmModule } from "./modules/crm/crm.module";
import { SentinelModule } from "./modules/sentinel/sentinel.module";
import { AdminAssistantModule } from "./modules/admin-assistant/admin-assistant.module";
import { UserTagModule } from "./modules/user-tag/user-tag.module";
import { ObservabilityModule } from "./modules/observability/observability.module";

const conditionalModules: any[] = [];
if (process.env.BULLMQ_DISABLED !== "true") {
  conditionalModules.push(QueueModule);
}
// 赛事模块：通过环境变量 COMPETITION_ENABLED=true 启用，或后台功能开关动态控制
if (process.env.COMPETITION_ENABLED === "true") {
  conditionalModules.push(CompetitionModule);
}

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, RedisModule, MetricsModule, FeatureFlagModule, TaskModule, ...conditionalModules, AuthModule, UserModule, BrowseHistoryModule, BundleModule, RenewalModule, CheckinModule, CircleModule, CircleRefundModule, GrowthModule, ConsultCallModule, ArticleModule, PaipanModule, ToolRegistryModule, WannianliModule, CourseModule, TeacherModule, InteractionModule, ShopModule, HuifuModule, TenantModule, ChurnModule, PricingModule, BountyModule, ShareModule, CategoryModule, DiscoverModule, NotificationModule, SearchModule, BotModule, LiveModule, VideoModule, StationModule, StationPickModule, OfflineModule, ClassicModule, DashboardModule, CommentModule, TtsModule, RecommendModule, ContentModule, UploadModule, ImModule, CommissionModule, SystemModule, HealthModule, HomeModule, CoinModule, QuestionModule, AuditModule, RevenueModule, SettlementModule, AdvisorModule, UserGrowthModule, MentorshipModule, ContentQualityModule, SmsModule, IdentityModule, MapModule, EmailModule, WebsocketModule, AiModule, AiGatewayModule, ContentGenerationModule, OperationRobotModule, OperationEngineModule, MiniModule, WebhookModule, CallModule, InstituteModule, RiskControlModule, MarketingModule, FinanceModule, MenuModule, MerchantModule, OrderCenterModule, MemberModule, ExportModule, TrackModule, FundApprovalModule, SharedReadingModule, SolarTermModule, OpsModule, CrmModule, SentinelModule, UserTagModule, ObservabilityModule, AdminAssistantModule],
})
export class AppModule {}

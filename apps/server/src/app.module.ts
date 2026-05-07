import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { CircleModule } from "./modules/circle/circle.module";
import { ArticleModule } from "./modules/article/article.module";
import { PaipanModule } from "./modules/paipan/paipan.module";
import { CourseModule } from "./modules/course/course.module";
import { InteractionModule } from "./modules/interaction/interaction.module";
import { ShopModule } from "./modules/shop/shop.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { SearchModule } from "./modules/search/search.module";
import { BotModule } from "./modules/bot/bot.module";
import { LiveModule } from "./modules/live/live.module";
import { VideoModule } from "./modules/video/video.module";
import { StationModule } from "./modules/station/station.module";
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
import { CoinModule } from "./modules/coin/coin.module";
import { QuestionModule } from "./modules/question/question.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, CircleModule, ArticleModule, PaipanModule, CourseModule, InteractionModule, ShopModule, NotificationModule, SearchModule, BotModule, LiveModule, VideoModule, StationModule, OfflineModule, ClassicModule, DashboardModule, CommentModule, TtsModule, RecommendModule, ContentModule, UploadModule, CommissionModule, SystemModule, HealthModule, CoinModule, QuestionModule, AuditModule],
})
export class AppModule {}

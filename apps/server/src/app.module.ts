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

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, CircleModule, ArticleModule, PaipanModule, CourseModule, InteractionModule, ShopModule, NotificationModule, SearchModule, BotModule, LiveModule, VideoModule, StationModule, OfflineModule, ClassicModule, DashboardModule],
})
export class AppModule {}

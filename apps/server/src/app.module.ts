import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { CircleModule } from "./modules/circle/circle.module";
import { ArticleModule } from "./modules/article/article.module";

@Module({
  imports: [PrismaModule, AuthModule, UserModule, CircleModule, ArticleModule],
})
export class AppModule {}

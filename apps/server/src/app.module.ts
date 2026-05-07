import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { ContentModule } from "./modules/content/content.module";

@Module({
  imports: [PrismaModule, AuthModule, UserModule, ContentModule],
})
export class AppModule {}

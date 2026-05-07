import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { CircleModule } from "./modules/circle/circle.module";

@Module({
  imports: [PrismaModule, AuthModule, UserModule, CircleModule],
})
export class AppModule {}

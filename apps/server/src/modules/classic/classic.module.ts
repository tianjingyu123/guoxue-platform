import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ClassicController } from "./classic.controller";
import { ClassicService } from "./classic.service";
import { ClassicsBffController } from "./classics-bff.controller";
import { ClassicsBffService } from "./classics-bff.service";
import { ClassicImageController } from "./classic-image.controller";
import { ClassicImageService } from "./classic-image.service";
import { ClassicFontController } from "./classic-font.controller";
import { ClassicQaController } from "./classic-qa.controller";
import { ClassicQaService } from "./classic-qa.service";
import { ClassicIndexTask } from "./classic-index.task";
import { ClassicLibrarySeeder } from "./classic-library-seeder.service";
import { ClassicCompanionService } from "./classic-companion.service";
import { ClassicCommentaryController } from "./classic-commentary.controller";
import { ClassicCommentaryService } from "./classic-commentary.service";
import { ClassicCommentarySeeder } from "./classic-commentary-seeder.service";
import { ClassicBaziSeeder } from "./classic-bazi-seeder.service";
import { ClassicDaizhigeSeeder } from "./classic-daizhige-seeder.service";
import { BaziClassicQueryService } from "./classic-bazi-query.service";
import { BaziClassicController } from "./classic-bazi.controller";
import { ClassicKnowledgeController } from "./classic-knowledge.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { RedisModule } from "../../redis/redis.module";
import { MemberModule } from "../member/member.module";
import { serverConfig } from "../../config/server-config";

@Module({
  imports: [JwtModule.register({ secret: serverConfig.jwtSecret }), AiGatewayModule, RedisModule, MemberModule],
  controllers: [ClassicController, ClassicsBffController, ClassicImageController, ClassicFontController, ClassicQaController, ClassicCommentaryController, BaziClassicController, ClassicKnowledgeController],
  providers: [
    ClassicService, ClassicCompanionService, ClassicsBffService, ClassicImageService, ClassicQaService, ClassicIndexTask,
    ClassicLibrarySeeder, ClassicCommentaryService, ClassicCommentarySeeder,
    ClassicBaziSeeder, ClassicDaizhigeSeeder, BaziClassicQueryService,
  ],
  exports: [ClassicService, ClassicImageService, ClassicQaService, ClassicLibrarySeeder, ClassicCommentaryService, BaziClassicQueryService, ClassicDaizhigeSeeder],
})
export class ClassicModule {}

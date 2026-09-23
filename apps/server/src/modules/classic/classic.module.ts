import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ClassicController } from "./classic.controller";
import { ClassicService } from "./classic.service";
import { ClassicSegmentService } from "./classic-segment.service";
import { ClassicPunctuationService } from "./classic-punctuation.service";
import { ClassicSimplifiedService } from "./classic-simplified.service";
import { TextDerivedAssetService } from "./text-derived-asset.service";
import { ClassicSegmentMigrationTask } from "./classic-segment-migration.task";
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
import { AdminClassicTranslationController } from "./classic-translation-review.controller";
import { ClassicTranslationReviewService } from "./classic-translation-review.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { RedisModule } from "../../redis/redis.module";
import { MemberModule } from "../member/member.module";
import { serverConfig } from "../../config/server-config";
import { PreferredNameService } from "../dialogue/preferred-name.service";

@Module({
  imports: [JwtModule.register({ secret: serverConfig.jwtSecret }), AiGatewayModule, RedisModule, MemberModule],
  controllers: [ClassicController, ClassicsBffController, ClassicImageController, ClassicFontController, ClassicQaController, ClassicCommentaryController, BaziClassicController, ClassicKnowledgeController, AdminClassicTranslationController],
  providers: [PreferredNameService, 
    ClassicService, ClassicSegmentService, ClassicPunctuationService, ClassicSimplifiedService, TextDerivedAssetService, ClassicSegmentMigrationTask, ClassicCompanionService, ClassicsBffService, ClassicImageService, ClassicQaService, ClassicIndexTask,
    ClassicLibrarySeeder, ClassicCommentaryService, ClassicCommentarySeeder,
    ClassicBaziSeeder, ClassicDaizhigeSeeder, BaziClassicQueryService, ClassicTranslationReviewService,
  ],
  exports: [ClassicService, ClassicSegmentService, TextDerivedAssetService, ClassicSegmentMigrationTask, ClassicImageService, ClassicQaService, ClassicLibrarySeeder, ClassicCommentaryService, BaziClassicQueryService, ClassicDaizhigeSeeder],
})
export class ClassicModule {}

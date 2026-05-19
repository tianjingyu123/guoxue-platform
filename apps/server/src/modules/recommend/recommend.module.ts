import { Module } from "@nestjs/common";
import { RecommendService } from "./recommend.service";
import { RecommendController } from "./recommend.controller";
import { RecommendRuleController } from "./recommend-rule.controller";
import { BehaviorService } from "./services/behavior.service";
import { DedupService } from "./services/dedup.service";
import { RuleService } from "./services/rule.service";
import { RecommendCacheService } from "./cache/recommend-cache.service";
import { UserInterestTask } from "./tasks/user-interest.task";
import { TrendCalcTask } from "./tasks/trend-calc.task";
import { CollabMatrixTask } from "./tasks/collab-matrix.task";
import { CollaborativeStrategy } from "./strategies/collaborative.strategy";
import { UserProfileStrategy } from "./strategies/user-profile.strategy";
import { MixedStrategy } from "./strategies/mixed.strategy";
import { VectorRecallStrategy } from "./strategies/vector-recall.strategy";
import { ColdStartService } from "./services/cold-start.service";
import { CtrCalcTask } from "./tasks/ctr-calc.task";
import { TagMatchStrategy } from "./strategies/tag-match.strategy";
import { SearchHotStrategy } from "./strategies/search-hot.strategy";
import { ScoringService } from "./services/scoring.service";
import { ContextBuilderService } from "./services/context-builder.service";
import { CrossSellStrategy } from "./strategies/cross-sell.strategy";
import { TfidfVectorProvider } from "./strategies/tfidf-vector.provider";
import { OpenAIEmbeddingProvider } from "./strategies/openai-embedding.provider";
import { AbTestService } from "./services/ab-test.service";
import { AbTestController } from "./ab-test.controller";
import { SmartFeedService } from "./smart-feed.service";
import { SmartFeedController } from "./smart-feed.controller";
import { SemanticTaggerService } from "./services/semantic-tagger.service";
import { SemanticTagTask } from "./tasks/semantic-tag.task";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { StationPickModule } from "../station-pick/station-pick.module";

@Module({
  imports: [AiGatewayModule, StationPickModule],
  controllers: [SmartFeedController, RecommendController, RecommendRuleController, AbTestController],
  providers: [
    RecommendService,
    BehaviorService,
    DedupService,
    RuleService,
    RecommendCacheService,
    UserInterestTask,
    TrendCalcTask,
    CollabMatrixTask,
    CollaborativeStrategy,
    UserProfileStrategy,
    MixedStrategy,
    VectorRecallStrategy,
    ColdStartService,
    CtrCalcTask,
    TagMatchStrategy,
    SearchHotStrategy,
    ScoringService,
    ContextBuilderService,
    CrossSellStrategy,
    TfidfVectorProvider,
    OpenAIEmbeddingProvider,
    AbTestService,
    SmartFeedService,
    SemanticTaggerService,
    SemanticTagTask,
  ],
  exports: [
    RecommendService,
    BehaviorService,
    DedupService,
    RuleService,
    RecommendCacheService,
    SmartFeedService,
  ],
})
export class RecommendModule {}

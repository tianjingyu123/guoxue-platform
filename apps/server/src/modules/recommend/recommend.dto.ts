import { IsOptional, IsString, IsArray, IsInt, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum RecommendScene {
  PAIPAN_RESULT = "paipan_result",
  COURSE_DETAIL = "course_detail",
  PRODUCT_DETAIL = "product_detail",
  ARTICLE_DETAIL = "article_detail",
  PAYMENT_SUCCESS = "payment_success",
  SEARCH_EMPTY = "search_empty",
  EMPTY_STATE = "empty_state",
  GUESS_LIKE = "guess_like",
  CONVERSATION_GUESS = "conversation_guess",
  CONTACTS_DISCOVER = "contacts_discover",
  COURSE_LEARN = "course_learn",
  SAME_CITY = "same_city",
}

export enum RecommendItemType {
  ARTICLE = "ARTICLE",
  COURSE = "COURSE",
  PRODUCT = "PRODUCT",
  CIRCLE = "CIRCLE",
  VIDEO = "VIDEO",
  CONTENT = "CONTENT",
}

export class RecommendQueryDto {
  @ApiPropertyOptional({ description: "分页页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: "当前查看的内容ID（详情页场景）" })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: "排盘类型（排盘场景）" })
  @IsOptional()
  @IsString()
  paipanType?: string;

  @ApiPropertyOptional({ description: "列表类型（空状态场景）" })
  @IsOptional()
  @IsString()
  listType?: string;

  @ApiPropertyOptional({ description: "刚购买的订单项ID（支付成功场景）" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderItemIds?: string[];

  @ApiPropertyOptional({ description: "客户端需要排除的内容ID" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeIds?: string[];
}

export class RecommendItemVO {
  id: string;
  type: RecommendItemType;
  title: string;
  cover?: string;
  excerpt?: string;
  tags?: string[];
  reason: string;
  strategies: string[];
  score: number;
  metadata?: Record<string, unknown>;
}

export class RecommendResponse {
  items: RecommendItemVO[];
  pagination: { page: number; pageSize: number; total: number };
  recommendId: string;
  extra?: Record<string, unknown>;
}

export class RecommendLogDto {
  @IsString()
  recommendId: string;

  @IsArray()
  interactions: {
    itemId: string;
    itemType: string;
    position: number;
    action: "IMPRESSION" | "CLICK";
    staySeconds?: number;
  }[];
}

export interface RecommendContext {
  scene: RecommendScene;
  userId?: string;
  stationId?: string;
  contentId?: string;
  targetTags?: string[];
  paipanType?: string;
  listType?: string;
  orderItemIds?: string[];
  excludeIds?: string[];
  page: number;
  pageSize: number;
  /** 同城推荐用：经纬度坐标 [lat, lng] */
  coords?: [number, number];
  /** 同城推荐用：城市编码 */
  cityCode?: string;
}

// ── 兴趣标签引导 ──

// ── 运营规则 ──

export class CreateRecommendRuleDto {
  @IsOptional() @IsString() scene?: string;
  @IsString() targetType: string;
  @IsString() targetId: string;
  @IsString() ruleType: string;
  @IsOptional() @Type(() => Number) @IsInt() ruleValue?: number;
  @IsOptional() @Type(() => Number) @IsInt() priority?: number;
  @IsOptional() conditionJson?: any;
  @IsOptional() @IsString() startAt?: string;
  @IsOptional() @IsString() endAt?: string;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsString() createdBy?: string;
}

export class UpdateRecommendRuleDto {
  @IsOptional() @IsString() scene?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @IsString() ruleType?: string;
  @IsOptional() @Type(() => Number) @IsInt() ruleValue?: number;
  @IsOptional() @Type(() => Number) @IsInt() priority?: number;
  @IsOptional() conditionJson?: any;
  @IsOptional() @IsString() startAt?: string;
  @IsOptional() @IsString() endAt?: string;
  @IsOptional() @IsString() remark?: string;
}

export class SaveUserInterestsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

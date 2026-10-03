import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";

/**
 * 分站主推位 9 大板块（顺序固定·与 S2 稿一致）
 * 首页可锁任意类型内容；其余板块只能锁本板块内容。
 */
export const PINNED_BOARDS = ["home", "mall", "course", "circle", "agent", "ebook", "article", "video", "live"] as const;
export type PinnedBoard = (typeof PINNED_BOARDS)[number];

/** 板块中文名（S1/S2 展示） */
export const BOARD_LABELS: Record<PinnedBoard, string> = {
  home: "首页",
  mall: "商城",
  course: "课堂",
  circle: "圈子",
  agent: "智能体",
  ebook: "古籍",
  article: "文章",
  video: "短视频",
  live: "直播",
};

/** 每板块主推位数量 */
export const SLOTS_PER_BOARD = 6;

/** 单个主推位提交项（contentType/contentId 为空表示该位清空） */
export class PinnedSlotInputDto {
  @IsInt()
  @Min(0)
  @Max(SLOTS_PER_BOARD - 1)
  slotIndex!: number;

  @IsOptional()
  @IsString()
  contentType?: string | null;

  @IsOptional()
  @IsString()
  contentId?: string | null;
}

/** S2 保存某板块全部主推位（快照式覆盖写） */
export class SavePinnedBatchDto {
  @IsIn(PINNED_BOARDS as unknown as string[])
  board!: PinnedBoard;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PinnedSlotInputDto)
  slots!: PinnedSlotInputDto[];
}

/** S3 选品库查询 */
export class CatalogQueryDto {
  @IsIn(PINNED_BOARDS as unknown as string[])
  board!: PinnedBoard;

  /** 仅 board=home 时生效：子板块分类 Tab（空/all=聚合全部类别） */
  @IsOptional()
  @IsString()
  filterBoard?: string;

  /** 关键词搜索标题 */
  @IsOptional()
  @IsString()
  q?: string;

  /** 直播板块过滤：live=正在直播 / scheduled=预约 / 空=两者都要 */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

/** C 端读取当前归因分站的某板块主推位。ref 为本机 7 天临时分享归因，服务端会校验为有效分站。 */
export class PublicPinnedQueryDto {
  @IsIn(PINNED_BOARDS as unknown as string[])
  board!: PinnedBoard;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ref?: string;
}
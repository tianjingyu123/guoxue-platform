import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ─────────────────────────────────────────────────
// 列表/聚合用 DTO
// ─────────────────────────────────────────────────

export class PoemItemDto {
  @ApiProperty({ description: "诗词ID" })
  id: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "作者" })
  author: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "体裁" })
  form: string;

  @ApiProperty({ description: "预览句" })
  preview: string;

  @ApiProperty({ description: "点赞数" })
  likes: number;
}

export class PoetItemDto {
  @ApiProperty({ description: "诗人ID" })
  id: string;

  @ApiProperty({ description: "姓名" })
  name: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "作品数" })
  poemCount: number;

  @ApiProperty({ description: "头像/首字" })
  avatar: string;
}

export class TodayPoemDto {
  @ApiProperty({ description: "诗词ID" })
  id: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "作者" })
  author: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "诗句数组", type: [String] })
  lines: string[];

  @ApiProperty({ description: "标签", type: [String] })
  tags: string[];

  @ApiProperty({ description: "点赞数" })
  likes: number;
}

export class HomeResponseDto {
  @ApiProperty({ description: "每日一首", type: TodayPoemDto })
  todayPoem: TodayPoemDto;

  @ApiProperty({ description: "热门诗词", type: [PoemItemDto] })
  poems: PoemItemDto[];

  @ApiProperty({ description: "热门诗人", type: [PoetItemDto] })
  poets: PoetItemDto[];
}

export class CategoryDto {
  @ApiProperty({ description: "分类ID" })
  id: string;

  @ApiProperty({ description: "分类名称" })
  name: string;

  @ApiProperty({ description: "图标" })
  icon: string;

  @ApiProperty({ description: "描述" })
  desc: string;

  @ApiProperty({ description: "数量" })
  count: number;

  @ApiProperty({ description: "子分类", type: [String] })
  subCategories: string[];
}

export class CollectionItemDto {
  @ApiProperty({ description: "合集ID" })
  id: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "作者" })
  author: string;

  @ApiProperty({ description: "作者头像" })
  authorAvatar: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "摘录" })
  excerpt: string;

  @ApiProperty({ description: "分类" })
  category: string;

  @ApiProperty({ description: "点赞数" })
  likes: number;

  @ApiProperty({ description: "是否已赞" })
  liked: boolean;

  @ApiProperty({ description: "收录时间" })
  collectedAt: string;
}

// ─────────────────────────────────────────────────
// 详情用 DTO
// ─────────────────────────────────────────────────

export class PoemLineDto {
  @ApiProperty({ description: "诗句" })
  line: string;

  @ApiProperty({ description: "拼音" })
  pinyin: string;
}

export class PoemNoteDto {
  @ApiProperty({ description: "词语" })
  word: string;

  @ApiProperty({ description: "注释" })
  note: string;
}

export class AuthorInfoDto {
  @ApiProperty({ description: "姓名" })
  name: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "生卒年" })
  years: string;

  @ApiProperty({ description: "称号" })
  title: string;

  @ApiProperty({ description: "简介" })
  intro: string;

  @ApiProperty({ description: "作品数" })
  poemCount: number;
}

export class RelatedPoemDto {
  @ApiProperty({ description: "诗词ID" })
  id: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "作者" })
  author: string;

  @ApiProperty({ description: "预览" })
  preview: string;
}

export class PoemDetailDto {
  @ApiProperty({ description: "诗词ID" })
  id: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "作者" })
  author: string;

  @ApiProperty({ description: "作者ID" })
  authorId: string;

  @ApiProperty({ description: "朝代" })
  dynasty: string;

  @ApiProperty({ description: "体裁" })
  form: string;

  @ApiProperty({ description: "正文（逐句）", type: [PoemLineDto] })
  content: PoemLineDto[];

  @ApiProperty({ description: "赏析" })
  appreciation: string;

  @ApiProperty({ description: "AI 赏析" })
  aiAppreciation: string;

  @ApiProperty({ description: "注释", type: [PoemNoteDto] })
  notes: PoemNoteDto[];

  @ApiProperty({ description: "作者信息", type: AuthorInfoDto })
  authorInfo: AuthorInfoDto;

  @ApiProperty({ description: "相关诗词", type: [RelatedPoemDto] })
  relatedPoems: RelatedPoemDto[];

  @ApiProperty({ description: "标签", type: [String] })
  tags: string[];

  @ApiProperty({ description: "点赞数" })
  likes: number;

  @ApiProperty({ description: "收藏数" })
  collections: number;
}

export class PoemDetailResponseDto {
  @ApiProperty({ description: "诗词详情", type: PoemDetailDto })
  poem: PoemDetailDto;

  @ApiProperty({ description: "逐句白话译文", type: [String] })
  translations: string[];
}

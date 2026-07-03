import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BannerDto {
  @ApiProperty({ description: "Banner ID" })
  id: string;

  @ApiProperty({ description: "图片URL" })
  image: string;

  @ApiProperty({ description: "标题" })
  title: string;

  @ApiProperty({ description: "跳转链接" })
  link: string;
}

export class DailyVerseDto {
  @ApiProperty({ description: "典籍名" })
  source: string;

  @ApiProperty({ description: "原文" })
  content: string;

  @ApiProperty({ description: "作者/出处" })
  author: string;
}

export class FeedItemDto {
  @ApiProperty({ description: "内容ID" })
  id: string;

  @ApiProperty({ description: "内容类型", enum: ["article", "course", "live", "product", "circle_post", "video", "classic"] })
  type: string;

  @ApiPropertyOptional({ description: "标题" })
  title?: string;

  @ApiPropertyOptional({ description: "作者" })
  author?: string;

  @ApiPropertyOptional({ description: "作者头像" })
  authorAvatar?: string;

  @ApiPropertyOptional({ description: "封面图" })
  cover?: string | null;

  @ApiPropertyOptional({ description: "封面比例" })
  coverRatio?: string;

  @ApiPropertyOptional({ description: "价格" })
  price?: number;

  @ApiPropertyOptional({ description: "原价" })
  originalPrice?: number;

  @ApiPropertyOptional({ description: "标签" })
  tag?: string;

  @ApiPropertyOptional({ description: "摘要" })
  excerpt?: string;

  @ApiPropertyOptional({ description: "创建时间（ISO，质量提权后的排序基准仍返回原始值）" })
  createdAt?: string;
}

export class HomeResponseDto {
  @ApiProperty({ description: "Banner轮播", type: [BannerDto] })
  banners: BannerDto[];

  @ApiProperty({ description: "每日一句" })
  dailyVerse: DailyVerseDto;

  @ApiProperty({ description: "推荐圈子", type: [Object] })
  recommendedCircles: Record<string, unknown>[];

  @ApiProperty({ description: "Feed内容流", type: [FeedItemDto] })
  feed: FeedItemDto[];

  @ApiProperty({ description: "Feed总数" })
  total: number;

  @ApiProperty({ description: "当前页码" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  pageSize: number;
}

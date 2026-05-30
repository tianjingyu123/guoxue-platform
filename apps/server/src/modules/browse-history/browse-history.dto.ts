import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BrowseHistoryQueryDto {
  @ApiProperty({ description: "页码", example: 1, default: 1 })
  @IsInt() @Min(1) @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: "每页条数", example: 20, default: 20 })
  @IsInt() @Min(1) @IsOptional()
  pageSize?: number = 20;

  @ApiProperty({ description: "筛选类型：content/course/circle/classic/ebook/video/live/article/product/poetry", required: false })
  @IsString() @IsOptional()
  targetType?: string;
}

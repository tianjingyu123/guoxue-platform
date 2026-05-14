import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsArray, Min, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AddStationPickDto {
  @ApiProperty({ description: "内容类型", example: "COURSE" })
  @IsString()
  contentType: string;

  @ApiProperty({ description: "内容ID" })
  @IsString()
  contentId: string;

  @ApiPropertyOptional({ description: "推荐语", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class ReorderItem {
  @ApiProperty({ description: "记录ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "排序序号，越小越靠前" })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderPicksDto {
  @ApiProperty({ description: "排序列表", type: [ReorderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}

export class StationPickQuotaVo {
  @ApiProperty({ description: "已使用数量" })
  used: number;

  @ApiProperty({ description: "上限" })
  limit: number;
}

export class StationPickConfigDto {
  @ApiPropertyOptional({ description: "是否启用站长精选注入" })
  @IsOptional()
  stationZoneEnabled?: boolean;

  @ApiPropertyOptional({ description: "注入位置数组（0起始）", example: [2, 5, 9] })
  @IsOptional()
  @IsArray()
  stationPickPositions?: number[];
}

import { Type } from "class-transformer";
import { IsString, IsOptional, IsArray, IsNumber, IsObject, ValidateNested, ArrayMaxSize } from "class-validator";

/** 单条行为埋点事件（与前端 composables/useTrack.ts 的 TrackEvent 对齐） */
export class TrackEventDto {
  @IsString()
  action: string; // page_view / click / purchase / search / share / custom

  @IsOptional() @IsString()
  path?: string;

  @IsOptional() @IsObject()
  payload?: Record<string, any>;

  @IsOptional() @IsNumber()
  ts?: number; // 客户端毫秒时间戳
}

/** 批量上报（前端按 20 条/3 秒批量 flush） */
export class TrackBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  @ArrayMaxSize(50)
  events: TrackEventDto[];
}

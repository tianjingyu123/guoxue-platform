import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  IsNotEmpty,
  Matches,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 单条对话消息。
 *
 * 此前 ChatDto.messages 只有 @IsArray()，元素完全不校验——
 * 全局 ValidationPipe 的 whitelist 对未声明 @Type 的数组元素不起作用，
 * 任意结构（含超长文本、非法 role）都能原样进到提示词里。
 */
export class ChatMessageDto {
  @IsIn(["system", "user", "assistant"])
  role!: "system" | "user" | "assistant";

  @IsString()
  @IsNotEmpty({ message: "消息内容不能为空" })
  content!: string;
}

/**
 * 通用 AI 对话请求。
 *
 * 分工：
 * - 本 DTO 只做**结构性**校验（类型、枚举、非空、整数、场景名格式）；
 * - 条数 / 长度 / 数值区间等**规模性**边界按场景声明在 `chat-scene-registry.ts`，
 *   由 ChatSceneAccessService 判定。不在这里写死全平台统一上限——
 *   不同场景对应不同模型与用途，统一上限既会误伤管理端长会话，又会放行成本敏感场景。
 */
export class ChatDto {
  /** 场景名。是否放行由 chat-scene-registry.ts 决定，此处只限制字符集与长度，防止日志注入与超长键 */
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: "scene 只能包含字母、数字、下划线和连字符" })
  scene!: string;

  @IsArray()
  @ArrayMinSize(1, { message: "messages 不能为空" })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsNumber()
  temperature?: number;

  /** token 数必须是整数：浮点会被供应商拒绝或静默取整，上限按场景在注册表里声明 */
  @IsOptional()
  @IsInt({ message: "maxTokens 必须是整数" })
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;
}

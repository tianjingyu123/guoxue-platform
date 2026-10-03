import { IsString, IsArray, IsOptional, MaxLength } from "class-validator";

/** 智玄助手对话请求（无状态：多轮上下文由前端携带近几轮 history） */
export class ZhixuanChatDto {
  @IsString()
  @MaxLength(2000)
  query!: string;

  /** 近几轮对话（前端裁剪到 8 条以内），用于多轮上下文 */
  @IsOptional()
  @IsArray()
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

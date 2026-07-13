import { IsString, IsOptional, MaxLength } from "class-validator";

/**
 * 排盘 AI 解读请求（无状态）。
 * 前端把已排好的盘面压缩成纯文本 `chart` 摘要传入（后端不重排，避免与前端引擎口径不一致），
 * 后端按 `tool` 选择对应术数的解读系统提示词，注入盘面后交模型生成解读。
 */
export class PaipanInterpretDto {
  /** 工具标识（与前端排盘工具目录名一致，如 meihua/ziwei/xuankong） */
  @IsString()
  @MaxLength(40)
  tool!: string;

  /** 盘面摘要（前端拼装的纯文本，模型解读的唯一事实依据） */
  @IsString()
  @MaxLength(4000)
  chart!: string;

  /** 用户针对本盘的追问（可选；空则做整体解读） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;
}

/**
 * V8 节气仪式 — 响应类型（本模块端点均无请求体，DTO 仅用于返回值类型/Swagger 语义）
 */

/** 当期节气内容（GET /today 的 current） */
export interface CurrentTermDto {
  key: string;
  name: string;
  date: string; // 今日公历 YYYY-MM-DD
  sanHou: string;
  custom: string;
  health: string;
  poem: string;
}

/** GET /solar-term/today 响应 */
export interface TodayResponseDto {
  isSolarTermDay: boolean;
  current: CurrentTermDto | null;
  next: { name: string; daysUntil: number };
  myParticipated: boolean;
}

/** POST /solar-term/participate 响应 */
export interface ParticipateResponseDto {
  term: string;
  newAchievements: string[];
  totalTerms: number;
}

/** GET /solar-term/my 响应 */
export interface MyParticipationDto {
  participated: Array<{ termName: string; year: number; participatedAt: Date }>;
  totalUniqueTerms: number;
  collectProgress: string; // "x/24"
}

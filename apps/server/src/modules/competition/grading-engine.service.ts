import { Injectable } from "@nestjs/common";
import { QuestionType } from "@prisma/client";

/**
 * A类评分引擎：客观题全自动评分
 *
 * 支持题型：
 * - SINGLE_CHOICE: 精确匹配
 * - MULTI_CHOICE: 部分匹配给部分分
 * - FILL_IN: 精确匹配（支持多答案）
 * - SCALE: 偏离度算法
 */
@Injectable()
export class GradingEngineService {
  /**
   * 自动判分，返回 { score, isCorrect, maxScore }
   */
  grade(
    questionType: QuestionType,
    standardAnswer: Record<string, any>,
    userAnswer: Record<string, any>,
    maxScore: number = 10,
  ): { score: number; isCorrect: boolean; maxScore: number } {
    switch (questionType) {
      case "SINGLE_CHOICE":
        return this.gradeSingleChoice(standardAnswer, userAnswer, maxScore);
      case "MULTI_CHOICE":
        return this.gradeMultiChoice(standardAnswer, userAnswer, maxScore);
      case "FILL_IN":
        return this.gradeFillIn(standardAnswer, userAnswer, maxScore);
      case "SCALE":
        return this.gradeScale(standardAnswer, userAnswer, maxScore);
      default:
        // CASE_ANALYSIS, ESSAY 需要人工评分
        return { score: 0, isCorrect: false, maxScore };
    }
  }

  /** 单选题：精确匹配 */
  private gradeSingleChoice(
    standard: Record<string, any>,
    user: Record<string, any>,
    maxScore: number,
  ) {
    const correctKey = standard.correctKey ?? standard.answer;
    const userKey = user.selectedKey ?? user.answer;
    const isCorrect = String(correctKey).toUpperCase() === String(userKey).toUpperCase();
    return { score: isCorrect ? maxScore : 0, isCorrect, maxScore };
  }

  /** 多选题：部分匹配 */
  private gradeMultiChoice(
    standard: Record<string, any>,
    user: Record<string, any>,
    maxScore: number,
  ) {
    const correctSet = new Set(
      (standard.correctKeys ?? standard.answer ?? []).map((k: string) => String(k).toUpperCase()),
    );
    const userSet = new Set(
      (user.selectedKeys ?? user.answer ?? []).map((k: string) => String(k).toUpperCase()),
    );

    if (correctSet.size === 0) return { score: 0, isCorrect: false, maxScore };

    // 计算交集
    let intersection = 0;
    let wrongSelection = 0;
    for (const k of userSet) {
      if (correctSet.has(k)) intersection++;
      else wrongSelection++;
    }

    // 完全正确
    if (intersection === correctSet.size && wrongSelection === 0) {
      return { score: maxScore, isCorrect: true, maxScore };
    }

    // 部分正确：按正确比例给分，多选扣分
    const ratio = intersection / correctSet.size;
    const penalty = wrongSelection * (maxScore * 0.1);
    const score = Math.max(0, Math.round(maxScore * ratio - penalty));

    return { score, isCorrect: false, maxScore };
  }

  /** 填空题：支持多个可接受答案 */
  private gradeFillIn(
    standard: Record<string, any>,
    user: Record<string, any>,
    maxScore: number,
  ) {
    const acceptableAnswers: string[] = standard.acceptableAnswers ?? standard.answer ?? [];
    const userAnswer = String(user.text ?? user.answer ?? "").trim();

    if (acceptableAnswers.length === 0) return { score: 0, isCorrect: false, maxScore };

    // 忽略大小写和首尾空格
    const normalized = userAnswer.toLowerCase();
    const isCorrect = acceptableAnswers.some(
      (a) => String(a).trim().toLowerCase() === normalized,
    );

    return { score: isCorrect ? maxScore : 0, isCorrect, maxScore };
  }

  /** 量表题：偏离度算法 */
  private gradeScale(
    standard: Record<string, any>,
    user: Record<string, any>,
    maxScore: number,
  ) {
    const standardValue = Number(standard.value ?? standard.answer ?? 0);
    const userValue = Number(user.value ?? user.answer ?? 0);
    const tolerance = Number(standard.tolerance ?? Math.ceil(maxScore * 0.1));

    const deviation = Math.abs(userValue - standardValue);

    // 在容差范围内 → 满分
    if (deviation <= tolerance) {
      return { score: maxScore, isCorrect: true, maxScore };
    }

    // 偏离度扣分：每超出容差1个单位扣20%
    const extraDeviation = deviation - tolerance;
    const penaltyRatio = Math.min(1, extraDeviation * 0.2);
    const score = Math.max(0, Math.round(maxScore * (1 - penaltyRatio)));

    return { score, isCorrect: score >= maxScore * 0.6, maxScore };
  }
}

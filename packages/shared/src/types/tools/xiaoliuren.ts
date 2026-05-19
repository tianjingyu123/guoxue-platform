// ── 小六壬排盘共享类型 ──

/** 排盘类型 */
export type XiaoLiuRenType = "daojia" | "jiangshi" | "jiangshi2";

/** 起课方式 */
export type XiaoLiuRenMethod = "time" | "baoshu";

// ── 小六壬输入 ──

export interface XiaoLiuRenInput {
  /** 排盘时间（默认当前） */
  datetime: string;
  /** 排盘类型 */
  type: XiaoLiuRenType;
  /** 起课方式 */
  method: XiaoLiuRenMethod;
  /** 报数（起课方式=报数时生效） */
  reportNumber?: number;
}

// ── 掌诀六位 ──

export type ZhangJueName = "大安" | "留连" | "速喜" | "赤口" | "小吉" | "空亡";

/** 掌诀单个宫位 */
export interface ZhangJuePosition {
  /** 位序（1-6） */
  index: number;
  /** 掌诀名 */
  name: ZhangJueName;
  /** 手掌位置描述 */
  handPosition: string;
  /** 五行 */
  wuXing: "木" | "火" | "水" | "金" | "土";
  /** 方位 */
  direction: string;
  /** 吉凶 */
  jiXiong: "大吉" | "中吉" | "凶" | "大凶";
  /** 数字范围 */
  numbers: string;
  /** 核心断语 */
  duanYu: string;
  /** 详细象意 */
  xiangYi: {
    /** 主事 */
    main: string;
    /** 寻人 */
    xunRen: string;
    /** 失物 */
    shiWu: string;
    /** 出行 */
    chuXing: string;
    /** 婚姻 */
    hunYin: string;
    /** 求财 */
    qiuCai: string;
    /** 健康 */
    jianKang: string;
  };
  /** 对应颜色 */
  color: string;
}

// ── 推算步骤 ──

export interface TuiSuanStep {
  /** 步骤序号 */
  step: number;
  /** 步骤说明 */
  label: string;
  /** 起始位置 */
  from: ZhangJueName;
  /** 经过的数字 */
  count: number;
  /** 落位 */
  to: ZhangJueName;
  /** 推算文字 */
  desc: string;
}

// ── 小六壬排盘结果 ──

export interface XiaoLiuRenResult {
  /** 输入参数 */
  input: XiaoLiuRenInput;

  /** 农历时间 */
  lunarTime: {
    year: string;
    month: number;
    monthName: string;
    day: number;
    dayGanZhi?: string;
    shiChen: string;
    shiChenIndex: number;
  };

  /** 是否闰月 */
  isRunYue: boolean;

  /** 掌诀六宫信息 */
  zhangJue: ZhangJuePosition[];

  /** 推算步骤 */
  steps: TuiSuanStep[];

  /** 最终落位 */
  finalPosition: ZhangJuePosition;

  /** 综合断语 */
  duanYu: string;

  /** 相关提示 */
  tips: string[];
}

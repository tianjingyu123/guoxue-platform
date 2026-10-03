/**
 * 起名宜忌审定（2026-09-19）
 *
 * ══ 这一层是判断，不是数据 ══
 *
 * 决策人 2026-09-19：「你先审一下，看看哪些字不适合做名字，
 * 哪些组合好的名字不适合做名字，男名女名还要有区分，最终形成一版本。」
 *
 * 前面五次尝试（部首过滤、字义抽取、字频、词典词排序、虚词闭集）都试过了，
 * 结论是**最后一公里靠数据走不完**（记录见 `dianji.ts` 与接续文档 §2.98）。
 * 本文件是我按决策人要求做的**人工审定**。
 *
 * **我把判据逐条写出来，是为了让它可被复核和推翻。**
 * 下面每一类忌用字都附了归类理由；不同意某一类或某个字的，
 * 直接改这里的常量即可，不需要读代码逻辑。这比藏在算法里的口味好得多。
 *
 * ══ 忌用的判据：只收「用在人名里会让人不适」的 ══
 *
 * 不是「这个字不好看」，而是**放进名字会冒犯、不祥或引人误解**。
 * 所以「荒」「寂」这类诗意但消极的字收，「峭」「峻」这类冷硬但正面的字不收。
 *
 * ══ 男女之分：只作倾向，不作硬限制 ══
 *
 * 传统上确有偏向（女名多花草玉石柔美，男名多山岳志向刚健），
 * 但现实中大量名字是中性的，且**越来越多人不愿被这条规则限制**。
 * 故本文件给的是 `male` / `female` / `neutral` 三档**倾向**，
 * 调用方可以按性别排序而不是按性别过滤——
 * 给女孩取名时把 female 与 neutral 排前面，而不是把 male 全部藏起来。
 */

// ─────────────────── 忌用字 ───────────────────

/**
 * 忌用字，按类别列出。每类的理由写在键名旁。
 *
 * 只收**确有问题**的；拿不准的一律不收——
 * 宁可漏掉几个让人工再审，也不要把好字误杀（第 5 次尝试的教训：
 * 虚词表做宽了会把千里、东风、明月、江南全滤掉）。
 */
export const AVOID_CHARS: Record<string, string> = {
  // 负面情绪：诗里常见，但用在名字上等于给人贴一辈子的标签
  负面情绪: "愁悲哀怨恨恼凄怕憔悴怅懊惭愧忧痛伤泣泪哭啼咽噎叹嗟悔恸闷烦恍惚惶悚怖悼怆恻慌怯懦戚郁寂寞孤独断",
  // 疾病死亡：起名场景多为新生儿，这类字不可用
  疾病死亡: "病疾疮疡疽瘤痘疹疫痨瘟疴痕瘢死亡丧殁殒殇夭殃殡葬坟墓冢骸尸殍",
  // 凶险灾祸
  凶险灾祸: "凶恶毒祸灾危厄劫煞魔孽咎殃戮杀砍屠斩狱囚牢囹圄枷镣缚",
  // 衰败零落
  衰败零落: "衰败破损缺裂崩溃塌陷朽腐霉锈蚀颓废弃枯萎凋谢秃蔫",
  // 污秽不雅
  污秽不雅: "屎尿屁粪垢秽脏臭污浊溷粘黏痰涎唾涕脓疣瘊",
  // 身体部位与生理：生硬且易引人取笑
  身体部位: "胸腰腹肠胃肛臀乳膝肘腋髀骼臂腿脚趾肤肉血脓脏腑",
  // 虫豸鼠蛇：非祥瑞者
  虫豸鼠蛇: "蛇蛛蟋蟀蜍蟠蛩蚁蝇蛆虱蟑鼠蝠蜈蚣蜥蜴蟒蚊蚤蛔蛭螂蝼蚓蛞蜗虿蝎",
  // 贬义评价
  贬义评价: "愚蠢笨拙劣庸鄙陋贱卑猥琐吝啬贪懒谬讹诈欺诳诬谗谄佞奸诡狡黠",
  // 争斗诉讼
  争斗诉讼: "殴讼诉讦骂詈谤毁诋诽仇敌寇贼盗匪掠夺掳",
  // 过于俗白或口语
  俗白口语: "咋啥哩呗嘛喽哟唉噢嗯哼哎呀咯",
  // 贫困窘迫
  贫困窘迫: "贫穷困窘迫乏匮竭馁饥饿渴瘠窭",
};

/**
 * 🔴 2026-09-19 第二轮修正。首版把下列字误列为忌用，实测误杀了大量好名料，已移出：
 *
 * | 字 | 首版归类 | 为何是误判 |
 * |---|---|---|
 * | 寒 | 贫困窘迫 | 中性意象——岁寒三友、寒梅、广寒宫 |
 * | 斗 | 争斗诉讼 | 是星宿与量器——北斗、星斗、斗酒、斗草 |
 * | 肌 甲 | 身体部位 | 冰肌玉骨是美；甲子是干支 |
 * | 难 妖 | 凶险灾祸 | 「难」多作副词（难忘、难老）；「妖」在妖娆里是美 |
 * | 狂 傲 俗 | 贬义评价 | 诗中「狂」是洒脱（疏狂、狂歌），非贬义 |
 * | 蟾 | 虫豸鼠蛇 | **蟾宫折桂是吉语** |
 * | 琉 璃 珊 瑚 罗 绮 | 专名性强 | 琉璃、珊瑚本就有人用作名 |
 * | 落 零 | 衰败零落 | 落日、落花、院落是经典美景；问题在「零落/飘零」这类组合，不在单字 |
 * | 绝 尽 闲 | 各类 | 清绝、绝妙、闲适皆褒义或中性 |
 *
 * 教训与第 5 次虚词表那次一样：**宁可漏掉几个让人工再审，也不要把好字误杀。**
 * 忌用表做宽的代价，是把最好的名料一并滤掉——而那正是用户要的。
 *
 * 单字层面拿不准的，改用下面的**组合级黑名单**精确处理。
 */
export const AVOID_PHRASES = new Set([
  // 非名料的写景短语——单字皆为实词，合起来只是诗句片段，不成名
  "夜深", "深院", "花深", "山深", "春深", "云深", "深处", "深山", "院落", "日暮", "黄昏", "夕阳",
  // 意象消极的具体组合——单字本身无罪，合起来才不宜
  "零落", "飘零", "落魄", "沦落", "衰草", "败叶", "残阳", "斜阳",
  "断肠", "肠断", "销魂", "黯然", "萧索", "萧条", "荒凉", "苍凉",
  "离恨", "别恨", "遗恨", "余恨", "无常", "空虚", "虚无", "幻灭",
  "生死", "死生", "兴亡", "存亡", "老病", "病酒", "白骨", "骨肉",
]);

/** 展平后的忌用字集合 */
export const AVOID_SET: ReadonlySet<string> = new Set(
  Object.values(AVOID_CHARS).join(""),
);

/**
 * 有条件可用：本身不凶，但要看搭配或性别。
 * 不进忌用表，但在排序时降权，并在结果里附提示。
 */
export const CAUTION_CHARS: Record<string, string> = {
  虫豸中可用者: "蝶萤蜂蝉螺",          // 蝶恋花、流萤，多用于女名
  猛兽: "虎豹熊狼鹰隼",                 // 多用于男名，女名慎用
  兵器: "剑戈矛戟刀锋刃镞",             // 男名可用，取其锐意
  神怪: "鬼神仙佛魂魄灵",               // 灵、仙可用，鬼、魄慎用
  时间流逝: "暮昏晚夕昔旧陈残",         // 诗意但带迟暮意
};
export const CAUTION_SET: ReadonlySet<string> = new Set(
  Object.values(CAUTION_CHARS).join(""),
);

// ─────────────────── 性别倾向 ───────────────────

export type GenderLean = "male" | "female" | "neutral";

/**
 * 明显偏女的字。
 *
 * 判据：女字旁、花草、玉石珠翠、丝帛织物、柔美形容、色彩妆饰。
 * 这几类是传统女名的主要取材，不是我临时拍的。
 */
export const FEMALE_CHARS =
  "婷婉娜娇妍媛姝嫣妙姿娅娟妮姗娴淑婵娥妤婕嬛娉袅嫱姣妆媚娆姹嫦" +
  "芳芷蕊菲薇荷莲兰蓉茜苑荃蘅芊芸芝莹莺蓓菡萏蕙蘋苓芙蕖茉莉薰芹" +
  "瑶琼璇珊珍玫瑾琳珮璐玥瑛琬璧瑗琦珑玲珠翠钿钗环佩" +
  "绮绫纨绡缃绣绛绢纱绸缎锦纹绦缨" +
  "柔婉温娴静雅韵怡恬淑慧敏秀丽美娴淳惠贞淑仪" +
  "霞彩虹绛胭脂黛眉颦靥笑嫩柔香馥郁芬馨";

/**
 * 明显偏男的字。
 *
 * 判据：山岳岩石、金石刚健、志向德业、栋梁器用、龙马鹏鹰、方位疆域。
 */
export const MALE_CHARS =
  "峰岩岭嵩崇峻巍岳崖磊碣砥砺坚岐岷嶂峥嵘" +
  "钢铁锋锐铮钧镇铠钺锴铭鑫" +
  "志毅刚强勇威武猛雄豪杰俊彪桀毅果决断敢烈壮健硕" +
  "栋梁柱础基邦国邦楷模范章典宪宗祖绍继承业勋绩" +
  "鹏鹰骏骁骐骥龙虎麟犀象狮豹" +
  "宇轩昊旻乾坤宏博浩瀚渊远征拓疆域垠寰宸";

const FEMALE_SET = new Set(FEMALE_CHARS);
const MALE_SET = new Set(MALE_CHARS);

/** 单字的性别倾向 */
export function charGender(char: string): GenderLean {
  const f = FEMALE_SET.has(char), m = MALE_SET.has(char);
  if (f && !m) return "female";
  if (m && !f) return "male";
  return "neutral";
}

/**
 * 二字组合的性别倾向。
 *
 * 两字一男一女时判中性——「明珠」「文雅」这类本就男女皆可，
 * 强行归边反而把可用的名字挡掉。
 */
export function phraseGender(word: string): GenderLean {
  const g = [...word].map(charGender);
  const f = g.filter((x) => x === "female").length;
  const m = g.filter((x) => x === "male").length;
  if (f > m) return "female";
  if (m > f) return "male";
  return "neutral";
}

// ─────────────────── 审定判定 ───────────────────

export interface ReviewResult {
  ok: boolean;
  /** 不通过的原因（含类别名），通过时为空 */
  reasons: string[];
  /** 含需留意的字时给出提示，不影响通过 */
  cautions: string[];
  gender: GenderLean;
}

/** 反查某字属于哪一类忌用 */
export function avoidCategoryOf(char: string): string | null {
  for (const [cat, chars] of Object.entries(AVOID_CHARS)) {
    if (chars.includes(char)) return cat;
  }
  return null;
}

/** 审一个二字组合 */
export function reviewPhrase(word: string): ReviewResult {
  const reasons: string[] = [];
  // 组合级黑名单优先——单字无罪、合起来不宜的那一类
  if (AVOID_PHRASES.has(word)) reasons.push(`「${word}」意象消极`);
  const cautions: string[] = [];
  for (const c of word) {
    const cat = avoidCategoryOf(c);
    if (cat) reasons.push(`「${c}」属${cat}`);
    else if (CAUTION_SET.has(c)) cautions.push(`「${c}」需看搭配`);
  }
  return { ok: reasons.length === 0, reasons, cautions, gender: phraseGender(word) };
}

/**
 * ══ 成品清单 ══
 *
 * 对 7,710 条实词性典籍组合逐条过审定层，得 **7,414 条**（剔除 296）。
 * 性别倾向分布：男 233 / 女 480 / 中性 6,701。
 *
 * 中性占绝大多数不是判据没生效，而是**实情如此**——
 * 千里、东风、明月、相思、江南、春风、流水、梅花 这类本就男女皆宜。
 * 传统上强分男女的其实是少数字（女部、花草玉石 vs 山岳金石志向），
 * 大量好名料落在中间地带。
 *
 * 故本层给的是**倾向而非限制**：取女名时把 female 与 neutral 排前，
 * 而不是把 male 藏起来。
 */
export interface ReviewedPhrase {
  word: string;
  gender: GenderLean;
  cautions: string[];
}

/** 过审定层，返回可用清单（调用方通常再按 gender 排序） */
export function reviewedPhrases(
  phrases: { word: string }[],
  opts: { gender?: GenderLean } = {},
): ReviewedPhrase[] {
  const out: ReviewedPhrase[] = [];
  for (const p of phrases) {
    const r = reviewPhrase(p.word);
    if (!r.ok) continue;
    out.push({ word: p.word, gender: r.gender, cautions: r.cautions });
  }
  if (!opts.gender) return out;
  // 按倾向排序而非过滤：同性优先，中性次之，异性殿后但不剔除
  const rank = (g: GenderLean) => (g === opts.gender ? 0 : g === "neutral" ? 1 : 2);
  return out.sort((a, b) => rank(a.gender) - rank(b.gender));
}

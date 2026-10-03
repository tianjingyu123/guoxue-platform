/**
 * 排盘报告模板（2026-09-17）
 *
 * 改造要点：把「模型自由决定章节结构」改为「平台定结构、模型只填内容」。
 * 这是报告不像普通 AI 的根本区别——格式固定、辨识度统一，内容随盘变化。
 *
 * 段落分两类：
 * - deterministic：由排盘引擎数据直接生成，**不经模型**（盘面速览、起盘校验、大运轴、典籍依据）
 * - 模型填写：只填指定段落的正文、要点与追问，不能新增段、不能改段名
 */

export type SectionKind = "chart" | "provenance" | "structure" | "dimension" | "timeline" | "evidence" | "limits";

export interface ReportSectionTemplate {
  /** 稳定编号，语音问答按此定位「用户哪里没看懂」 */
  id: string;
  title: string;
  kind: SectionKind;
  /** 由引擎数据生成，不交给模型 */
  deterministic?: boolean;
  /** 交给模型时的写作要求（写进提示词） */
  brief?: string;
  /** 本节无内容时隐藏（而不是留空壳） */
  hideWhenEmpty?: boolean;
}

export interface ReportTemplate {
  paipanType: string;
  version: string;
  title: string;
  sections: ReportSectionTemplate[];
}

/** 八字命书模板（七段骨架，分维解读按维度展开为独立小节） */
export const BAZI_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "bazi",
  version: "bazi-tpl-v1",
  title: "小卜命书",
  sections: [
    { id: "s1", title: "盘面速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起盘校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "日主与格局",
      kind: "structure",
      brief: "先说日主是什么、月令是什么、旺衰如何，再说取了什么格、用神喜忌是什么。这是全篇的地基，务必写实。",
    },
    {
      id: "s4",
      title: "性格与心性",
      kind: "dimension",
      brief: "从日主、十神配置、自坐与神煞讲这个人的行事风格与心性特点，落到具体行为，不写空泛褒奖。",
    },
    {
      id: "s5",
      title: "事业与求财",
      kind: "dimension",
      brief: "从官杀、财星、食伤的配置讲适合的做事方式与发力方向，说清楚什么情况下顺、什么情况下容易受阻。",
    },
    {
      id: "s6",
      title: "财富结构",
      kind: "dimension",
      brief: "讲财星的旺衰与位置、身财是否相称、财来财去的规律；不预测具体数额，不给投资建议。",
    },
    {
      id: "s7",
      title: "婚姻与六亲",
      kind: "dimension",
      brief: "从配偶星、配偶宫与六亲十神讲相处模式与需要留意的地方；不下「离」「不离」这类确定性结论。",
    },
    {
      id: "s8",
      title: "身心与健康",
      kind: "dimension",
      brief: "从五行偏枯、刑冲与神煞讲传统命理视角的体质倾向与作息建议；必须提示以医生意见为准，不做疾病判断。",
      hideWhenEmpty: true,
    },
    {
      id: "s9",
      title: "大运节奏",
      kind: "timeline",
      brief: "以当前所在大运为锚点，讲这一步运的主题、与原局的作用关系，以及前后两步运的转折点。",
    },
    { id: "s10", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s11", title: "局限与建议", kind: "limits", brief: "写清楚本报告没覆盖什么、哪些地方各派看法不同，再给两三条能落地的建议。" },
  ],
};

/**
 * 六爻卦书模板。
 *
 * 六爻是「一事一断」：不像八字铺开讲一生，而是围绕所问这一件事，
 * 从取用神一路推到应期与结论。因此维度与八字完全不同。
 */
export const LIUYAO_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "liuyao",
  version: "liuyao-tpl-v1",
  title: "小卜卦书",
  sections: [
    { id: "s1", title: "卦面速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起卦校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "用神与世应",
      kind: "structure",
      brief:
        "先按所问之事取定用神（问财取妻财、问功名取官鬼、问文书取父母、问子女取子孙、问兄弟朋友取兄弟），说明为什么这样取；再讲世爻代表求测人的处境、应爻代表对方或事体，以及世应之间的生克关系。所问不明确时，说明按哪种常见情形取用。",
    },
    {
      id: "s4",
      title: "旺衰与生克",
      kind: "dimension",
      brief: "以月建、日辰为准判用神与世爻的旺衰（得令/受克/得生/入墓/逢空），再看卦中其他爻对它的生克。讲清楚力量从哪来、被什么挡住。",
    },
    {
      id: "s5",
      title: "动变与忌神",
      kind: "dimension",
      brief: "讲动爻带来的变化：动爻生克谁、变爻回头生还是回头克、有无忌神发动、有无伏神。静卦则说明静卦的看法。",
      hideWhenEmpty: true,
    },
    {
      id: "s6",
      title: "应期",
      kind: "timeline",
      brief: "按传统取应期的思路（逢值逢合、出空填实、冲实之日等）给出时间范围，并说明是按哪条思路推的。给区间不给确定日期，说明这是推断不是保证。",
    },
    {
      id: "s7",
      title: "断语",
      kind: "dimension",
      brief:
        "回到所问之事给出倾向性结论，说清有利条件与不利条件各是什么。**这是卦象的倾向，不是铁口直断**，必须让用户知道可以自己核对推理链条。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s9", title: "局限与建议", kind: "limits", brief: "写清楚卦象没覆盖到什么、哪里各派看法不同，再给两三条能落地的建议。" },
  ],
};

/**
 * 梅花易数卦书模板。
 *
 * 梅花看体用：体为自己、用为所问，重在五行生克与卦象类象；
 * 互卦看过程、变卦看结果、错综看另一面。与六爻的纳甲装卦是两套路子。
 */
export const MEIHUA_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "meihua",
  version: "meihua-tpl-v1",
  title: "小卜卦书",
  sections: [
    { id: "s1", title: "卦象速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起卦校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "体用与生克",
      kind: "structure",
      brief:
        "先说明体卦与用卦各是什么、为什么这样分（动爻在下卦则上卦为体，反之下卦为体）；再讲体用五行的生克关系对所问之事意味着什么。这是梅花的地基，务必写实。",
    },
    {
      id: "s4",
      title: "卦象类象",
      kind: "dimension",
      brief: "按八卦万物类象解本卦上下卦的象：人物、事物、方位、时令等，落到所问之事上，不堆砌类象词表。",
    },
    {
      id: "s5",
      title: "互卦与过程",
      kind: "dimension",
      brief: "互卦主事情发展的中间过程：讲互卦之象说明中途会经历什么、有什么变数。",
      hideWhenEmpty: true,
    },
    {
      id: "s6",
      title: "变卦与结果",
      kind: "timeline",
      brief: "变卦主结果趋向：讲变卦之象与体用的关系，说明事情大致走向何处。有动爻时结合动爻所在位置讲。",
    },
    {
      id: "s7",
      title: "断语",
      kind: "dimension",
      brief:
        "回到所问之事给出倾向性结论，说清有利与不利各是什么。**这是卦象的倾向，不是铁口直断**，让用户能自己核对推理链条。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s9", title: "局限与建议", kind: "limits", brief: "写清楚卦象没覆盖到什么、哪里各派看法不同，再给两三条能落地的建议。" },
  ],
};

/**
 * 奇门遁甲局书模板。
 *
 * 奇门看「用神落宫」：按所问之事取用神，看它落哪一宫、门星神怎么配，
 * 有无门迫入墓击刑，再定方位与时机。比六爻梅花多一个「方位」维度。
 */
export const QIMEN_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "qimen",
  version: "qimen-tpl-v1",
  title: "小卜局书",
  sections: [
    { id: "s1", title: "局面速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起局校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "用神与落宫",
      kind: "structure",
      brief:
        "先按所问之事取定用神（求财取生门与日干、问官取开门与值符、问人取对应人元、出行取马星等），说明为什么这样取；再讲用神落在哪一宫、该宫的门星神配置如何。这是全局的地基。",
    },
    {
      id: "s4",
      title: "格局吉凶",
      kind: "dimension",
      brief: "讲天盘干与地盘干相临的十干克应、八门九星的吉凶配合；有门迫、入墓、击刑、空亡的要逐条点名说明影响，没有就说没有。",
    },
    {
      id: "s5",
      title: "方位取用",
      kind: "dimension",
      brief: "按吉门吉星所落之宫给出可用方位（说明是哪一宫、对应哪个方向），以及需要回避的方位。方位是奇门特有的用法，务必落到具体方向。",
    },
    {
      id: "s6",
      title: "时机与应期",
      kind: "timeline",
      brief: "按值使门的运行、马星与空亡的出空填实等思路给出时间范围，说明是按哪条思路推的。给区间不给确定日期。",
    },
    {
      id: "s7",
      title: "断语",
      kind: "dimension",
      brief:
        "回到所问之事给出倾向性结论，说清有利与不利各是什么。**这是局象的倾向，不是铁口直断**，让用户能自己核对推理链条。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s9", title: "局限与建议", kind: "limits", brief: "写清楚局象没覆盖到什么、哪里各派看法不同（转盘飞盘分歧尤其要说），再给两三条能落地的建议。" },
  ],
};

/**
 * 大六壬课书模板。
 *
 * 六壬的路子：月将加时起天盘 → 四课 → 按九宗门取三传 → 看天将与年命 → 断。
 * 三传的递进（初→中→末）就是事情的来龙去脉，这是六壬最有特色的地方。
 */
export const DALIUREN_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "daliuren",
  version: "daliuren-tpl-v1",
  title: "小卜课书",
  sections: [
    { id: "s1", title: "课体速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起课校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "四课与取传",
      kind: "structure",
      brief:
        "先讲四课各自的上下神关系（一课日干、二课日支、三四课由此推出），再说明本课按九宗门中的哪一门取传、为什么这样取。取课过程要讲清楚，让用户能自己核对。",
    },
    {
      id: "s4",
      title: "三传递进",
      kind: "dimension",
      brief:
        "三传是事情的来龙去脉：初传主事之初与起因，中传主中间过程，末传主结果归宿。逐传讲其地支、遁干、六亲与所乘天将，再串成一条线说明事态如何演变。",
    },
    {
      id: "s5",
      title: "天将与神煞",
      kind: "dimension",
      brief: "讲贵人昼夜、三传与四课上所乘天将的含义（贵人主提携、青龙主财喜、白虎主凶讯、玄武主暗昧等），落到所问之事上。无神煞则说明没有。",
      hideWhenEmpty: true,
    },
    {
      id: "s6",
      title: "应期",
      kind: "timeline",
      brief: "按传统取应期思路（末传所值、旬空出空、天将值日等）给出时间范围，说明是按哪条思路推的。给区间不给确定日期。",
    },
    {
      id: "s7",
      title: "断语",
      kind: "dimension",
      brief:
        "回到所问之事给出倾向性结论，说清有利与不利各是什么。**这是课象的倾向，不是铁口直断**，让用户能自己核对推理链条。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s9", title: "局限与建议", kind: "limits", brief: "写清楚课象没覆盖到什么、哪里各派看法不同，再给两三条能落地的建议。" },
  ],
};

/**
 * 紫微命书模板。
 *
 * 紫微与八字是两套语言：八字论干支旺衰，紫微论星曜落宫。
 * 全篇的骨架是「十二宫 + 三方四正 + 四化」，因此维度按宫位分，不按十神分。
 * 大限流年也不同于八字大运：以宫为单位一宫十年，还要看四化飞入哪一宫。
 */
export const ZIWEI_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "ziwei",
  version: "ziwei-tpl-v1",
  title: "小卜命书（紫微）",
  sections: [
    { id: "s1", title: "盘面速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起盘校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "命宫与主星",
      kind: "structure",
      brief:
        "先说命宫落在哪一宫、坐了哪些主星（无主星则说明借对宫），五行局是什么，星曜的吉凶属性如何。这是全篇的地基：后面每一段都要回到这里，不能各说各的。" +
        "**本盘未计算星曜庙旺利陷，不得凭空断庙陷**——要讲亮度差异时，只能说明这一项本报告没有数据。",
    },
    {
      id: "s4",
      title: "身宫与命身关系",
      kind: "structure",
      brief:
        "讲身宫落在十二宫的哪一宫、代表这个人后天用力的方向，再讲它与命宫的关系（同宫、三合、对照还是不相干）。说清楚「命是本性、身是后天着力处」这层区别，别把两者混着讲。",
    },
    {
      id: "s5",
      title: "三方四正",
      kind: "structure",
      brief:
        "命宫的三方四正（财帛、官禄、迁移）合起来看格局的成色：吉星拱照还是煞星冲会，是不是成格、破格。要具体指出是哪颗星在哪一宫起的作用，不要只给结论。",
    },
    {
      id: "s6",
      title: "生年四化",
      kind: "dimension",
      brief:
        "讲生年四化（禄权科忌）各落在哪一宫、代表什么：禄在哪里得力、权在哪里掌事、科在哪里有名、忌在哪里牵绊。化忌所在是全盘最要留意的地方，要讲清楚它的影响路径，但不能说成灾祸。",
    },
    {
      id: "s7",
      title: "事业与财帛",
      kind: "dimension",
      brief:
        "从官禄宫、财帛宫及其三方四正讲适合的做事方式与求财路数（是稳守还是开创、靠专业还是靠人脉）。说清楚顺在哪里、容易卡在哪里；不预测数额，不给投资建议。",
    },
    {
      id: "s8",
      title: "六亲与感情",
      kind: "dimension",
      brief:
        "从夫妻、父母、兄弟、子女四宫讲相处模式与需要留意的地方。夫妻宫只讲相处方式与课题，**不下「离」「不离」这类确定性结论**。",
    },
    {
      id: "s9",
      title: "疾厄与福德",
      kind: "dimension",
      brief:
        "从疾厄宫讲传统命理视角的体质倾向，从福德宫讲心性与精神状态、享受与操心的来源。**必须提示以医生意见为准**，不做疾病判断。",
      hideWhenEmpty: true,
    },
    {
      id: "s10",
      title: "大限节奏",
      kind: "timeline",
      brief:
        "以当前所在大限为锚点，讲这一限走到哪一宫、该宫的星曜与四化带来什么主题，以及前后两限的转折。紫微一限十年，要说清楚起讫年龄。",
    },
    { id: "s11", title: "典籍依据", kind: "evidence", deterministic: true },
    { id: "s12", title: "局限与建议", kind: "limits", brief: "写清楚本报告没覆盖什么、哪些地方各派（三合派、飞星派、中州派）看法不同，再给两三条能落地的建议。" },
  ],
};

/**
 * 阳盘命理奇门·命书模板。
 *
 * 与时家奇门局书是两回事，所以不共用模板：
 * 局书一事一断，重方位与时机；**阳盘命理看的是一生**——以出生时刻起局，
 * 九宫各配一块人事（事业、婚姻、父母、兄弟…），再顺着四柱大运看各阶段。
 * 所以这里有「九宫人事」与「大运阶段」两节，是局书没有的；
 * 反过来局书的「方位取用」在这里就不合适——看一生不必天天挑方位。
 */
export const YANGPAN_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "yangpan",
  version: "yangpan-tpl-v1",
  title: "小卜命书",
  sections: [
    { id: "s1", title: "盘面速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起局校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "日干与格局",
      kind: "structure",
      brief:
        "阳盘命理以日干为自身，先说日干落在哪一宫、该宫门星神如何，这决定了这个人的底色；再结合四柱的格局与旺衰讲他的基本路数。这一节是地基，后面各节都要回到它。",
    },
    {
      id: "s4",
      title: "九宫人事",
      kind: "dimension",
      brief:
        "九宫在阳盘命理里各主一块人事（坎一事业智慧、坤二母亲助力、震三兄弟行动、巽四婚姻人际、乾六父亲贵人、兑七口舌享受、艮八少年家产、离九名声文书）。挑盘面上配置最鲜明的三到四宫来讲，说清是门星神哪一处让它鲜明，不要九宫平铺。",
    },
    {
      id: "s5",
      title: "事业与财",
      kind: "dimension",
      brief: "结合日干落宫、生门与财星所在讲适合的路数与取财方式；身弱财旺、或财被他宫所制的，要说清难在哪里、怎么补。",
    },
    {
      id: "s6",
      title: "婚姻与六亲",
      kind: "dimension",
      brief: "看巽四宫与配偶星、乾六与坤二对应父母。讲关系的样子与相处要留意的地方，不做吉凶断言，更不预言离合。",
    },
    {
      id: "s7",
      title: "大运阶段",
      kind: "timeline",
      brief:
        "按四柱大运的顺逆与当前所处大运，讲人生各阶段的重心变化，重点说清当前这一步大运在做什么功、宜守宜进。给阶段不给具体年份的吉凶断言。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    {
      id: "s9",
      title: "局限与建议",
      kind: "limits",
      brief: "阳盘命理是近现代形成的体系，各家起局与配宫并不统一，这一点要如实说明；再给两三条能落地的建议。",
    },
  ],
};

/**
 * 小六壬课书模板。
 *
 * 小六壬的路子最短：月上起、数到日、再数到时，落宫即断。
 * 所以章节也按这条线走——先把三宫摆出来（月宫来路、日宫事情、时宫落点），
 * 再逐层讲落点、取象、应期。它是问急事的工具，不做一生论断，
 * 「局限与建议」一节要把这一点说清楚。
 */
export const XIAOLIUREN_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "xiaoliuren",
  version: "xiaoliuren-tpl-v1",
  title: "小卜课书",
  sections: [
    { id: "s1", title: "六宫速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起课校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "三宫这条线",
      kind: "structure",
      brief:
        "按月宫（来路与背景）、日宫（事情本身当下的样子）、时宫（落点与结果，也是问卦人自己）的顺序讲成一条线：这件事因什么起、现在卡在哪、最后落到哪。三宫要连起来读，不要各说各的。",
    },
    {
      id: "s4",
      title: "落点断语",
      kind: "dimension",
      brief:
        "以时宫为重心给出结论：落在这一宫意味着什么、事情是成是缓是空。结论要明确，同时说清它的条件（日宫是否有力、是否逢旬空）。**不要只报一个宫名就完事**。",
    },
    {
      id: "s5",
      title: "取象与牵涉",
      kind: "dimension",
      brief: "用六神说事情的气质（青龙正事、朱雀口舌文书、白虎急猛、玄武暗昧等），用日宫六亲说牵涉的人与物（妻财钱物、官鬼压力公事、父母文书长辈）。落到具体事情上讲，不堆术语。",
    },
    {
      id: "s6",
      title: "时机与应期",
      kind: "timeline",
      brief: "按落点宫的快慢之性（速喜快、留连迟、大安静）与旬空出空的时点给出时间范围。给区间不给确定日期。",
    },
    {
      id: "s7",
      title: "该怎么做",
      kind: "dimension",
      brief: "由上面推出两三条能马上落地的做法——该催还是该等、该把什么讲清楚、该核实什么。小六壬问的是眼下这一步怎么走，这一节最实用。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    {
      id: "s9",
      title: "局限与建议",
      kind: "limits",
      brief: "说清小六壬的适用边界：它是问急事、问方向的工具，六宫分类粗，**不做一生论断、不判生死吉凶**；同一课不宜反复起、反复问。",
    },
  ],
};

/**
 * 玄空飞星·宅书模板。
 *
 * 与其余九个工具最大的不同：**断的是房子不是人**，所以结论要落在方位与用途上。
 * 「方位分工」是全篇最实用的一节——同一间屋子，不同方位适合放床、放书桌、放灶的位置不同，
 * 这是不用花钱就能调整的部分。
 * 「局限与建议」必须写清两件事：看不到现场形峦、以及不断生死病苦不劝拆改。
 */
export const XUANKONG_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "xuankong",
  version: "xuankong-tpl-v1",
  title: "小卜宅书",
  sections: [
    { id: "s1", title: "飞星盘速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起盘校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "元运与格局",
      kind: "structure",
      brief:
        "先说这是几运的宅、当令旺星是哪一颗；再讲成立的格局（旺山旺向／上山下水／双星到向等）意味着什么。若建造运与当前运不同，要明确提醒宅运已换、需按当前运重新看方位。",
    },
    {
      id: "s4",
      title: "方位分工",
      kind: "dimension",
      brief:
        "全篇最实用的一节：逐个讲当令旺星、生气星所到之方适合做什么（主卧、书房、工作区、客厅），失令凶星所到之方宜静宜少用。**一律落到具体方向**（正南、西北…），给的是起居与用途安排，不是拆改。",
    },
    {
      id: "s5",
      title: "各宫星曜组合",
      kind: "dimension",
      brief: "挑盘面上最鲜明的三到四宫讲星曜组合的含义，不要九宫平铺。凶星组合只说「此方位近期宜静、不宜久坐久卧」一类的用法，**不得据此预言疾病、灾祸与寿夭**。",
    },
    {
      id: "s6",
      title: "可以怎么调整",
      kind: "dimension",
      brief: "给两三条能马上做的调整——挪床、换书桌朝向、调整房间用途、某方位少堆杂物。**不得建议拆改结构，不得推荐任何风水物件或商品**。",
    },
    { id: "s7", title: "典籍依据", kind: "evidence", deterministic: true },
    {
      id: "s8",
      title: "局限与建议",
      kind: "limits",
      brief:
        "必须写清两点：一是本报告只拿到坐向与年份，**看不到现场的门窗、路水与周边形势**，而理气不离形峦，定案要靠实地勘察；二是玄空断的是环境对人的助与损，**不断人的生死病苦**。再给一两条实际建议。",
    },
  ],
};

/**
 * 八宅宅书模板（2026-09-19，第 12 个工具）。
 *
 * 八宅与玄空同是看宅，但抓手不同：玄空按元运飞星，宅运二十年一变；
 * 八宅按坐山与命卦翻卦定八方，**一个人的命卦终身不变**。
 * 所以八宅报告有个玄空没有的层次——**宅盘管房子、命盘管人**，两套都要出：
 * 宅盘定门主灶的位置，命盘定这个人该朝哪边坐、哪间房住着顺。
 *
 * 红线与玄空一致，而且更要紧——八宅的凶星名字格外吓人（绝命、五鬼、六煞），
 * 民间拿它吓人卖货的也最多：
 * 1. **不拿方位断生死病苦**。「绝命」说的是这个方位不宜久居，不是断人绝嗣。
 * 2. **不劝拆改、不荐商品**。能给的都是挪床、调房间用途这类不花钱的做法。
 */
export const BAZHAI_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "bazhai",
  version: "bazhai-tpl-v1",
  title: "小卜宅书",
  sections: [
    { id: "s1", title: "八方速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起盘校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "命卦与宅卦",
      kind: "structure",
      brief:
        "先讲清两件事：这个人是什么命卦（东四命还是西四命，命卦终身不变），这处房子是什么宅卦（由坐山定）。再说宅命相配与否意味着什么。**相配不等于万事大吉、不配也不等于必须搬家**——不配的处理办法是按命卦吉方安排起居，这一点要说明白，不要制造焦虑。",
    },
    {
      id: "s4",
      title: "宅盘：房子的方位分工",
      kind: "dimension",
      brief:
        "以坐山起游星，逐方讲这处房子哪边宜做什么。四吉方（生气／天医／延年／伏位）各有侧重：生气主进取宜大门书房、天医主健康宜卧房、延年主和睦宜主卧客厅、伏位主安稳宜静室。四凶方讲的是「此方宜静、宜作储藏卫浴」，**一律落到具体方向**（正北、东南…）。",
    },
    {
      id: "s5",
      title: "命盘：这个人的吉方",
      kind: "dimension",
      brief:
        "这一节是八宅最实用、也最容易被漏掉的部分：以**命卦**起游星，得出这个人自己的四吉四凶方。讲清楚他该朝哪个方向坐（办公、书桌）、床头宜朝哪边、哪几个方位待久了不舒服。与宅盘对照——**两盘都吉的方位最值得用**，宅盘吉而命盘凶的方位则因人而异。",
    },
    {
      id: "s6",
      title: "门主灶怎么安",
      kind: "dimension",
      brief:
        "《阳宅三要》的门、主、灶：大门宜开吉方纳气、主卧宜安吉方、灶位则讲究「坐凶向吉」（灶压凶方而灶口朝吉方）。按盘面给出具体方位，并说明现有格局若与此不符该怎么折中——**只谈家具与用途的调整，不得建议拆改结构、开凿门窗**。",
    },
    { id: "s7", title: "典籍依据", kind: "evidence", deterministic: true },
    {
      id: "s8",
      title: "局限与建议",
      kind: "limits",
      brief:
        "必须写清三点：一是本报告只拿到坐向与生年，**看不到户型、门窗位置与周边形势**，而八宅同样讲究形理兼察；二是八宅只是阳宅理气的一支，与玄空飞星各有讲法，**结论不同是流派差异，不是谁算错了**；三是绝命、五鬼一类凶星名字虽重，讲的是方位宜忌，**本报告不据此预言疾病、灾祸与寿夭**。再给一两条能马上做的建议。",
    },
  ],
};

/**
 * 阴盘奇门课书模板（2026-09-19 第 13 个工具）。
 *
 * 章节顺着取象直读的次序走：先交代起局（阴盘定局掌上可算，取数要摊开让用户自验）、
 * 再锁用神、再逐符取象、再用四害与生克修正、最后才是断语与可做的调整。
 *
 * 与别的工具最大的不同在 s4：**要把「取了哪一支象意、为什么」写出来**。
 * 取象法的老毛病是「怎么说都能圆」，只有把推理链摊开才压得住；
 * 这也是用户判断这份解读站不站得住的唯一依据。
 */
export const YINPAN_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "qimen-yin",
  version: "yinpan-tpl-v1",
  title: "小卜课书",
  sections: [
    { id: "s1", title: "九宫速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起局校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "用神落在哪里",
      kind: "structure",
      brief:
        "先说清这一卦取的是什么用神、为什么取它（日干为自己是固定的，其余按所问之事取），落在哪一宫、那一宫是什么方位。若所问之事判不出类型，就只讲日干宫，并说明「没听出你具体想问哪一类，先按你自身的状态讲」——不要硬套。",
    },
    {
      id: "s4",
      title: "逐符取象",
      kind: "dimension",
      brief:
        "全篇的重心。把用神宫上的天盘干、地盘干、九星、八门、八神**逐个**读出象意，每一个都要写明「这里取的是哪一支、为什么取这一支」（例：庚在这里取『阻隔』而不取『丈夫』，因为问的是合作不是婚姻）。一个符号只取一支主象，副象可作为「问题可能出在哪」的候选留着。不要把七支象意全铺开凑字数。",
    },
    {
      id: "s5",
      title: "四害与生克修正",
      kind: "dimension",
      brief:
        "查空亡、入墓、击刑、门迫，说明它们怎么改变了上一节的初判——**空亡是变性不是打折**（从「有」翻成「虚」），入墓是「遇而不遇」，击刑是过程拧巴，门迫是外部压力。再比用神宫与相关宫的生克旺衰定力度。逢空亡要按阴盘的做法追一句「八成信息转到哪一宫」。",
    },
    {
      id: "s6",
      title: "这一卦怎么读",
      kind: "dimension",
      brief:
        "把前两节合成两三句能验证的话，落到具体的人、事、时间、方位上，不要说「吉」「凶」这种空话。应期一律给区间并说明依据，**不报单点时间**。最后必须加一句：同一个盘换个人可能读出别的意思，这是取象法的性质，本报告给的是一种读法与依据。",
    },
    {
      id: "s7",
      title: "可以怎么调整",
      kind: "dimension",
      brief:
        "拆补移里只给**不花钱、可逆**的那一路：位置与动线的调整（座位朝向、房间用途、见面与出行方位）、时段选择、某个方位近期少待少堆东西、以及顺着盘象去做的行为建议（如盘面提示「被看见」就多做曝光）。给行为建议时**把世俗层面的理由一并讲出来**，让用户知道不信术数这么做也不亏。**不得推荐任何商品、法器、符咒，不得提供法事或改运服务，不得对辞职、离婚、投资、手术这类不可逆决定给指令性建议。**",
    },
    { id: "s8", title: "依据与出处", kind: "evidence", deterministic: true },
    {
      id: "s9",
      title: "局限与建议",
      kind: "limits",
      brief:
        "必须写清三点：一是阴盘奇门是近二十余年成形的现代体系，**没有来历明确的古籍可依**，关于其传承的说法存在公开争议，本报告照它的方法来排来读，但不称它为古法正宗；二是取象直读靠符号联想与解读者判断，**同一个盘不同的人能读出不同的话**；三是本报告不构成医疗、法律、投资决策的依据，身体上的疑虑一律请就医。再给一两条实际建议。",
    },
  ],
};

/**
 * 金口诀课书模板。
 *
 * 金口诀的路子最快：四位一成、取出用爻即断。所以章节顺着这条线走——
 * 先摆四位、再定用爻、然后讲四位之间的生克与动爻，最后落到「该怎么做」。
 * 它是问急事的工具，「局限与建议」要写清这一点。
 */
export const JINKOUJUE_REPORT_TEMPLATE: ReportTemplate = {
  paipanType: "jinkoujue",
  version: "jinkoujue-tpl-v1",
  title: "小卜课书",
  sections: [
    { id: "s1", title: "四位速览", kind: "chart", deterministic: true },
    { id: "s2", title: "起课校验", kind: "provenance", deterministic: true },
    {
      id: "s3",
      title: "用爻在哪一位",
      kind: "structure",
      brief:
        "先说用爻取在四位的哪一位、为什么这样取（三阳一阴取阴、三阴一阳取阳、二阴二阳取将神、纯阴反取阳、纯阳反取阴），再讲这一位意味着事情的着落处在哪——人元在己、贵神在人、将神在事、地分在环境。这是全篇的地基。",
    },
    {
      id: "s4",
      title: "四位生克",
      kind: "dimension",
      brief:
        "讲人元、贵神、将神、地分之间谁生谁、谁克谁，力从哪来、阻在何处；结合月令旺衰说清力度。**结论的成与不成由这一节定**，不要只报一个吉凶。",
    },
    {
      id: "s5",
      title: "动爻与取象",
      kind: "dimension",
      brief:
        "有动爻就逐条讲（妻动/贼动/鬼动/子动），**说清动的是变化而不是吉凶**，吉凶仍回到四位生克；再用贵神所乘天将与四位神煞说明这件事长什么样、牵涉谁。没有就说没有。",
    },
    {
      id: "s6",
      title: "时机与应期",
      kind: "timeline",
      brief: "按用爻旺衰、旬空出空、动爻所主的时段给出时间范围，说明是按哪条思路推的。给区间不给确定日期。",
    },
    {
      id: "s7",
      title: "该怎么做",
      kind: "dimension",
      brief: "由上面推出两三条能马上落地的做法——该主动还是该等、该求谁、该把什么讲清楚、该防哪一头。金口诀问的是眼下这一步，这一节最实用。",
    },
    { id: "s8", title: "典籍依据", kind: "evidence", deterministic: true },
    {
      id: "s9",
      title: "局限与建议",
      kind: "limits",
      brief: "说清金口诀是问急事、问一事的工具，四位简明故不宜用来论一生；**不断生死、不判灾祸**；同一事不宜反复起课。",
    },
  ],
};

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  bazi: BAZI_REPORT_TEMPLATE,
  liuyao: LIUYAO_REPORT_TEMPLATE,
  meihua: MEIHUA_REPORT_TEMPLATE,
  qimen: QIMEN_REPORT_TEMPLATE,
  yangpan: YANGPAN_REPORT_TEMPLATE,
  xiaoliuren: XIAOLIUREN_REPORT_TEMPLATE,
  xuankong: XUANKONG_REPORT_TEMPLATE,
  bazhai: BAZHAI_REPORT_TEMPLATE,
  jinkoujue: JINKOUJUE_REPORT_TEMPLATE,
  "qimen-yin": YINPAN_REPORT_TEMPLATE,
  daliuren: DALIUREN_REPORT_TEMPLATE,
  ziwei: ZIWEI_REPORT_TEMPLATE,
};

export function getReportTemplate(paipanType: string): ReportTemplate {
  return REPORT_TEMPLATES[paipanType] ?? BAZI_REPORT_TEMPLATE;
}

/** 需要模型填写的段落 */
export function modelSections(tpl: ReportTemplate): ReportSectionTemplate[] {
  return tpl.sections.filter((s) => !s.deterministic);
}

/** 写进提示词的段落清单 */
export function templateBrief(tpl: ReportTemplate): string {
  return modelSections(tpl)
    .map((s) => `${s.id} 【${s.title}】${s.brief ?? ""}`)
    .join("\n");
}

// 算法参考：《卜筮正宗》《增删卜易》《火珠林》
import type {
  LiuYaoDuanGuaInput,
  LiuYaoDuanGuaResult,
  YongShenRule,
  YingQiRule,
  DongYaoRule,
} from "@guoxue/shared";

const YONG_SHEN_RULES: YongShenRule[] = [
  {
    yongShen: "父母爻",
    quFa: "凡测长辈、文书、房屋、车船、雨具等，皆以父母爻为用神。以世应爻位定，与世爻同性之生我者为父母。",
    wangXiang: "父母爻临日月建或得日月生扶为旺。临青龙主喜，临朱雀主文书之喜，临勾陈主房产之喜。",
    xiuQiu: "父母爻被日月克制或休囚无气为衰。临玄武防文书失窃，临螣蛇防契约纠纷，临白虎防长辈疾病。",
    fuCang: "父母爻伏藏于他爻之下，若伏于旺相爻下可出，伏于休囚爻下难出。伏于世爻下为伏于世，主长辈之事与己相关。",
    kongWang: "父母爻值旬空，文书无实、长辈有虚。出空填实之日为应期。若旺相旬空，出空即用；若休囚旬空，填实亦虚。",
    yuePo: "父母爻月破，文书作废、房屋破损、长辈不利。需待出月或逢合之时方可用。若日辰合之，可解月破之困。",
    liangXian: "卦中父母爻两现，取其旺相者为用。一主一辅，旺者为主断。若两爻皆旺，取发动者为用；皆静则取近世爻者。",
  },
  {
    yongShen: "官鬼爻",
    quFa: "凡测官运、诉讼、盗贼、疾病、丈夫等，皆以官鬼爻为用神。克我者为官鬼，阴阳属性不同为正官，相同为偏官。",
    wangXiang: "官鬼爻旺相临青龙主官运亨通，临朱雀主诉讼胜诉，临白虎主实权在握。得日月生扶为真官实权。",
    xiuQiu: "官鬼爻休囚为官运不济、诉讼不利。临螣蛇防暗算陷害，临玄武防官非口舌，临勾陈防牢狱之灾。",
    fuCang: "官鬼爻伏藏，求官者主职位未实，须待冲飞之日方可出仕。伏于妻财爻下主因财失官，伏于子孙爻下主被下属弹劾。",
    kongWang: "官鬼爻旬空，官位不实、疾病将愈、盗贼已逃。求官者见官空主职位虚悬，需待出空。测病见官空主病情好转。",
    yuePo: "官鬼爻月破，丢官罢职、诉讼败诉、疾病危重。宜退守不宜进取，待月破填实或逢合日方可转机。",
    liangXian: "官鬼两现主双重压力或多方势力。测工作主身兼二职或跳槽机会。测病主多种病因。取旺而动者为用，衰而静者为辅。",
  },
  {
    yongShen: "兄弟爻",
    quFa: "凡测兄弟姐妹、同事朋友、竞争对手、破财等，皆以兄弟爻为用神。与我同五行者为兄弟，同阴阳为比肩，异阴阳为劫财。",
    wangXiang: "兄弟爻旺相主朋友相助、团队壮大。但测财运见兄旺主破财竞争加剧。临青龙主好友相助，临玄武防损友欺骗。",
    xiuQiu: "兄弟爻休囚主人际稀少、团队薄弱。测财运见兄弱为竞争者减少。休囚临白虎防兄弟反目，临螣蛇防朋友离间。",
    fuCang: "兄弟爻伏藏主朋友隐匿或竞争对手暗中行动。伏于世爻下主朋友与己有难言之隐，伏于妻财爻下主朋友借钱不还。",
    kongWang: "兄弟爻旬空，团队虚空、竞争消弭。测财运见兄空为无人竞争，利于投资。测合作见兄空主对方诚意不足。",
    yuePo: "兄弟爻月破，朋友离散、团队瓦解。测合伙见兄破主合作伙伴退出。月破之兄临朱雀防朋友反戈一击。",
    liangXian: "兄弟两现主多方竞争或多位朋友。测财运见多兄主竞争激烈利润薄。测合作见多兄主团队庞大但可能内耗。",
  },
  {
    yongShen: "妻财爻",
    quFa: "凡测财运、妻子、物品、粮食等，皆以妻财爻为用神。我克者为妻财，阴阳属性不同为正财，相同为偏财。",
    wangXiang: "妻财爻旺相临青龙主正财丰厚，临朱雀主因文得财，临勾陈主房产田产之财。日月生扶主财源滚滚。",
    xiuQiu: "妻财爻休囚主财运不济、收入减少。休囚临白虎防破财透支，临玄武防财物丢失，临螣蛇防投资被骗。",
    fuCang: "妻财爻伏藏主财不露白或暗财。伏于世爻下主自有积蓄不为人知，伏于官鬼爻下主因官职得暗财，伏于父母爻下主因文书房产得财。",
    kongWang: "妻财爻旬空主财不实、空头支票。旺相旬空出空可得，休囚旬空填实亦虚。测交易见财空主买方无诚意。",
    yuePo: "妻财爻月破，破财亏损、资金断裂。月破之财临玄武防被盗，临白虎防意外破财。待出月逢合方可止亏。",
    liangXian: "妻财两现主双份收入或多处财源。旺相两现为财源广进，休囚两现为多处漏财。取旺且动者为主财源。",
  },
  {
    yongShen: "子孙爻",
    quFa: "凡测子女、晚辈、医药、僧道、宠物等，皆以子孙爻为用神。我生者为子孙，阴阳属性不同为伤官，相同为食神。",
    wangXiang: "子孙爻旺相主子女安康、福气临门。临青龙主子聪慧，临朱雀主子女学业有成。得日月生扶为福神有力解忧消灾。",
    xiuQiu: "子孙爻休囚主子息不利、福气淡薄。休囚临白虎防子女意外，临玄武防子女走失，临螣蛇防子女精神问题。",
    fuCang: "子孙爻伏藏主子女隐匿心事。伏于世爻下主子女依赖心重，伏于官鬼爻下主子女因官非疾病所困，伏于兄弟爻下主子女与同辈纠纷。",
    kongWang: "子孙爻旬空，求子不利、医药无效。测病见子孙空主药不对症。测求子见孙空主时机未到需待填实。",
    yuePo: "子孙爻月破，子女有灾、福气尽失。月破之孙临白虎防堕胎流产，临朱雀防子女辍学。宜祈福化解。",
    liangXian: "子孙两现主子息双全或多福多寿。旺相两现为子女双全，休囚两现为多操心。取旺相有气者为主。",
  },
];

const YING_QI_RULES: YingQiRule[] = [
  {
    type: "逢合应期",
    fangFa: "用神被冲时，逢合之日为应期。如用神值寅被申冲，逢亥日（寅亥合）为应。",
    suYing: "用神旺相被冲，近合之日即应。如寅日用神为申所冲，当日亥时或次日即可应验。",
    chiYing: "用神休囚被冲，需待月合或年合。远则数月，近则数旬。",
    shiLi: "测求职，父母爻申金被日辰寅木冲，亥日（寅亥合）收到offer。",
  },
  {
    type: "逢冲应期",
    fangFa: "用神被合住时，逢冲之日为应期。如用神值寅遇亥合，逢申日（申冲寅）为应。",
    suYing: "用神旺相被合，近冲之日即应。静爻被合住，冲日即可开库用神。",
    chiYing: "用神休囚被合，需待月冲年冲。动爻被日合住，亦待冲开之日。",
    shiLi: "测出行，世爻被日辰合住，冲日（解除合绊之日）出发。",
  },
  {
    type: "出空应期",
    fangFa: "用神值旬空，出空填实之日为应期。甲子旬中戌亥空，逢戌亥日出空。",
    suYing: "用神旺相旬空，当值之日即应。如戌亥空见戌日即填实可用。",
    chiYing: "用神休囚旬空，虽出空亦无力，需待生扶之日月。",
    shiLi: "测收款，妻财爻旬空，出空之日到账。若休囚则虽出空金额也不大。",
  },
  {
    type: "逢值应期",
    fangFa: "用神伏藏或安静不动，逢值日（用神当值之日）为应期。如用神寅静伏，逢寅日出伏为应。",
    suYing: "用神临日月建而静，当日当下即可应验。",
    chiYing: "用神休囚伏藏深远，需待旺相之月值日方出。",
    shiLi: "测升职，官鬼爻安静伏藏，寅月寅日（官鬼值日）升职。",
  },
  {
    type: "塞墓应期",
    fangFa: "用神入墓时，冲墓之日为应期。如用神入辰墓，逢戌日（戌冲辰）开墓为应。",
    suYing: "用神旺相入墓，近期冲墓之日即出。旺相入墓为暂时困顿，冲之即开。",
    chiYing: "用神休囚入墓，为深陷困境，需待生扶之月或冲墓之年。",
    shiLi: "测病情，世爻入墓于辰，戌日（冲辰）病情好转。",
  },
  {
    type: "独发应期",
    fangFa: "卦中唯有一爻发动，以此动爻定应期。动爻值日为应，或动爻变爻值日为应。",
    suYing: "动爻旺相临日月，当日或次日即应。独发主事情单纯明朗。",
    chiYing: "动爻休囚或化回头克，应期延迟。动爻变回头合，亦延迟。",
    shiLi: "测考试，唯官鬼爻动，官鬼值日放榜，或变爻值日出成绩。",
  },
  {
    type: "回头生克应期",
    fangFa: "用神动化回头生或回头克，以变爻值日为应期。回头生主先难后易，回头克主先易后难。",
    suYing: "回头生临日月，近期即应且为吉。回头克临日月，近期即应且为凶需速化解。",
    chiYing: "回头生休囚，延迟但终吉。回头克休囚，延迟但终凶。",
    shiLi: "测投资，妻财动化回头生（子动生财），变爻值日获利。",
  },
  {
    type: "三合局应期",
    fangFa: "卦中形成三合局，以中神（三合局中间之字）值日为应期。如申子辰三合水局，子日（中神）为应。",
    suYing: "三合局中有动爻临日月，近期中神值日即应。三合缺一字，逢缺字之日填实亦应。",
    chiYing: "三合局三爻皆静，须待冲动之日或月中神值日方应。",
    shiLi: "测合作，卦成申子辰三合财局，子日签订合作协议。",
  },
];

const DONG_YAO_RULES: DongYaoRule[] = [
  {
    count: 0,
    duanFa: "六爻安静，以本卦卦辞断事。看世应用神关系，静则事缓但稳。宜看卦象与用神旺衰综合判断。",
    bianYao: "无变爻，以本卦六爻之生克冲合论吉凶。静爻之间生克论六亲生克关系。",
    shengKe: "静爻之间以生为主断，世应关系为核心。世生应为我益彼，应生世为彼益我。",
    tiYong: "以世爻为体为我方，以应爻为用为对方。体用相生为吉，体用相克为凶。",
  },
  {
    count: 1,
    duanFa: "一爻独发，以此动爻为主断。动爻变出之爻为辅。动爻为事之主因，变爻为事之结果。观动爻与世应用神之关系。",
    bianYao: "本卦动爻之一变出之爻。变爻回头生为吉，回头克为凶。变爻与本爻论进退。",
    shengKe: "动爻能生克他爻，他爻不能生克动爻。动爻为主动方，静爻为被动方。",
    tiYong: "动爻为体则主动变化，动爻为用则外界变化。体动主我变，用动主外变。",
  },
  {
    count: 2,
    duanFa: "两爻发动，以上爻为主下爻为辅。两动相生为顺，相克为逆。两动爻与世应形成三合最吉。",
    bianYao: "两爻各有变爻，以动爻之变爻论其结果。两者变爻亦可互参互证。",
    shengKe: "两动爻之间，先动着为主后动着为辅。动着之间生克关系论吉凶先后。",
    tiYong: "两动分属体用，体动我变、用动外变，两者互动论事态发展。",
  },
  {
    count: 3,
    duanFa: "三爻发动，事态复杂多变。三动之间成一气相生为吉，成一气相克为凶。三动若能成三合局，吉凶倍增。",
    bianYao: "三爻各有变爻，形成多线发展。以世应之动爻为主线，他爻为辅线。",
    shengKe: "三爻互动复杂，以世爻动爻为核心分析生克链条。循环相生最吉，循环相克最凶。",
    tiYong: "三动分体用，体动多主内部变化纷繁，用动多主外部事件纷至沓来。",
  },
  {
    count: 4,
    duanFa: "四爻发动，事有反复动荡不安。宜观四动爻中是否有合局（三合/六合），有合局则乱中有序。取旺相发动者为主要断事依据。",
    bianYao: "四爻变出四变爻，为重大变革之象。变爻之间亦论生克冲合，不可忽视。",
    shengKe: "四动爻中旺相者定主趋势，休囚者为伴随事件。生多克少为吉，克多生少为凶。",
    tiYong: "四动中体用各半为内外交困，体多动主内部问题多，用多动主外部压力大。",
  },
  {
    count: 5,
    duanFa: "五爻发动，大局将定唯有一线变数。以静爻为关键，静爻所在之位即为变数所在。五动之势如箭在弦，不可逆转。",
    bianYao: "五爻变出五变爻，形势剧变之象。唯一静爻之卦位即为定海神针，其与世应关系定最终吉凶。",
    shengKe: "五动爻之势如排山倒海，唯静爻之位可控大局。静爻受生为吉，受克为凶。",
    tiYong: "五动中定体或用之属，静爻若为世爻则我为主控，静爻若为应爻则对方主控。",
  },
  {
    count: 6,
    duanFa: "六爻全动，天翻地覆之大变局。以本卦变卦对照来看，本卦为始变卦为终。六爻全动为乾坤大挪移之象，非大吉即大凶。",
    bianYao: "六爻全变形成之卦（变卦），以变卦卦辞为主断。本卦为因果，变卦为结局。",
    shengKe: "六爻全动，生克关系以变卦之六爻重新论定。本卦生变卦为进化吉象，本卦克变卦为退步凶象。",
    tiYong: "六爻全动，体用关系全盘重新洗牌。观变卦之世应关系论最后结局。",
  },
];

const ZHAN_SHI_ADVICE: Record<string, { yongShen: string; jiShen: string; xiongShen: string; duanYu: string }> = {
  "求财": { yongShen: "妻财爻", jiShen: "子孙爻（财源）", xiongShen: "兄弟爻（劫财）", duanYu: "财旺有源则财源广进，兄动克财防破财。子孙动而生财为最佳，财爻持世求财易得。" },
  "官运": { yongShen: "官鬼爻", jiShen: "妻财爻（官之原神）", xiongShen: "子孙爻（剥官）", duanYu: "官旺财动则名利双收，子动克官防丢官。官爻持世利于仕途，应爻生世得上司赏识。" },
  "婚姻": { yongShen: "妻财爻(女)/官鬼爻(男)", jiShen: "父母爻（主婚书）", xiongShen: "兄弟爻（竞争者）", duanYu: "财官旺相相生则良缘天成，世应相合为佳。兄动防第三者插足，应爻旬空主对方无意。" },
  "疾病": { yongShen: "官鬼爻（病）", jiShen: "子孙爻（医药）", xiongShen: "妻财爻（忌神）", duanYu: "子旺克官则药到病除，官旺子弱则病情沉重。世爻旺相病易愈，世爻入墓防危险。" },
  "出行": { yongShen: "世爻", jiShen: "子孙爻（平安）", xiongShen: "官鬼爻（灾祸）", duanYu: "世旺动则出行顺利，官动克世防路遇灾祸。应生世则到达顺利，世克应防迷路走失。" },
  "失物": { yongShen: "妻财爻(财物)/父母爻(文书)", jiShen: "子孙爻", xiongShen: "兄弟爻（盗贼）", duanYu: "用神旺相失物可寻，用神伏藏需仔细查找。兄动克财防被盗，官动制兄可追回。" },
  "考试": { yongShen: "父母爻（成绩）", jiShen: "官鬼爻（功名）", xiongShen: "妻财爻（克文书）", duanYu: "父旺官动则文星高照，金榜题名。父母持世考运佳，官爻生世功名可就。" },
  "词讼": { yongShen: "世爻（己方）/应爻（对方）", jiShen: "官鬼爻（判决）", xiongShen: "兄弟爻（破财）", duanYu: "世克应为我胜，应克世为彼胜。官爻生世判我赢，官爻克世判我输。" },
  "胎产": { yongShen: "子孙爻", jiShen: "父母爻（保护）", xiongShen: "官鬼爻（产厄）", duanYu: "子孙旺相胎孕平安，子孙动而临日月生产顺利。官动克孙防难产，父动克孙防流产。" },
  "行人": { yongShen: "世爻（我）/应爻（行人）", jiShen: "子孙爻", xiongShen: "官鬼爻（阻隔）", duanYu: "应爻动而来生世，行人即归。应静不来，待冲应之日可归。官动克应防途中受阻。" },
};

function buildAnalysis(
  yongShenType: string | undefined,
  zhanShi: string | undefined,
  dongYaoCount: number | undefined,
  yongShenRule: YongShenRule | null,
  dongYaoRule: DongYaoRule | null,
): string {
  const parts: string[] = [];

  if (yongShenRule) {
    parts.push(`用神「${yongShenRule.yongShen}」：${yongShenRule.quFa}。旺相则${yongShenRule.wangXiang}；休囚则${yongShenRule.xiuQiu}。`);
  }
  if (zhanShi && ZHAN_SHI_ADVICE[zhanShi]) {
    const adv = ZHAN_SHI_ADVICE[zhanShi];
    parts.push(`占「${zhanShi}」以${adv.yongShen}为用神，${adv.jiShen}为吉神，${adv.xiongShen}为凶神。${adv.duanYu}`);
  }
  if (dongYaoRule) {
    parts.push(`动爻${dongYaoRule.count}爻：${dongYaoRule.duanFa}`);
  }
  if (!yongShenType && !zhanShi && dongYaoCount === undefined) {
    parts.push("六爻断卦以用神为核心、应期为关键、动变为线索。请选取用神类型、占事类别或动爻数以获取针对性断卦技法。");
  }

  return parts.join(" ");
}

export function calculateLiuYaoDuanGua(input: Record<string, unknown>): LiuYaoDuanGuaResult {
  const { yongShenType, zhanShi, dongYaoCount } = input as LiuYaoDuanGuaInput;

  const yongShenRule = yongShenType
    ? YONG_SHEN_RULES.find(r => r.yongShen.includes(yongShenType)) || null
    : null;

  const dongYaoRule = dongYaoCount !== undefined
    ? DONG_YAO_RULES.find(r => r.count === dongYaoCount) || null
    : null;

  const zhanShiAdvice = zhanShi ? { type: zhanShi, ...ZHAN_SHI_ADVICE[zhanShi] } : null;

  // Box-drawing 结构化总结
  const ysName = yongShenRule?.yongShen || "未指定";
  const dyName = dongYaoRule ? `${dongYaoRule.count}爻发动` : "未指定";
  const zsName = zhanShi || "未指定";
  const adviceText = zhanShiAdvice ? zhanShiAdvice.duanYu.slice(0, 36) : "请选择用神/占事/动爻数以获取断卦指导";
  const yingQiCount = YING_QI_RULES.length;

  const summary = [
    "┌──────────────────────────────────────┐",
    "│     六爻断卦 · 用神应期动变技法       │",
    "├──────────────────────────────────────┤",
    "│ 用神：" + ysName.padEnd(29) + "│",
    "│ 动爻：" + dyName.padEnd(29) + "│",
    "│ 占事：" + zsName.padEnd(29) + "│",
    "│ 断语：" + adviceText.padEnd(29) + "│",
    "├──────────────────────────────────────┤",
    "│ 用神规则库：" + String(YONG_SHEN_RULES.length) + "类（父母/官鬼/兄弟/妻财/子孙）" + " ".repeat(5) + "│",
    "│ 应期规则库：" + yingQiCount + "法（合冲破墓值独发回头三合）" + " ".repeat(5) + "│",
    "│ 动爻规则库：" + String(DONG_YAO_RULES.length) + "级（0-6爻全动各论）" + " ".repeat(10) + "│",
    "│ 占事速查：" + String(Object.keys(ZHAN_SHI_ADVICE).length) + "类（求财/官运/婚姻/疾病/出行...）" + " ".repeat(3) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《卜筮正宗》清·王洪绪著        │",
    "│ 参校：《增删卜易》野鹤老人著          │",
    "│ 《火珠林》麻衣道者传世古法            │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    yongShenRule,
    yingQiRule: YING_QI_RULES,
    dongYaoRule,
    zhanShiAdvice,
    allYongShenRules: YONG_SHEN_RULES,
    allDongYaoRules: DONG_YAO_RULES,
    analysis: buildAnalysis(yongShenType, zhanShi, dongYaoCount, yongShenRule, dongYaoRule),
    summary,
  } as LiuYaoDuanGuaResult & { summary: string };
}

// ── 梅花断卦体用进阶计算引擎 ──
// 算法参考：《梅花易数》《易学启蒙》《周易尚氏学》
// 基于体用生克、三卦互参、万物类象进行综合断卦

// ── 本地类型 ──
interface TiYongInfo { tiGua: string; yongGua: string; tiYongRelation: string; level: string; generalMeaning: string; }
interface MeiHuaGuaXiangDetail { position: string; guaName: string; guaXiang: string; wuXing: string; meaning: string; }
interface ShengKeItem { from: string; to: string; relation: string; meaning: string; }
interface DuanGuaTip { scenario: string; principle: string; example: string; }
interface MeiHuaDuanGuaResult {
  tiYongAnalysis: TiYongInfo;
  guaXiangAnalysis: MeiHuaGuaXiangDetail[];
  shengKeChain: ShengKeItem[];
  duanGuaTips: DuanGuaTip[];
  summary: string;
  wanWuLeiXiang?: WanWuLeiXiang[];
}
interface WanWuLeiXiang {
  gua: string; xiang: string; wuXing: string; direction: string; season: string;
  color: string; number: string; taste: string; animal: string; body: string;
  people: string; place: string; thing: string; weather: string; nature: string;
  jiXiong: string;
}

// ── 万物类象数据库 ──
// 来源：《梅花易数·八卦万物类象》《周易·说卦传》
const WAN_WU_LEI_XIANG: Record<string, WanWuLeiXiang> = {
  "乾": {
    gua: "乾", xiang: "天", wuXing: "金",
    direction: "西北", season: "秋冬之交",
    color: "大赤、金色、白色", number: "1/4/9",
    taste: "辛辣", animal: "马、狮、象、天鹅",
    body: "头、骨、肺、大肠",
    people: "君王、父亲、长者、领导、名人、公务员",
    place: "京都、大城市、政府机关、高亢之所、名胜古迹",
    thing: "金银珠宝、圆形物品、钟表、车辆、镜片、冠冕",
    weather: "晴、冰雹、寒冷",
    nature: "刚健有力，积极进取，具有领袖气质。代表创造力和开拓精神。",
    jiXiong: "大吉（得时为君，失时则刚愎）",
  },
  "兑": {
    gua: "兑", xiang: "泽", wuXing: "金",
    direction: "正西", season: "秋",
    color: "白色、银色", number: "2/4/9",
    taste: "辛辣", animal: "羊、鱼、虎",
    body: "口、舌、肺、气管",
    people: "少女、歌手、讲师、翻译、占卜师、巫师",
    place: "沼泽、湖泊、娱乐场所、演讲厅、缺口之所",
    thing: "乐器、金属器皿、破损物品、刀具、口哨",
    weather: "小雨、阴天、潮湿",
    nature: "喜悦善辩，口才流利。代表欢乐与沟通，但也象征不足与缺陷。",
    jiXiong: "中吉（利于口舌之事，不利静守）",
  },
  "离": {
    gua: "离", xiang: "火", wuXing: "火",
    direction: "正南", season: "夏",
    color: "红色、紫色、橙色", number: "3/2/7",
    taste: "苦", animal: "雉鸡、龟、蚌、孔雀",
    body: "目、心、小肠",
    people: "中女、文人、画家、美容师、军人、法官",
    place: "南方、明亮之处、火炉旁、图书馆、美容院",
    thing: "灯火、文书、字画、电器、枪械、化妆品",
    weather: "晴、热、雷雨、闪电",
    nature: "光明美丽，文明智慧。代表文化与礼仪，但也象征分离和炎上。",
    jiXiong: "中吉（利文书光明之事，忌暗昧）",
  },
  "震": {
    gua: "震", xiang: "雷", wuXing: "木",
    direction: "正东", season: "春",
    color: "青色、绿色", number: "4/3/8",
    taste: "酸", animal: "龙、马、鹿、蜂",
    body: "足、肝、神经",
    people: "长子、运动员、警察、飞行员、开拓者",
    place: "东方、树林、大路、闹市、机场、运动场",
    thing: "树木、乐器（琴瑟）、车辆、电话、鞭炮",
    weather: "雷雨、大风、地震",
    nature: "震动奋发，行动力强。代表变革与创新，但也象征冲动和急躁。",
    jiXiong: "中吉（利于行动开拓，不宜静守）",
  },
  "巽": {
    gua: "巽", xiang: "风", wuXing: "木",
    direction: "东南", season: "春夏之交",
    color: "绿色、蓝色", number: "5/3/8",
    taste: "酸", animal: "鸡、蛇、鹤、蝴蝶",
    body: "股、胆、呼吸系统",
    people: "长女、商人、教师、僧道、传媒人",
    place: "东南方、花园、市场、学校、寺庙、通风处",
    thing: "扇子、纸张、绳索、风扇、飞机、船帆",
    weather: "风、多云、和风",
    nature: "渗透入微，柔顺灵活。代表商业和传播，但也象征优柔寡断。",
    jiXiong: "中吉（利商贸传播，忌拖泥带水）",
  },
  "坎": {
    gua: "坎", xiang: "水", wuXing: "水",
    direction: "正北", season: "冬",
    color: "黑色、蓝色", number: "6/1/6",
    taste: "咸", animal: "猪、鱼、狐、水鸟",
    body: "耳、肾、膀胱、血液",
    people: "中男、盗贼、船员、渔夫、医生、隐士",
    place: "北方、江河湖海、水井、浴室、地下室、暗处",
    thing: "水器、鱼缸、弓轮、密码锁、刑具",
    weather: "雨、雪、寒",
    nature: "险陷深沉，智慧内敛。代表危险与谋略，但也象征韧性和专注。",
    jiXiong: "凶（主险陷劳碌，遇乾兑金生则转吉）",
  },
  "艮": {
    gua: "艮", xiang: "山", wuXing: "土",
    direction: "东北", season: "冬春之交",
    color: "黄色、棕色", number: "7/5/10",
    taste: "甜", animal: "狗、鼠、虎、牛",
    body: "手、鼻、背、胃",
    people: "少男、隐士、保安、石匠、房产商",
    place: "东北方、山丘、高楼、仓库、门庭、石阶",
    thing: "石头、门、桌子、屏风、陶器、不动产契约",
    weather: "阴、雾、多云",
    nature: "静止稳固，稳重可靠。代表停止与储藏，但也象征固执和保守。",
    jiXiong: "中平（利静守积累，不利开拓）",
  },
  "坤": {
    gua: "坤", xiang: "地", wuXing: "土",
    direction: "西南", season: "夏秋之交",
    color: "黄色、黑色、棕色", number: "8/5/10",
    taste: "甜", animal: "牛、马、羊",
    body: "腹、脾、胃、肌肉",
    people: "母亲、老妇、农民、大众、臣子、后勤",
    place: "西南方、田野、平原、农村、仓库、广场",
    thing: "布匹、陶器、粮食、方形容器、车辆（大车）",
    weather: "阴天、多云、雾",
    nature: "柔顺包容，厚德载物。代表孕育和承载，但也象征被动和迟钝。",
    jiXiong: "大吉（得时承载万物，失时则被动受制）",
  },
};

// ── 五行生克关系 ──
function getShengKe(ti: string, yong: string): { relation: string; level: string; meaning: string } {
  const sheng: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  const ke: Record<string, string> = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

  if (ti === yong) return { relation: "比和", level: "大吉", meaning: "体用比和，万事顺遂。主客同心，谋事可成，诸事亨通。《梅花易数》云：体用比和，谋为可成。时效较快，无需过多忧虑。" };
  if (sheng[ti] === yong) return { relation: "体生用", level: "平", meaning: "体生用为泄气。耗神费力，事可成但辛苦。犹如父母为子女操劳，虽有付出之累，终有所获。宜主动出击但需保存实力，不宜同时多线作战。" };
  if (sheng[yong] === ti) return { relation: "用生体", level: "大吉", meaning: "用生体为进益。贵人相助，不劳而获，事半功倍。《梅花易数》云：用生体，百事可成。时机有利，可乘势而上，无需犹豫。" };
  if (ke[ti] === yong) return { relation: "体克用", level: "吉", meaning: "体克用为主动。事在人为，努力可成，但需付出代价。犹如将军出征，虽有战果亦有损耗。宜把握节奏，不可操之过急。求财占最利。" };
  if (ke[yong] === ti) return { relation: "用克体", level: "凶", meaning: "用克体为克制。诸事不利，外力压制，宜退守等待时机。《梅花易数》云：用克体，事不可为。此时不可强求，需韬光养晦，待体卦旺相之时再图。" };
  return { relation: "未知", level: "平", meaning: "体用不明，需进一步分析卦象配置。建议重起一卦或参看互卦变卦。" };
}

// ── 互卦分析 ──
function analyzeHuGua(tiGua: string, tiWx: string, huShang: string, huXia: string): string {
  const huWx = WAN_WU_LEI_XIANG[huShang]?.wuXing || "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const huWx2 = WAN_WU_LEI_XIANG[huXia]?.wuXing || "";

  let analysis = `互卦${huShang}上${huXia}代表事物发展过程中的变数。`;

  if (huWx && tiWx) {
    const sk = getShengKe(tiWx, huWx);
    if (sk.level === "大吉") analysis += `体卦${tiWx}与互卦${huWx}${sk.relation}，中间过程顺利有助力。`;
    else if (sk.level === "凶") analysis += `体卦${tiWx}受互卦${huWx}克制，中间过程有阻力需克服。`;
    else analysis += `体卦${tiWx}与互卦${huWx}${sk.relation}，中间过程需付出一定代价。`;
  }

  return analysis;
}

// ── 变卦分析 ──
function analyzeBianGua(tiGua: string, tiWx: string, bianShang: string, bianXia: string): string {
  const bianWx = WAN_WU_LEI_XIANG[bianShang]?.wuXing || "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bianWx2 = WAN_WU_LEI_XIANG[bianXia]?.wuXing || "";

  let analysis = `变卦${bianShang}上${bianXia}代表事物的最终结果和发展方向。`;

  if (bianWx && tiWx) {
    const sk = getShengKe(tiWx, bianWx);
    if (sk.level === "大吉") analysis += `变卦生体，结果有利，最终可成。`;
    else if (sk.level === "凶") analysis += `变卦克体，结果不利，需调整策略或另寻他路。`;
    else if (sk.relation === "比和") analysis += `体用比和，结果稳定，可维持现状。`;
    else analysis += `变卦与体卦${sk.relation}，结果${sk.level === "吉" ? "向好但需努力" : "平平需顺其自然"}。`;
  }

  return analysis;
}

// ── 64卦名称表（上卦+下卦 → 卦名）──
const LIUSHISI_GUA_NAME: Record<string, string> = {
  "乾乾": "乾为天", "坤坤": "坤为地", "坎震": "水雷屯", "艮坎": "山水蒙",
  "坎乾": "水天需", "乾坎": "天水讼", "坤坎": "地水师", "坎坤": "水地比",
  "巽乾": "风天小畜", "乾兑": "天泽履", "坤乾": "地天泰", "乾坤": "天地否",
  "离乾": "火天大有", "坤艮": "地山谦", "震坤": "雷地豫", "兑震": "泽雷随",
  "艮巽": "山风蛊", "坤兑": "地泽临", "巽坤": "风地观", "离震": "火雷噬嗑",
  "艮离": "山火贲", "艮坤": "山地剥", "坤震": "地雷复", "乾震": "天雷无妄",
  "艮乾": "山天大畜", "艮震": "山雷颐", "兑巽": "泽风大过", "坎坎": "坎为水",
  "离离": "离为火", "兑艮": "泽山咸", "震巽": "雷风恒", "乾艮": "天山遁",
  "震乾": "雷天大壮", "离坤": "火地晋", "坤离": "地火明夷", "巽离": "风火家人",
  "离兑": "火泽睽", "坎艮": "水山蹇", "震坎": "雷水解", "艮兑": "山泽损",
  "巽震": "风雷益", "兑乾": "泽天夬", "乾巽": "天风姤", "兑坤": "泽地萃",
  "坤巽": "地风升", "兑坎": "泽水困", "巽兑": "风泽中孚", "兑离": "泽火革",
  "离巽": "火风鼎", "震震": "震为雷", "艮艮": "艮为山", "巽艮": "风山渐",
  "震兑": "雷泽归妹", "震离": "雷火丰", "离艮": "火山旅", "巽巽": "巽为风",
  "兑兑": "兑为泽", "巽坎": "风水涣", "坎兑": "水泽节", "坎巽": "水风井",
  "震艮": "雷山小过", "坎离": "水火既济", "离坎": "火水未济",
};

const DUANGUA_TIPS: DuanGuaTip[] = [
  // ── 求财类 ──
  { scenario: "求财占", principle: "体克用主动求财可得，用生体财自来不费力，体生用耗财需谨慎，用克体破财宜守。体用比和财运平稳。", example: "体乾金用巽木，体克用，宜主动出击求财，适合投资创业。" },
  { scenario: "交易占", principle: "体生用交易难成，用生体交易易成且有利，比和双方满意成交快。", example: "体离火用坤土，体生用为泄气，交易中可能吃亏让步。" },
  { scenario: "投资占", principle: "用生体为最佳投资时机，体克用可投但有风险，用克体切不可投。体用比和稳健投资。", example: "体震木用离火，体生用为泄，近期不宜大举投资。" },
  // ── 考试学业类 ──
  { scenario: "考试占", principle: "体用比和最利考试，用生体考官赏识成绩佳，体生用需加倍努力，体克用尚可。", example: "体离火用离火，体用比和，考试发挥稳定成绩理想。" },
  { scenario: "学业占", principle: "用生体利于升学进修，体生用学习吃力需加把劲，比和学业平稳进步。坤用生体有利文科，乾用生体利理科。", example: "体坎水用乾金，用生体，进修升学时机成熟。" },
  // ── 婚恋类 ──
  { scenario: "婚姻占", principle: "体用比和两情相悦最吉，用生体对方有心，体生用需主动追求。忌用克体（对方无心或有第三者）。", example: "男占得体坎水用兑金，用生体，女方有情意，可大胆表白。" },
  { scenario: "感情占", principle: "体生用你爱对方更深，用生体对方更爱你。体用比和互爱。兑为少女离为中女，看关系定位。", example: "体巽木用艮土，体克用，在这段关系中你是主导方。" },
  // ── 出行类 ──
  { scenario: "出行占", principle: "体克用出行顺利，用生体旅途愉快，体生用途中劳累。用克体不宜出行或途中不顺。", example: "体震木用坤土，体克用，出行顺利目的地可到。" },
  { scenario: "远行占", principle: "乾为远行震为车马，体克用可远行。坎为险，遇用克体不宜远涉重洋。", example: "体乾金用艮土，体泄用（土生金为用生体），远行有利且收获丰。" },
  // ── 失物类 ──
  { scenario: "失物占", principle: "体克用失物可寻（主动寻找），用生体失物可回（有人送回），用克体失物难追，体生用需费大力气。", example: "体乾金用离火，用克体，失物恐已被人取走，寻回难度大。" },
  { scenario: "寻人占", principle: "用生体人可寻回，体克用需主动寻找，用克体人已远去难寻。兑为口舌离为气，看走失原因。", example: "体坎水用兑金，用生体，走失之人可安全寻回。" },
  // ── 健康疾病类 ──
  { scenario: "疾病占", principle: "用生体医药有效，体用比和渐愈，体生用病难愈迁延，用克体病情危重。坎为病离为热震为痛。", example: "体坎水用乾金，用生体，医药对症治疗有效，可望康复。" },
  { scenario: "康复占", principle: "体克用药效显著，用生体恢复迅速。体生用恢复慢需耐心。离火体遇坎水用克需防复发。", example: "体震木用坎水，用生体，身体恢复有贵人相助或找到良医。" },
  // ── 官讼类 ──
  { scenario: "官讼占", principle: "体克用胜诉有望，用克体败诉风险大，用生体官司有利（贵人相助），体生用官司耗财。", example: "体离火用乾金，体克用，官讼中你可掌握主动权。" },
  { scenario: "仕途占", principle: "用生体上司赏识升迁有望，体克用竞争可胜，用克体恐有官非贬谪。乾为官离为文巽为令。", example: "体坤土用离火，用生体，仕途有贵人提拔升迁可期。" },
  // ── 家宅类 ──
  { scenario: "家宅占", principle: "体用比和家庭和睦，用生体家运昌盛，体生用为家庭付出多。艮为门坤为宅震为长子。", example: "体坤土用艮土，体用比和，家宅平安家人和睦。" },
  { scenario: "生育占", principle: "体用比和生育顺利，用生体母子平安，体生用生产辛苦。震为长子坎为中男艮为少男，兑为少女离为中女巽为长女。", example: "体坤土用乾金，体生用为泄，生产可能较辛苦但最终平安。" },
  // ── 天气类 ──
  { scenario: "天气占", principle: "离为晴坎为雨，震为雷巽为风，乾为晴坤为阴，艮为雾兑为小雨。体离用坎先晴后雨。", example: "体离火用坎水，用克体，天将转阴雨不宜出行。" },
  // ── 应期类 ──
  { scenario: "应期断", principle: "体用比和应期最快（五行当令之月），用生体应期近，体生用应期慢，用克体应期难定。取卦数或五行当令之时为应。", example: "体用比和均为木，取寅卯月（春季）为应期，或取卦数3日/8日内。" },
  // ── 谋事类 ──
  { scenario: "谋事占", principle: "用生体谋事可成且顺利，体克用需努力但可成，体用比和事半功倍，用克体谋事难成宜暂缓。", example: "体艮土用离火，用生体，所谋之事得天时人和，宜积极推进。" },
];

export function calculateMeiHuaDuanGua(input: Record<string, unknown>): MeiHuaDuanGuaResult {
  const shangGua = (input.shangGua as string) || "乾";
  const xiaGua = (input.xiaGua as string) || "兑";
  const dongYao = (input.dongYao as number) || 3;
  const huShang = (input.huGuaShang as string) || shangGua;
  const huXia = (input.huGuaXia as string) || xiaGua;
  const bianShang = (input.bianGuaShang as string) || xiaGua;
  const bianXia = (input.bianGuaXia as string) || shangGua;

  // 体卦用卦判定：动爻所在为用卦，不动为体卦
  const isDongYaoShang = dongYao >= 4;
  const tiGua = isDongYaoShang ? xiaGua : shangGua;
  const yongGua = isDongYaoShang ? shangGua : xiaGua;

  const tiInfo = WAN_WU_LEI_XIANG[tiGua];
  const yongInfo = WAN_WU_LEI_XIANG[yongGua];
  const tiWx = tiInfo?.wuXing || "水";
  const yongWx = yongInfo?.wuXing || "金";
  const sk = getShengKe(tiWx, yongWx);

  const tiYongAnalysis: TiYongInfo = {
    tiGua, yongGua,
    tiYongRelation: sk.relation,
    level: sk.level,
    generalMeaning: sk.meaning,
  };

  // ── 本卦/互卦/变卦详细分析 ──
  const benGuaName = `${shangGua}${xiaGua}`;
  const liushisiName = LIUSHISI_GUA_NAME[benGuaName] || `${shangGua}上${xiaGua}`;

  const guaXiangAnalysis: MeiHuaGuaXiangDetail[] = [
    {
      position: `本卦·上卦（${dongYao >= 4 ? "用卦" : "体卦"}）`,
      guaName: shangGua,
      guaXiang: tiInfo?.xiang || "",
      wuXing: tiInfo?.wuXing || "",
      meaning: `${dongYao >= 4 ? "动爻在上卦，此为用卦" : "此为体卦，代表问卦者自身"}。${WAN_WU_LEI_XIANG[shangGua]?.nature || ""} 方位${WAN_WU_LEI_XIANG[shangGua]?.direction || ""}，对应${WAN_WU_LEI_XIANG[shangGua]?.people || ""}，主${WAN_WU_LEI_XIANG[shangGua]?.thing || ""}。`,
    },
    {
      position: `本卦·下卦（${dongYao >= 4 ? "体卦" : "用卦"}）`,
      guaName: xiaGua,
      guaXiang: yongInfo?.xiang || "",
      wuXing: yongInfo?.wuXing || "",
      meaning: `${dongYao >= 4 ? "此为体卦，代表问卦者自身" : "动爻在下卦，此为用卦"}。${WAN_WU_LEI_XIANG[xiaGua]?.nature || ""} 方位${WAN_WU_LEI_XIANG[xiaGua]?.direction || ""}，对应${WAN_WU_LEI_XIANG[xiaGua]?.people || ""}，主${WAN_WU_LEI_XIANG[xiaGua]?.thing || ""}。`,
    },
    {
      position: `互卦·上`,
      guaName: huShang,
      guaXiang: WAN_WU_LEI_XIANG[huShang]?.xiang || "",
      wuXing: WAN_WU_LEI_XIANG[huShang]?.wuXing || "",
      meaning: analyzeHuGua(tiGua, tiWx, huShang, huXia),
    },
    {
      position: `互卦·下`,
      guaName: huXia,
      guaXiang: WAN_WU_LEI_XIANG[huXia]?.xiang || "",
      wuXing: WAN_WU_LEI_XIANG[huXia]?.wuXing || "",
      meaning: `互卦下卦代表中间过程的隐含因素。${WAN_WU_LEI_XIANG[huXia]?.nature || ""}`,
    },
    {
      position: `变卦·上`,
      guaName: bianShang,
      guaXiang: WAN_WU_LEI_XIANG[bianShang]?.xiang || "",
      wuXing: WAN_WU_LEI_XIANG[bianShang]?.wuXing || "",
      meaning: analyzeBianGua(tiGua, tiWx, bianShang, bianXia),
    },
    {
      position: `变卦·下`,
      guaName: bianXia,
      guaXiang: WAN_WU_LEI_XIANG[bianXia]?.xiang || "",
      wuXing: WAN_WU_LEI_XIANG[bianXia]?.wuXing || "",
      meaning: `变卦下卦辅助参考。${WAN_WU_LEI_XIANG[bianXia]?.nature || ""}`,
    },
  ];

  // ── 生克链 ──
  const shengKeChain: ShengKeItem[] = [
    { from: `体卦${tiGua}(${tiWx})`, to: `用卦${yongGua}(${yongWx})`, relation: sk.relation, meaning: sk.meaning },
  ];

  const huWx = WAN_WU_LEI_XIANG[huShang]?.wuXing || "";
  const huWx2 = WAN_WU_LEI_XIANG[huXia]?.wuXing || "";
  if (huWx && huWx !== tiWx) {
    const huSk = getShengKe(tiWx, huWx);
    shengKeChain.push({ from: `体卦${tiGua}(${tiWx})`, to: `互上${huShang}(${huWx})`, relation: huSk.relation, meaning: `中间过程：${huSk.meaning.substring(0, 40)}` });
  }
  if (huWx2 && huWx2 !== tiWx && huWx2 !== huWx) {
    const huSk2 = getShengKe(tiWx, huWx2);
    shengKeChain.push({ from: `体卦${tiGua}(${tiWx})`, to: `互下${huXia}(${huWx2})`, relation: huSk2.relation, meaning: `隐含因素：${huSk2.meaning.substring(0, 40)}` });
  }

  const bianWx = WAN_WU_LEI_XIANG[bianShang]?.wuXing || "";
  if (bianWx && bianWx !== tiWx) {
    const bianSk = getShengKe(tiWx, bianWx);
    shengKeChain.push({ from: `体卦${tiGua}(${tiWx})`, to: `变上${bianShang}(${bianWx})`, relation: bianSk.relation, meaning: `最终结果：${bianSk.meaning.substring(0, 40)}` });
  }

  // ── 综合断语 ──
  const tiXiang = WAN_WU_LEI_XIANG[tiGua]?.xiang || "";
  const yongXiang = WAN_WU_LEI_XIANG[yongGua]?.xiang || "";

  let levelNote = "";
  if (sk.level === "大吉") levelNote = `整体为大吉之象，事多顺遂。《梅花易数》论体用，以用生体、比和为最吉。当前${sk.relation}，正合此论。建议积极行动，把握良机。`;
  else if (sk.level === "吉") levelNote = `总体吉象，努力可成。《梅花易数》论体克用，虽吉但需付出。当前${sk.relation}，建议主动出击但不宜冒进，稳扎稳打终有成。`;
  else if (sk.level === "凶") levelNote = `整体为凶象，宜退守等待。《梅花易数》云："用克体，事不可为。"当前${sk.relation}，建议暂缓行动，韬光养晦，待体卦旺相时再图。可参看互卦变卦寻求转机。`;
  else levelNote = `吉凶参半。《梅花易数》论体生用为泄气，需结合具体占问判断。建议参看互卦（中间过程）和变卦（最终结果）细化判断。`;

  // 构建 box-drawing 摘要
  const levelIcon: Record<string, string> = { "大吉": "★★★", "吉": "★★", "平": "★", "凶": "△", "大凶": "△△" };
  const tiNature = WAN_WU_LEI_XIANG[tiGua]?.nature || "";
  const yongNature = WAN_WU_LEI_XIANG[yongGua]?.nature || "";

  const lines = [
    `┌─ 梅花断卦 ─────────────────`,
    `│ 本卦：${liushisiName} ${shangGua}上${xiaGua} 体${tiGua}(${tiWx}) 用${yongGua}(${yongWx})`,
    `│ 体用：${sk.relation}（${levelIcon[sk.level] || ""} ${sk.level}）${sk.meaning.slice(0, 30)}`,
    ``,
    `├─ 体用分析 ──────────────────`,
    `│ 体卦${tiGua}（${tiWx}·${tiXiang}）：${tiNature}`,
    `│ 用卦${yongGua}（${yongWx}·${yongXiang}）：${yongNature}`,
  ];

  if (huShang || huXia) {
    lines.push(`│`);
    lines.push(`├─ 互卦 ────────────────────`);
    if (huShang) lines.push(`│ 互上${huShang}（${WAN_WU_LEI_XIANG[huShang]?.wuXing || ""}）`);
    if (huXia) lines.push(`│ 互下${huXia}（${WAN_WU_LEI_XIANG[huXia]?.wuXing || ""}）`);
  }
  if (bianShang || bianXia) {
    lines.push(`│`);
    lines.push(`├─ 变卦 ────────────────────`);
    if (bianShang) lines.push(`│ 变上${bianShang}（${WAN_WU_LEI_XIANG[bianShang]?.wuXing || ""}）`);
    if (bianXia) lines.push(`│ 变下${bianXia}（${WAN_WU_LEI_XIANG[bianXia]?.wuXing || ""}）`);
  }

  lines.push(`│`);
  lines.push(`├─ 生克链条 ──────────────────`);
  for (const item of shengKeChain.slice(0, 5)) {
    lines.push(`│ ${item.from} → ${item.to}：${item.meaning.slice(0, 45)}`);
  }

  lines.push(`│`);
  lines.push(`├─ 综合断语 ──────────────────`);
  lines.push(`│ ${levelNote.slice(0, 80)}`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《梅花易数》—— 宋·邵雍，体用生克论之源头`);
  lines.push(`│ 《周易·说卦传》—— 八卦万物类象之根本`);
  lines.push(`│ 《易学启蒙》—— 宋·朱熹，易学入门之阶梯`);
  lines.push(`│ 梅花易数核心：「体用者，即易之动静也。」`);
  lines.push(`│ 体为己身之兆，用为应事之端。体用生克分吉凶。`);
  lines.push(`│ 比和为吉，用生体为大吉，体生用为泄气，用克体为凶。`);
  lines.push(`│`);
  lines.push(`└─ 断卦提示 ──────────────────`);
  lines.push(`   梅花易数讲究「三要十应」——外应比卦象更直接。`);
  lines.push(`   断卦时须结合占问的具体事项，不可一概而论。`);
  lines.push(`   「体无定用，惟变是用；用无定体，惟化是体。」`);
  const summary = lines.join("\n");

  // 万物类象
  const wanWuLeiXiang: WanWuLeiXiang[] = [tiGua, yongGua, huShang, bianShang]
    .filter((g, i, arr) => arr.indexOf(g) === i) // 去重
    .map(g => WAN_WU_LEI_XIANG[g])
    .filter(Boolean);

  return { tiYongAnalysis, guaXiangAnalysis, shengKeChain, duanGuaTips: DUANGUA_TIPS, summary, wanWuLeiXiang };
}

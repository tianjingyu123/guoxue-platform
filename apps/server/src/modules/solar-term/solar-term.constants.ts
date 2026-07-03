/**
 * V8 节气仪式 — 24 节气静态内容库（公版文化知识·无版权风险）
 * 每节气含：三候（七十二候）/习俗/养生/应景公版诗句
 * 与 bazi-engine calcAllJieQi 返回的节气名（中文）一一对应，供 today/participate 查表。
 */

export interface SolarTermContent {
  /** 拼音 key（前端路由/资源命名用） */
  key: string;
  /** 节气名（与 calcAllJieQi 键一致） */
  name: string;
  /** 三候（简） */
  sanHou: string;
  /** 习俗一句 */
  custom: string;
  /** 养生一句 */
  health: string;
  /** 应景公版诗句一句 */
  poem: string;
}

/** 24 节气内容（按立春→大寒物候顺序） */
export const SOLAR_TERMS: SolarTermContent[] = [
  { key: "lichun", name: "立春", sanHou: "东风解冻·蛰虫始振·鱼陟负冰", custom: "咬春食春饼萝卜、迎春鞭牛", health: "护阳养肝，早睡早起，防风保暖", poem: "春雪满空来，触处似花开" },
  { key: "yushui", name: "雨水", sanHou: "獭祭鱼·候雁北·草木萌动", custom: "回娘家、接寿、占稻色", health: "调养脾胃，少酸增甘，防倒春寒", poem: "好雨知时节，当春乃发生" },
  { key: "jingzhe", name: "惊蛰", sanHou: "桃始华·仓庚鸣·鹰化为鸠", custom: "祭白虎、打小人、吃梨", health: "顺肝气、多梳头，饮食清淡润燥", poem: "微雨众卉新，一雷惊蛰始" },
  { key: "chunfen", name: "春分", sanHou: "玄鸟至·雷乃发声·始电", custom: "竖蛋、放风筝、吃春菜", health: "阴阳平衡，忌大喜大悲，宜踏青", poem: "仲春初四日，春色正中分" },
  { key: "qingming", name: "清明", sanHou: "桐始华·田鼠化为鴽·虹始见", custom: "扫墓祭祖、踏青、插柳", health: "肝气正旺，清淡饮食，忌郁怒", poem: "清明时节雨纷纷，路上行人欲断魂" },
  { key: "guyu", name: "谷雨", sanHou: "萍始生·鸣鸠拂其羽·戴胜降于桑", custom: "喝谷雨茶、赏牡丹、祭仓颉", health: "健脾祛湿，防花粉过敏", poem: "谷雨春光晓，山川黛色青" },
  { key: "lixia", name: "立夏", sanHou: "蝼蝈鸣·蚯蚓出·王瓜生", custom: "称人、斗蛋、吃立夏饭", health: "养心为先，戒躁静养，午间小憩", poem: "四月维夏，六月徂暑" },
  { key: "xiaoman", name: "小满", sanHou: "苦菜秀·靡草死·麦秋至", custom: "祭车神、食苦菜、抢水", health: "清热利湿，多食苦味，防湿疹", poem: "小满气全时，如何靡草衰" },
  { key: "mangzhong", name: "芒种", sanHou: "螳螂生·鵙始鸣·反舌无声", custom: "送花神、安苗、煮青梅", health: "晚睡早起，健脾化湿，防中暑", poem: "时雨及芒种，四野皆插秧" },
  { key: "xiazhi", name: "夏至", sanHou: "鹿角解·蝉始鸣·半夏生", custom: "吃夏至面、祭神祀祖", health: "养阳护心，晚睡早起，忌贪凉", poem: "昼晷已云极，宵漏自此长" },
  { key: "xiaoshu", name: "小暑", sanHou: "温风至·蟋蟀居壁·鹰始鸷", custom: "食新、晒伏、吃三宝", health: "少动多静，清补消暑，护脾胃", poem: "倏忽温风至，因循小暑来" },
  { key: "dashu", name: "大暑", sanHou: "腐草为萤·土润溽暑·大雨时行", custom: "饮伏茶、晒伏姜、吃仙草", health: "防暑降温，益气养阴，冬病夏治", poem: "赤日几时过，清风无处寻" },
  { key: "liqiu", name: "立秋", sanHou: "凉风至·白露降·寒蝉鸣", custom: "贴秋膘、啃秋、晒秋", health: "润肺防燥，收敛神气，忌过食寒凉", poem: "睡起秋声无觅处，满阶梧叶月明中" },
  { key: "chushu", name: "处暑", sanHou: "鹰乃祭鸟·天地始肃·禾乃登", custom: "放河灯、开渔节、煎药茶", health: "早睡早起，滋阴润燥，防秋乏", poem: "疾风驱急雨，残暑扫除空" },
  { key: "bailu", name: "白露", sanHou: "鸿雁来·玄鸟归·群鸟养羞", custom: "收清露、饮白露茶、吃龙眼", health: "养肺润燥，添衣防凉，忌露身", poem: "露从今夜白，月是故乡明" },
  { key: "qiufen", name: "秋分", sanHou: "雷始收声·蛰虫坯户·水始涸", custom: "祭月、竖蛋、吃秋菜", health: "阴阳平和，早卧早起，平补润燥", poem: "金气秋分，风清露冷秋期半" },
  { key: "hanlu", name: "寒露", sanHou: "鸿雁来宾·雀入大水为蛤·菊有黄华", custom: "登高赏菊、吃芝麻、饮菊花酒", health: "足部保暖，滋阴润肺，防秋燥", poem: "袅袅凉风动，凄凄寒露零" },
  { key: "shuangjiang", name: "霜降", sanHou: "豺乃祭兽·草木黄落·蛰虫咸俯", custom: "赏菊、吃柿子、登高", health: "平补温润，护脾胃，防秋郁", poem: "霜降水返壑，风落木归山" },
  { key: "lidong", name: "立冬", sanHou: "水始冰·地始冻·雉入大水为蜃", custom: "贺冬、补冬、吃饺子", health: "养藏敛阳，早睡晚起，温补护肾", poem: "冻笔新诗懒写，寒炉美酒时温" },
  { key: "xiaoxue", name: "小雪", sanHou: "虹藏不见·天气上升地气下降·闭塞成冬", custom: "腌腊肉、吃糍粑、晒鱼干", health: "温肾防寒，多晒太阳，调畅情志", poem: "满月光天汉，长风响树枝" },
  { key: "daxue", name: "大雪", sanHou: "鹖鴠不鸣·虎始交·荔挺出", custom: "腌肉、观封河、进补", health: "温补护阳，防寒保暖，宜早卧", poem: "夜深知雪重，时闻折竹声" },
  { key: "dongzhi", name: "冬至", sanHou: "蚯蚓结·麋角解·水泉动", custom: "北方吃饺子、南方吃汤圆、祭祖", health: "护阳藏精，早睡晚起，忌大汗", poem: "天时人事日相催，冬至阳生春又来" },
  { key: "xiaohan", name: "小寒", sanHou: "雁北乡·鹊始巢·雉始雊", custom: "吃腊八粥、画九、探梅", health: "温补肾阳，护头颈足，防寒邪", poem: "小寒连大吕，欢鹊垒新巢" },
  { key: "dahan", name: "大寒", sanHou: "鸡始乳·征鸟厉疾·水泽腹坚", custom: "尾牙祭、除尘、吃糯米饭", health: "敛阴护阳，防风御寒，温养脾肾", poem: "旧雪未及消，新雪又拥户" },
];

/** 按节气名快速查表 */
const TERM_MAP = new Map<string, SolarTermContent>(SOLAR_TERMS.map((t) => [t.name, t]));

/** 按节气名（中文）取内容，未知返回 undefined */
export function getTermByName(name: string): SolarTermContent | undefined {
  return TERM_MAP.get(name);
}

// ── 节气限定成就 code（直建 UserAchievement·纯荣誉不可兑现）──

/** 首次参与任意节气仪式 */
export const ACH_SOLAR_TERM_RITUAL = "solar_term_ritual";
/** 集齐 4 个节气（应时·四时） */
export const ACH_SOLAR_TERM_4 = "solar_term_4";
/** 集齐 12 个节气（应时·十二气） */
export const ACH_SOLAR_TERM_12 = "solar_term_12";
/** 集齐 24 个节气（应时·廿四节） */
export const ACH_SOLAR_TERM_24 = "solar_term_24";

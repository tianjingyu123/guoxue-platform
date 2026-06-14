// ── 面相十二宫计算引擎 ──
// 算法参考：《麻衣神相》《柳庄相法》《神相全编》《太清神鉴》《相理衡真》
// 面相十二宫为面相学核心分类体系，以面部各部位对应人生十二维度

// ── 本地类型 ──
interface MianXiangGongItem {
  name: string; position: string; wuXing: string; color: string;
  standard: string; goodSign: string; badSign: string;
  ageRange: string; lifeArea: string; classicalRef: string;
  relation: string; improve: string;
}
interface MianXiangShiErGongResult { gongList: MianXiangGongItem[]; summary: string; }

// 十二宫相理数据库
const SHIER_GONG_DATA: MianXiangGongItem[] = [
  {
    name: "命宫", position: "印堂（两眉之间）", wuXing: "火", color: "红润",
    standard: "印堂开阔饱满，光明如镜，无纹无痣",
    goodSign: "印堂平满，光明如镜，少年得志，一生顺遂",
    badSign: "印堂凹陷狭窄，悬针纹破，运势多舛，28岁前后有大坎坷",
    ageRange: "28岁", lifeArea: "总运势、事业起点",
    classicalRef: "《麻衣神相》：「命宫者，居两眉之间山根之上。光明如镜，学问皆通。」《神相全编》：「印堂平满，功名立就。」",
    relation: "命宫为十二宫之首，统领全局。与官禄宫/迁移宫关系最密。",
    improve: "保持眉头舒展，常修眉间杂毛，避免皱眉形成悬针纹。可点按印堂穴保养。",
  },
  {
    name: "兄弟宫", position: "双眉", wuXing: "木", color: "青黑",
    standard: "眉毛清秀顺滑，长短相宜，眉尾过目",
    goodSign: "眉清目秀，兄弟和睦互助，朋友缘深",
    badSign: "眉毛逆乱或断缺，兄弟缘薄，朋友少助",
    ageRange: "29-30岁", lifeArea: "兄弟姐妹、朋友关系",
    classicalRef: "《麻衣神相》：「眉为保寿官，又为兄弟宫。眉清而秀，兄弟众多。」《柳庄相法》：「眉长过目，兄弟五六。」",
    relation: "兄弟宫与交友宫互为表里，眉好则交友广。与田宅宫相邻。",
    improve: "保持眉毛整洁，不拔不剃过度。眉间开阔者兄弟和睦。",
  },
  {
    name: "夫妻宫", position: "眼尾（奸门）", wuXing: "水", color: "紫亮",
    standard: "眼尾饱满无纹，色泽明润，鱼尾纹不超过两条",
    goodSign: "奸门饱满光润，婚姻美满，配偶贤良",
    badSign: "鱼尾纹多或奸门凹陷，婚姻波折，夫妻缘薄",
    ageRange: "35-40岁", lifeArea: "婚姻感情、配偶状况",
    classicalRef: "《麻衣神相》：「奸门在眼尾，乃夫妻宫之位。光润无纹，必保妻全。」《太清神鉴》：「鱼尾纹多，克妻之相。」",
    relation: "夫妻宫受命宫和财帛宫影响最大。与子女宫关系密切。",
    improve: "保持眼周滋润，少熬夜减少鱼尾纹。可按摩眼尾促进气血循环。",
  },
  {
    name: "子女宫", position: "眼下（泪堂/男女宫）", wuXing: "土", color: "黄润",
    standard: "眼下饱满润泽，卧蚕分明，色泽粉润",
    goodSign: "三阳平满，卧蚕分明，子女有福，易有贵子",
    badSign: "眼下凹陷暗黑，子女运弱，难以生育或子女多病",
    ageRange: "33-34岁", lifeArea: "子女缘分、生育能力",
    classicalRef: "《麻衣神相》：「男女宫在眼下卧蚕之位。三阳平满，儿孙福禄荣昌。」《相理衡真》：「眼下枯陷，子息艰难。」",
    relation: "子女宫与夫妻宫相邻，夫妻和睦则子女运旺。与田宅宫相关。",
    improve: "保证充足睡眠改善眼袋。可温敷眼部活血化瘀。卧蚕丰盈者子息多。",
  },
  {
    name: "财帛宫", position: "鼻子（准头/鼻翼）", wuXing: "土", color: "黄明",
    standard: "鼻头圆厚有肉，鼻翼饱满，鼻梁挺拔",
    goodSign: "鼻如悬胆，准头丰厚，鼻翼鼓胀，财运亨通富甲一方",
    badSign: "鼻梁塌陷或鼻翼薄削露孔，财运不济，难以积财",
    ageRange: "41-50岁", lifeArea: "财运、物质生活",
    classicalRef: "《麻衣神相》：「鼻乃财帛宫，土宿为财星。准头丰大，一生富贵。」《柳庄相法》：「鼻如截筒悬胆，衣食丰隆。」",
    relation: "财帛宫居中面之央，统领田宅宫(房产运)。受命宫和官禄宫影响。",
    improve: "常按摩迎香穴促进鼻周循环。鼻梁塌陷者可加强理财规划弥补。",
  },
  {
    name: "疾厄宫", position: "山根（鼻梁根部两眼之间）", wuXing: "金", color: "白润",
    standard: "山根高挺无断，气色明润，无横纹无痣",
    goodSign: "山根高隆连通印堂，身体康健少病，抵抗力强",
    badSign: "山根折断低陷有横纹，体弱多病，中年有健康危机",
    ageRange: "31-32岁", lifeArea: "健康、疾病抵抗力",
    classicalRef: "《麻衣神相》：「山根为疾厄宫。山根不折，一生少病。」《神相全编》：「山根断折，41岁大限。」",
    relation: "疾厄宫位于命宫与财帛宫之间，命弱则疾厄先损。与福德宫关于精神健康。",
    improve: "山根凹陷者应定期体检。山根横纹明显者注意41岁健康。",
  },
  {
    name: "迁移宫", position: "额头两侧（驿马位/天仓）", wuXing: "木", color: "明黄",
    standard: "额角饱满高耸，天仓丰隆",
    goodSign: "天仓丰隆，驿马高广，出外有贵人相助，外地发展大利",
    badSign: "额角塌陷削薄，外出多阻碍，不宜离家发展",
    ageRange: "25-27岁", lifeArea: "出行、迁移、外出发展",
    classicalRef: "《麻衣神相》：「迁移者在眉角天仓之位。天仓丰满，出外成家。」《相理衡真》：「驿马高广，远行得利。」",
    relation: "迁移宫与兄弟宫(眉尾)和福德宫(天仓)相邻。与官禄宫关于事业变迁。",
    improve: "额头饱满者宜外出发展。额角窄者宜先稳后动。",
  },
  {
    name: "交友宫", position: "两腮/下巴两侧（地库）", wuXing: "金", color: "白润",
    standard: "腮骨圆润，地库丰盈",
    goodSign: "地库丰盈饱满，朋友多助，部属得力，下属忠诚",
    badSign: "腮骨尖削无肉，易交损友，部属背叛，识人不明",
    ageRange: "51-55岁", lifeArea: "朋友、同事、部属关系",
    classicalRef: "《麻衣神相》：「交友宫在地库两颐之侧。颐颊丰满，得朋友之力。」《柳庄相法》：「两腮无肉，交友无终。」",
    relation: "交友宫与兄弟宫上下呼应。晚年运与下巴福德宫相关联。",
    improve: "腮骨天生难改，但可通过待人真诚弥补。腮削者慎选合作伙伴。",
  },
  {
    name: "官禄宫", position: "额头正中（天庭/伏犀）", wuXing: "火", color: "红黄",
    standard: "额头饱满方正宽广，无疤无斑，骨起伏犀",
    goodSign: "天庭饱满，伏犀贯顶，事业有成，少年登科",
    badSign: "额头低窄塌陷或疤痕破损，事业多阻，难居高位",
    ageRange: "21-24岁", lifeArea: "事业、学业、仕途",
    classicalRef: "《麻衣神相》：「官禄宫在天中之下。天庭额角，主前程之远近。」《神相全编》：「伏犀贯顶，一品之贵。」",
    relation: "官禄宫与命宫相邻，同在额头。与迁移宫关于外地升迁。",
    improve: "保持额头光洁无疤。额头低窄者可蓄刘海但不能遮印堂。",
  },
  {
    name: "田宅宫", position: "上眼皮（田宅位/兰台廷尉）", wuXing: "火", color: "红润",
    standard: "上眼睑饱满，睛不露白(上三白)，卧蚕丰润",
    goodSign: "田宅宫饱满丰厚，家宅安宁，房产丰厚，祖业兴旺",
    badSign: "眼皮塌陷或睛露四白，房产运弱，家宅不宁",
    ageRange: "36-40岁", lifeArea: "房产、家宅、祖业",
    classicalRef: "《麻衣神相》：「田宅宫在两眼之上。眼不露白，田宅丰盈。」《太清神鉴》：「上睑丰厚，广置田庄。」",
    relation: "田宅宫与财帛宫(鼻)和子女宫(眼下)形成面中财运三角。",
    improve: "睛露白者可略垂眼帘。上睑薄者宜早做房产规划。",
  },
  {
    name: "福德宫", position: "眉尾上方（天仓/福堂）", wuXing: "木", color: "青明",
    standard: "眉尾上方饱满宽厚，天仓丰隆",
    goodSign: "天仓丰隆饱满，福气深厚，晚年享福，精神愉快",
    badSign: "天仓凹陷，福薄劳碌，精神压力大，晚年凄凉",
    ageRange: "56-60岁", lifeArea: "福气、精神享受、晚年运",
    classicalRef: "《麻衣神相》：「福德宫在眉尾天仓之位。天仓满者，福寿双全。」《相理衡真》：「额窄颧高，劳碌终身。」",
    relation: "福德宫与迁移宫共占天仓，外则迁移内则福报。与父母宫(额角)相邻。",
    improve: "天仓为先天骨相难改，但行善积德可增后天福报。心态乐观者福德自厚。",
  },
  {
    name: "父母宫", position: "额头左右（日角/月角）", wuXing: "金", color: "白明",
    standard: "日角(左父)月角(右母)对称圆隆，高耸有骨",
    goodSign: "日月角起，高耸圆隆，父母康健有德，祖上积德，有祖荫",
    badSign: "日月角低陷或偏斜一侧，父母缘薄，一方有损",
    ageRange: "1-20岁", lifeArea: "父母、长辈、上司关系",
    classicalRef: "《麻衣神相》：「父母宫在日月角。日角主公，月角主母。日月角起，父母双全。」《神相全编》：「日月角陷，刑克父母。」",
    relation: "父母宫与官禄宫同处额头。日月角为幼年根基，影响一生。",
    improve: "日月角为先天遗传骨骼，不可改变。但孝道可以改运，孝敬双亲可补相之不足。",
  },
];

// 宫位相生相克关系
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GONG_RELATIONS: Record<string, { supports: string[]; supportedBy: string[]; meaning: string }> = {
  "命宫": { supports: ["官禄宫","财帛宫"], supportedBy: ["父母宫"], meaning: "命宫为根，官禄为干，财帛为果" },
  "兄弟宫": { supports: ["交友宫"], supportedBy: ["父母宫"], meaning: "兄弟和睦则交友广阔" },
  "夫妻宫": { supports: ["子女宫"], supportedBy: ["命宫","财帛宫"], meaning: "夫妻和则子女安，根基稳则婚姻固" },
  "子女宫": { supports: [], supportedBy: ["夫妻宫","田宅宫"], meaning: "夫妻和睦家宅安则子息旺" },
  "财帛宫": { supports: ["田宅宫"], supportedBy: ["命宫","官禄宫"], meaning: "官禄旺则财源广，财旺则田宅丰" },
  "疾厄宫": { supports: [], supportedBy: ["福德宫"], meaning: "心宽则体健，福厚则病少" },
  "迁移宫": { supports: ["官禄宫"], supportedBy: ["福德宫"], meaning: "福厚之人远行利，外出可助事业升" },
  "交友宫": { supports: [], supportedBy: ["兄弟宫"], meaning: "兄弟缘深则交友得助" },
  "官禄宫": { supports: ["财帛宫","命宫"], supportedBy: ["父母宫","迁移宫"], meaning: "祖荫厚事业稳，迁移得机遇则升迁" },
  "田宅宫": { supports: ["子女宫"], supportedBy: ["财帛宫"], meaning: "财旺则置产易，家安则子息旺" },
  "福德宫": { supports: ["迁移宫","疾厄宫"], supportedBy: ["命宫"], meaning: "根基好则福厚，福厚则康健远行利" },
  "父母宫": { supports: ["命宫","官禄宫","兄弟宫"], supportedBy: [], meaning: "父母为万福之源，荫及命官兄弟" },
};

export function calculateMianXiangShiErGong(input: Record<string, unknown>): MianXiangShiErGongResult {
  const gongName = (input.gongName as string) || "";
  const gender = (input.gender as string) || "男";

  const gongList = gongName
    ? SHIER_GONG_DATA.filter(g => g.name.includes(gongName))
    : SHIER_GONG_DATA;

  const summary = [
    "【面相十二宫相理分析】",
    "",
    `┌─ 十二宫总览 ─────────────────`,
    `│ 面相十二宫为面相学基础分类体系，涵盖人生十二维度`,
    `│ 从命宫(28岁)到福德宫(56-60岁)，贯穿人生各阶段`,
    `${gender === "男" ? "│ 男士看左为主右为辅（左阳右阴）" : "│ 女士看右为主左为辅（右阴左阳）"}`,
    `│`,
    `├─ 十二宫详情 ─────────────────`,
    ...gongList.map(g =>
      `│ · ${g.name}（${g.position}）：五行${g.wuXing}，主${g.lifeArea}，运程${g.ageRange}`
    ),
    ``,
    `├─ 宫位相关 ─────────────────`,
    `│ · 三停划分：上停(额—命官父母兄弟迁移福德)主早年`,
    `│ · 中停(眉眼鼻—夫妻子女财帛疾厄)主中年`,
    `│ · 下停(口下巴—交友田宅)主晚年`,
    `│`,
    gongName ? [
      `├─ ${gongName} 详细分析 ─────────────────`,
      ...gongList.map(g => [
        `│ 宫位：${g.name}（${g.wuXing}）`,
        `│ 位置：${g.position}`,
        `│ 标准：${g.standard}`,
        `│ 吉相：${g.goodSign}`,
        `│ 凶相：${g.badSign}`,
        `│ 关联：${g.relation}`,
        `│ 改善：${g.improve}`,
        `│ 古籍：${g.classicalRef}`,
      ].join("\n")),
      ``,
    ].join("\n") : "",
    `├─ 相学要诀 ─────────────────`,
    `│ 1. 相不独论：一宫之相需配五官十二宫综合判断`,
    `│ 2. 气色为先：气色者一时之吉凶，骨相者一生之根基`,
    `│ 3. 心相合参：相由心生，心地善良者相亦随之改善`,
    `│ 4. 骨相为本：骨为相之根基，肉为相之外在表现`,
    `│ 5. 行年推运：每宫对应特定年龄，逢该年重点观察该宫变化`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《麻衣神相》：「十二宫者，总括面部之要。一宫有缺，十宫不补。」`,
    `   《柳庄相法》：「相有十二宫，各有所主，不可执一而论。」`,
    `   《神相全编》：「十三部位总图，以十二宫统之。」`,
    `   《相理衡真》：「宫者职也，各有执掌；位者域也，各有分野。」`,
    ``,
    `十二宫之法，以部位定人生，以气色断流年。宫位饱满则该领域顺遂，宫位破损则该领域多阻。`,
  ].filter(Boolean).join("\n");

  return { gongList, summary };
}

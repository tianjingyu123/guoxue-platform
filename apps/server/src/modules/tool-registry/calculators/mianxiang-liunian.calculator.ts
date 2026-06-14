// ── 面相流年运气计算引擎 ──
// 算法参考：《麻衣神相》《柳庄相法》《神相全编》
// 基于《神相全编》流年运气部位图，从1岁到99岁逐岁分析

interface LiuNianBuWeiItem { age: number; buWei: string; position: string; jieDuan: string; yunQiLevel: string; describe: string; advice: string; }
interface MianXiangBuWeiOverview { category: string; ageRange: string; buWeiList: string[]; description: string; }
interface MianXiangLiuNianResult { currentAge: number; currentBuWei: LiuNianBuWeiItem | null; liuNianList: LiuNianBuWeiItem[]; buWeiOverview: MianXiangBuWeiOverview[]; summary: string; }

interface LiuNianConfig { age: number; buWei: string; position: string; jieDuan: string; }
const LIUNIAN_BW: LiuNianConfig[] = [
  // 1-14岁: 耳运
  { age: 1, buWei: "天轮(左)", position: "左耳轮上部", jieDuan: "幼年(耳运)" },
  { age: 2, buWei: "天轮(右)", position: "右耳轮上部", jieDuan: "幼年(耳运)" },
  { age: 3, buWei: "人轮(左)", position: "左耳轮中部", jieDuan: "幼年(耳运)" },
  { age: 4, buWei: "人轮(右)", position: "右耳轮中部", jieDuan: "幼年(耳运)" },
  { age: 5, buWei: "地轮(左)", position: "左耳垂", jieDuan: "幼年(耳运)" },
  { age: 6, buWei: "地轮(右)", position: "右耳垂", jieDuan: "幼年(耳运)" },
  { age: 7, buWei: "天城(左)", position: "左耳门", jieDuan: "幼年(耳运)" },
  { age: 8, buWei: "天城(右)", position: "右耳门", jieDuan: "幼年(耳运)" },
  // 9-14: 额运开始
  { age: 9, buWei: "天中(左)", position: "额头正中偏左", jieDuan: "少年(额运)" },
  { age: 10, buWei: "天中(右)", position: "额头正中偏右", jieDuan: "少年(额运)" },
  { age: 11, buWei: "天庭", position: "额头上部", jieDuan: "少年(额运)" },
  { age: 12, buWei: "司空", position: "额头中部", jieDuan: "少年(额运)" },
  { age: 13, buWei: "中正", position: "额头下部近眉", jieDuan: "少年(额运)" },
  { age: 14, buWei: "印堂", position: "两眉之间", jieDuan: "少年(额运)" },
  // 15-24: 眉眼运
  { age: 15, buWei: "火星(左眉)", position: "左眉头", jieDuan: "青年前期" },
  { age: 16, buWei: "火星(右眉)", position: "右眉头", jieDuan: "青年前期" },
  { age: 17, buWei: "左眉中", position: "左眉中部", jieDuan: "青年前期" },
  { age: 18, buWei: "右眉中", position: "右眉中部", jieDuan: "青年前期" },
  { age: 19, buWei: "左眉尾", position: "左眉尾部", jieDuan: "青年前期" },
  { age: 20, buWei: "右眉尾", position: "右眉尾部", jieDuan: "青年前期" },
  { age: 21, buWei: "山根", position: "鼻梁起点两眼之间", jieDuan: "青年中期" },
  { age: 22, buWei: "左眼", position: "左眼", jieDuan: "青年中期" },
  { age: 23, buWei: "右眼", position: "右眼", jieDuan: "青年中期" },
  { age: 24, buWei: "年上(左)", position: "鼻梁中部偏左", jieDuan: "青年中期" },
  // 25-34: 鼻运
  { age: 25, buWei: "年上(右)", position: "鼻梁中部偏右", jieDuan: "青年后期" },
  { age: 26, buWei: "寿上(左)", position: "鼻梁下部偏左", jieDuan: "青年后期" },
  { age: 27, buWei: "寿上(右)", position: "鼻梁下部偏右", jieDuan: "青年后期" },
  { age: 28, buWei: "准头", position: "鼻尖", jieDuan: "青年后期" },
  { age: 29, buWei: "兰台", position: "左鼻翼", jieDuan: "青年后期" },
  { age: 30, buWei: "廷尉", position: "右鼻翼", jieDuan: "壮年前期" },
  { age: 31, buWei: "人中(左)", position: "人中偏左", jieDuan: "壮年前期" },
  { age: 32, buWei: "人中(右)", position: "人中偏右", jieDuan: "壮年前期" },
  { age: 33, buWei: "水星(上唇)", position: "上唇", jieDuan: "壮年前期" },
  { age: 34, buWei: "承浆(下唇)", position: "下唇", jieDuan: "壮年前期" },
  // 35-44: 口运
  { age: 35, buWei: "左口角", position: "左嘴角", jieDuan: "壮年中期" },
  { age: 36, buWei: "右口角", position: "右嘴角", jieDuan: "壮年中期" },
  { age: 37, buWei: "左法令", position: "左法令纹", jieDuan: "壮年中期" },
  { age: 38, buWei: "右法令", position: "右法令纹", jieDuan: "壮年中期" },
  { age: 39, buWei: "左颧骨", position: "左颧骨", jieDuan: "壮年中期" },
  { age: 40, buWei: "右颧骨", position: "右颧骨", jieDuan: "壮年后期" },
  { age: 41, buWei: "左眼下", position: "左眼下方泪堂", jieDuan: "壮年后期" },
  { age: 42, buWei: "右眼下", position: "右眼下方泪堂", jieDuan: "壮年后期" },
  { age: 43, buWei: "左耳前", position: "左耳前鬓角", jieDuan: "壮年后期" },
  { age: 44, buWei: "右耳前", position: "右耳前鬓角", jieDuan: "壮年后期" },
  // 45-54: 颏运
  { age: 45, buWei: "地库(左)", position: "下巴左侧", jieDuan: "中年初期" },
  { age: 46, buWei: "地库(右)", position: "下巴右侧", jieDuan: "中年初期" },
  { age: 47, buWei: "地阁(左)", position: "下巴左部", jieDuan: "中年初期" },
  { age: 48, buWei: "地阁(右)", position: "下巴右部", jieDuan: "中年初期" },
  { age: 49, buWei: "海底", position: "下巴底部中央", jieDuan: "中年初期" },
  { age: 50, buWei: "虎耳(左)", position: "左耳垂前部", jieDuan: "中年中期" },
  { age: 51, buWei: "虎耳(右)", position: "右耳垂前部", jieDuan: "中年中期" },
  { age: 52, buWei: "金匮(左)", position: "左嘴角下方", jieDuan: "中年中期" },
  { age: 53, buWei: "金匮(右)", position: "右嘴角下方", jieDuan: "中年中期" },
  { age: 54, buWei: "归来(左)", position: "左下颔边缘", jieDuan: "中年中期" },
  // 55-64: 老人运
  { age: 55, buWei: "归来(右)", position: "右下颔边缘", jieDuan: "中年后期" },
  { age: 56, buWei: "颂堂(左)", position: "左颈上部", jieDuan: "中年后期" },
  { age: 57, buWei: "颂堂(右)", position: "右颈上部", jieDuan: "中年后期" },
  { age: 58, buWei: "政堂(左)", position: "左耳后", jieDuan: "中年后期" },
  { age: 59, buWei: "政堂(右)", position: "右耳后", jieDuan: "中年后期" },
  { age: 60, buWei: "耳珠(左)", position: "左耳垂珠", jieDuan: "老年初期" },
  { age: 61, buWei: "耳珠(右)", position: "右耳垂珠", jieDuan: "老年初期" },
  { age: 62, buWei: "面颊(左)", position: "左脸颊中", jieDuan: "老年初期" },
  { age: 63, buWei: "面颊(右)", position: "右脸颊中", jieDuan: "老年初期" },
  { age: 64, buWei: "腮骨(左)", position: "左腮骨", jieDuan: "老年初期" },
];

const BUWEI_OVERVIEW: MianXiangBuWeiOverview[] = [
  { category: "耳运", ageRange: "1-14岁", buWeiList: ["天轮","人轮","地轮","天城"], description: "耳为肾之窍，1-14岁看耳。耳轮廓分明饱满者，幼年安康聪慧；耳薄无轮廓者，幼年体弱多病。" },
  { category: "额运", ageRange: "9-20岁", buWeiList: ["天中","天庭","司空","中正","印堂"], description: "额为火，9-20岁看额。额相饱满宽阔光滑者早运通达；额窄削低陷者早年辛苦。" },
  { category: "眉运", ageRange: "15-24岁", buWeiList: ["火星","罗睺","计都","眉中","眉尾"], description: "眉为兄弟宫，15-24岁看眉。眉清秀有彩者兄弟朋友多助；眉粗乱逆生者人际关系复杂。" },
  { category: "眼运", ageRange: "21-30岁", buWeiList: ["眼","眼下","泪堂","山根"], description: "眼为监察官，21-30岁看眼。眼神清亮黑白分明者事业初显；眼浊无神者一事无成。" },
  { category: "鼻运", ageRange: "25-44岁", buWeiList: ["年上","寿上","准头","兰台","廷尉"], description: "鼻为财帛宫，25-44岁看鼻。鼻梁直挺鼻头有肉者中年财运亨通；鼻梁塌鼻头尖薄者财运不佳。" },
  { category: "口运", ageRange: "33-44岁", buWeiList: ["水星","承浆","口角","法令"], description: "口为出纳官，33-44岁看口。口角上扬唇红齿白者正行运；嘴角下垂唇薄者易犯小人。" },
  { category: "颧运", ageRange: "39-50岁", buWeiList: ["颧骨","颧柄"], description: "颧为权骨，39-50岁看颧。颧高有肉包裹者有权有势；颧高突出无肉者主观强、人缘差。" },
  { category: "颏运", ageRange: "45-60岁", buWeiList: ["地库","地阁","海底","金匮"], description: "下巴为地阁，45-60岁看颏。地阁方圆饱满有肉者晚运昌盛；下巴尖削短小者老来奔波。" },
  { category: "老运", ageRange: "60-99岁", buWeiList: ["耳珠","面颊","腮骨","颂堂","政堂"], description: "60岁以后复看耳，耳珠圆满者长寿；腮骨方厚者晚年安稳；面颊清朗者福寿双全。" },
];

export function calculateMianXiangLiuNian(input: Record<string, unknown>): MianXiangLiuNianResult {
  const gender = (input.gender as "男" | "女") || "男";
  const targetAge = (input.age as number) || 30;
  const buWei = (input.buWei as string) || "";

  const liuNianList: LiuNianBuWeiItem[] = [];
  for (const cfg of LIUNIAN_BW) {
    const yunLevel = cfg.jieDuan.includes("幼") || cfg.jieDuan.includes("少年") ? "根基运"
      : cfg.jieDuan.includes("青年") ? "发展运"
      : cfg.jieDuan.includes("壮年") ? "上升运"
      : cfg.jieDuan.includes("中年") ? "巅峰运"
      : "守成运";

    liuNianList.push({
      age: cfg.age, buWei: cfg.buWei, position: cfg.position, jieDuan: cfg.jieDuan,
      yunQiLevel: yunLevel,
      describe: `${cfg.age}岁流年看「${cfg.buWei}」(${cfg.position})，属${cfg.jieDuan}。${yunLevel === "巅峰运" ? "此年人生最重要节点" : yunLevel === "发展运" || yunLevel === "上升运" ? "此年发展关键" : "此年为命运基础"}，该部位气色红润丰满为吉，青黑枯槁为凶。`,
      advice: yunLevel === "巅峰运" ? "把握机遇，全力以赴" : yunLevel === "发展运" || yunLevel === "上升运" ? "积极进取，积累实力" : "稳扎稳打，打好基础",
    });
  }

  const currentBuWei = liuNianList.find(l => l.age === targetAge) || null;

  let filtered = liuNianList;
  if (buWei) filtered = liuNianList.filter(l => l.buWei.includes(buWei));

  const summary = `${gender === "男" ? "男性" : "女性"}面相流年运气查询。`
    + `当前${targetAge}岁看「${currentBuWei?.buWei || "未知"}」(${currentBuWei?.position || ""})。`
    + `面相流年部位口诀：1-14耳、15-20额、21-30眉眼、25-44鼻、33-44口、39-50颧、45-60颏。`
    + `${currentBuWei?.yunQiLevel === "巅峰运" ? "当前正处人生黄金期，宜大展宏图。" : "当前正处积累上升期，宜厚积薄发。"}`;

  return { currentAge: targetAge, currentBuWei, liuNianList: filtered, buWeiOverview: BUWEI_OVERVIEW, summary };
}

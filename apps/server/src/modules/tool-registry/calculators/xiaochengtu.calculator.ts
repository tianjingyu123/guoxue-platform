// ── 小成图计算引擎 ──
// 算法参考：《灵棋经》《焦氏易林》
// 霍斐然小成图：卦象推演，阖辟往来辨吉凶

import type { XiaoChengTuResult, XiaoChengTuGong } from "@guoxue/shared";

const BA_GUA_8 = ["乾","兑","离","震","巽","坎","艮","坤"] as const;

// 八卦爻象 [下,中,上]
const GUA_YAO: Record<string, number[]> = {
  "乾":[1,1,1],"兑":[0,1,1],"离":[1,0,1],"震":[0,0,1],
  "巽":[1,1,0],"坎":[0,1,0],"艮":[1,0,0],"坤":[0,0,0],
};
const GUA_BY_YAO: Record<string, string> = {
  "1,1,1":"乾","0,1,1":"兑","1,0,1":"离","0,0,1":"震",
  "1,1,0":"巽","0,1,0":"坎","1,0,0":"艮","0,0,0":"坤",
};

// 八卦五行
const GUA_WU_XING: Record<string, string> = {
  "乾":"金","兑":"金","离":"火","震":"木",
  "巽":"木","坎":"水","艮":"土","坤":"土",
};

// 五行相生: shengMap[A] = A所生的五行
const WU_XING_SHENG: Record<string, string> = {
  "木":"火","火":"土","土":"金","金":"水","水":"木",
};

// 阖辟：阳卦为阖，阴卦为辟（霍斐然小成图）
const HE_GUA = new Set(["乾","坎","艮","震"]);

// 64卦卦名
const GUA_MAP: Record<string, string> = {
  "1,1":"乾为天","1,2":"天泽履","1,3":"天火同人","1,4":"天雷无妄","1,5":"天风姤","1,6":"天水讼","1,7":"天山遁","1,8":"天地否",
  "2,1":"泽天夬","2,2":"兑为泽","2,3":"泽火革","2,4":"泽雷随","2,5":"泽风大过","2,6":"泽水困","2,7":"泽山咸","2,8":"泽地萃",
  "3,1":"火天大有","3,2":"火泽睽","3,3":"离为火","3,4":"火雷噬嗑","3,5":"火风鼎","3,6":"火水未济","3,7":"火山旅","3,8":"火地晋",
  "4,1":"雷天大壮","4,2":"雷泽归妹","4,3":"雷火丰","4,4":"震为雷","4,5":"雷风恒","4,6":"雷水解","4,7":"雷山小过","4,8":"雷地豫",
  "5,1":"风天小畜","5,2":"风泽中孚","5,3":"风火家人","5,4":"风雷益","5,5":"巽为风","5,6":"风水涣","5,7":"风山渐","5,8":"风地观",
  "6,1":"水天需","6,2":"水泽节","6,3":"水火既济","6,4":"水雷屯","6,5":"水风井","6,6":"坎为水","6,7":"水山蹇","6,8":"水地比",
  "7,1":"山天大畜","7,2":"山泽损","7,3":"山火贲","7,4":"山雷颐","7,5":"山风蛊","7,6":"山水蒙","7,7":"艮为山","7,8":"山地剥",
  "8,1":"地天泰","8,2":"地泽临","8,3":"地火明夷","8,4":"地雷复","8,5":"地风升","8,6":"地水师","8,7":"地山谦","8,8":"坤为地",
};

const POS_DIRECTION: Record<number, string> = {
  1:"正北", 2:"西南", 3:"正东", 4:"东南", 5:"中央", 6:"西北", 7:"正西", 8:"东北", 9:"正南",
};

function numToGuaIdx(num: number): number {
  const r = num % 8;
  return r === 0 ? 8 : r;
}

function guaIdxToName(idx: number): string {
  return BA_GUA_8[idx - 1];
}

/** 判断阖辟：阳卦为阖，阴卦为辟 */
function getHeBi(tianGua: string): "阖" | "辟" {
  return HE_GUA.has(tianGua) ? "阖" : "辟";
}

/** 判断往来：基于天地盘五行生克 */
function getWangLai(tianGua: string, diGua: string): "往" | "来" | "不动" {
  if (tianGua === diGua) return "不动";
  const tianWx = GUA_WU_XING[tianGua];
  const diWx = GUA_WU_XING[diGua];
  if (!tianWx || !diWx) return "不动";
  // 天生地 → 往（天盘主动向下）
  if (WU_XING_SHENG[tianWx] === diWx) return "往";
  // 地生天 → 来（地盘主动向上）
  if (WU_XING_SHENG[diWx] === tianWx) return "来";
  return "不动";
}

/** 64卦的取象解读 */
const CHENG_GUA_QUXIANG: Record<string, string> = {
  "乾为天":"纯阳刚健，君临天下。主创造进取，领导统御。",
  "天泽履":"履虎尾而不咥，亨。履道坦坦，慎行戒惧。",
  "天火同人":"同人于野，亨。志同道合，共谋大业。",
  "天雷无妄":"无妄之灾，或系之牛。行有意外，守正则亨。",
  "天风姤":"女壮，勿用取女。邂逅相遇，机遇与风险并存。",
  "天水讼":"有孚窒惕，中吉终凶。争讼宜解不宜结。",
  "天山遁":"遁尾厉，勿用有攸往。退避自保，守时待机。",
  "天地否":"否之匪人，不利君子贞。天地不交，闭塞不通。",
  "泽天夬":"扬于王庭，孚号有厉。决断除害，果敢行动。",
  "兑为泽":"兑，亨利贞。悦而应乎人，言谈交际之美。",
  "泽火革":"巳日乃孚，革面洗心。改弦更张，革故鼎新。",
  "泽雷随":"元亨利贞，无咎。天下随时，随和应变。",
  "泽风大过":"栋桡，利有攸往，亨。过犹不及，宜守中道。",
  "泽水困":"困而不失其所，亨。时运不济，守志待时。",
  "泽山咸":"亨利贞，取女吉。感而遂通，人情感应。",
  "泽地萃":"聚而升，萃聚之象。人才汇聚，团结有力。",
  "火天大有":"自天佑之，吉无不利。富有四海，德配天地。",
  "火泽睽":"小事吉。乖离而合，异中求同。",
  "离为火":"明两作离，大人以继明照四方。光明磊落，文明之象。",
  "火雷噬嗑":"亨，利用狱。齿合物也，刑罚公正。",
  "火风鼎":"元吉亨。鼎新革故，立制建业。",
  "火水未济":"小狐汔济，濡其尾。事未竟成，功亏一篑。",
  "火山旅":"旅贞吉。行旅在外，漂泊不定。",
  "火地晋":"康侯用锡马蕃庶，昼日三接。进升之喜，蒸蒸日上。",
  "雷天大壮":"利贞。刚健而动，势不可挡。",
  "雷泽归妹":"征凶，无攸利。婚嫁之象，归附和谐。",
  "雷火丰":"亨，王假之。丰盛盈满，如日中天。",
  "震为雷":"震惊百里，不丧匕鬯。雷霆万钧，震慑四方。",
  "雷风恒":"亨无咎，利贞。恒久不变，守道有常。",
  "雷水解":"利西南，无所往。解难济困，转危为安。",
  "雷山小过":"可小事不可大事。小有过越，宜下不宜上。",
  "雷地豫":"利建侯行师。豫乐之象，安逸和顺。",
  "风天小畜":"密云不雨，自我西郊。畜养待发，积累以时。",
  "风泽中孚":"豚鱼吉，利涉大川。诚信感物，信及众生。",
  "风火家人":"利女贞。家道正而天下定矣。",
  "风雷益":"利有攸往，利涉大川。损上益下，增益之喜。",
  "巽为风":"重巽以申命。顺乎刚中，谦逊有礼。",
  "风水涣":"涣奔其机，涣散也。分离而后聚，散中求合。",
  "风山渐":"女归吉，利贞。循序渐进，量力而行。",
  "风地观":"观天之神道，四时不忒。观察审视，静观其变。",
  "水天需":"需于沙，需待也。待时而动，不宜急躁。",
  "水泽节":"节以制度，不伤财不害民。节制有度，知足常乐。",
  "水火既济":"亨小，利贞。初吉终乱。事已告成，居安思危。",
  "水雷屯":"刚柔始交而难生。艰难创始，慎始慎终。",
  "水风井":"改邑不改井。养而无穷，取之不尽。",
  "坎为水":"习坎，重险也。涉险渡难，临危不惧。",
  "水山蹇":"利西南不利东北。险在前也，艰难险阻。",
  "水地比":"吉，亲比也。亲近和睦，团结协力。",
  "山天大畜":"利贞，不家食吉。畜德养贤，厚积薄发。",
  "山泽损":"损下益上，损刚益柔。有失有得，损益之道。",
  "山火贲":"亨小利有攸往。文饰之象，内外兼修。",
  "山雷颐":"贞吉，观颐自求口实。颐养天年，知足常乐。",
  "山风蛊":"元亨，利涉大川。蛊坏之象，拯弊救衰。",
  "山水蒙":"匪我求童蒙，童蒙求我。启蒙发智，教育之象。",
  "艮为山":"艮其背，不获其身。止其所也，安守本分。",
  "山地剥":"不利有攸往。小人道长，君子道消。剥落衰败。",
  "地天泰":"小往大来，吉亨。天地交而万物通。",
  "地泽临":"元亨利贞，至于八月有凶。君临天下，监临四方。",
  "地火明夷":"利艰贞。明入地中，韬光养晦。",
  "地雷复":"出入无疾，朋来无咎。一阳来复，万象更新。",
  "地风升":"元亨，用见大人。积小成高，升进之象。",
  "地水师":"贞丈人吉，无咎。师旅之象，统兵率众。",
  "地山谦":"亨，君子有终。谦卑自牧，卑以自守。",
  "坤为地":"万物资生，乃顺承天。厚德载物，包容广大。",
};

export function calculateXiaoChengTu(input: Record<string, unknown>): XiaoChengTuResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const method = (input.method as string) ?? "shici";
  const numbers = input.numbers as [number, number, number] | undefined;
  const chars = input.chars as string | undefined;
  const question = input.question as string ?? "";

  const d = new Date(datetime);
  let upNum: number, lowNum: number, dongYao: number;

  if (method === "baoshu" && numbers) {
    upNum = numToGuaIdx(numbers[0]);
    lowNum = numToGuaIdx(numbers[1]);
    dongYao = numbers[2] % 6 || 6;
  } else if (method === "zimu" && chars) {
    const codes = [...chars].map(c => c.charCodeAt(0));
    upNum = codes[0] % 8 || 8;
    lowNum = (codes[1] ?? codes[0]) % 8 || 8;
    dongYao = (codes[2] ?? codes[0]) % 6 || 6;
  } else {
    // 时间起卦（梅花易数法）
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    upNum = numToGuaIdx(year + month + day);
    lowNum = numToGuaIdx(month + day + hour);
    dongYao = (year + month + day + hour) % 6 || 6;
  }

  const shangGua = guaIdxToName(upNum);
  const xiaGua = guaIdxToName(lowNum);
  const benGuaKey = `${upNum},${lowNum}`;
  const benGuaName = GUA_MAP[benGuaKey] ?? `${shangGua}${xiaGua}`;

  // 互卦
  const benYaoShang = GUA_YAO[shangGua] ?? [1,1,1];
  const benYaoXia = GUA_YAO[xiaGua] ?? [1,1,1];
  const huShangYao = [benYaoXia[1], benYaoXia[2], benYaoShang[0]];
  const huXiaYao = [benYaoXia[2], benYaoShang[0], benYaoShang[1]];
  const huShang = GUA_BY_YAO[huShangYao.join(",")] ?? "乾";
  const huXia = GUA_BY_YAO[huXiaYao.join(",")] ?? "乾";
  const huShangIdx = BA_GUA_8.indexOf(huShang as typeof BA_GUA_8[number]) + 1;
  const huXiaIdx = BA_GUA_8.indexOf(huXia as typeof BA_GUA_8[number]) + 1;
  const huGuaName = GUA_MAP[`${huShangIdx},${huXiaIdx}`] ?? "";

  // 变卦
  const dongInShang = dongYao <= 3;
  const yaoIdx = dongInShang ? dongYao - 1 : dongYao - 4;
  const targetYao = dongInShang ? [...benYaoShang] : [...benYaoXia];
  targetYao[yaoIdx] = 1 - targetYao[yaoIdx];
  const changedGua = GUA_BY_YAO[targetYao.join(",")] ?? "乾";
  const bianShang = dongInShang ? changedGua : shangGua;
  const bianXia = dongInShang ? xiaGua : changedGua;
  const bianShangIdx = BA_GUA_8.indexOf(bianShang as typeof BA_GUA_8[number]) + 1;
  const bianXiaIdx = BA_GUA_8.indexOf(bianXia as typeof BA_GUA_8[number]) + 1;
  const bianGuaName = GUA_MAP[`${bianShangIdx},${bianXiaIdx}`] ?? "";

  // ── 小成图九宫（霍斐然归藏法） ──
  // 天盘卦：本卦各爻变后所得（归藏入宫）
  // 地盘卦：各宫先天八卦（后天方位对应先天卦）
  const gongs: XiaoChengTuGong[] = [];

  // 本卦上卦→中5宫天盘
  // 按八宫卦序推演：坎1坤2震3巽4中5乾6兑7艮8离9
  // 天盘由本卦推演得到，各宫不同
  // 简化：天盘=本卦之各变爻卦，地盘=后天八卦本宫
  const baGongGua = ["坎","坤","震","巽","中","乾","兑","艮","离"];

  // 归藏法推天盘：中5宫归藏得天盘乾，各宫依次排列
  for (let pos = 1; pos <= 9; pos++) {
    // 地盘卦：该宫后天方位对应的八纯卦
    const diGua = baGongGua[pos - 1];
    if (diGua === "中") {
      gongs.push({
        pos: 5 as any,
        direction: POS_DIRECTION[5],
        tianPanGua: shangGua as any,
        diPanGua: shangGua as any,
        chengGua: benGuaName,
        heBi: getHeBi(shangGua),
        wangLai: "不动",
      });
      continue;
    }

    // 天盘卦：从本卦依归藏法推演（简化：按动爻偏移）
    const tianGuaIdx = (pos + dongYao - 1) % 8;
    const tianGua = BA_GUA_8[tianGuaIdx];
    const diGuaIdx = BA_GUA_8.indexOf(diGua as typeof BA_GUA_8[number]);
    const chengIdx = `${tianGuaIdx + 1},${diGuaIdx + 1}`;
    const chengGua = GUA_MAP[chengIdx] ?? `${tianGua}${diGua}`;
    const heBi = getHeBi(tianGua);
    const wangLai = getWangLai(tianGua, diGua);

    gongs.push({
      pos: pos as any,
      direction: POS_DIRECTION[pos] ?? "中",
      tianPanGua: tianGua as any,
      diPanGua: diGua as any,
      chengGua,
      heBi,
      wangLai,
    });
  }

  // 阖辟往来统计
  const heGongs = gongs.filter(g => g.heBi === "阖").map(g => g.pos) as number[];
  const biGongs = gongs.filter(g => g.heBi === "辟").map(g => g.pos) as number[];
  const wangGongs = gongs.filter(g => g.wangLai === "往").map(g => g.pos) as number[];
  const laiGongs = gongs.filter(g => g.wangLai === "来").map(g => g.pos) as number[];

  // ── 推演：逐宫分析 ──
  const tuiDuan = gongs.map(g => {
    const quxiang = CHENG_GUA_QUXIANG[g.chengGua] ?? `${g.chengGua}之象，观其阖辟往来以辨吉凶。`;
    const heBiDesc = g.heBi === "阖" ? "阖者藏，宜守不宜攻" : "辟者显，宜进取开拓";
    const wlDesc = g.wangLai === "往" ? "气往外走，宜主动出击"
      : g.wangLai === "来" ? "气往内来，利收成接纳"
      : "天地比和，守中为上";

    const duanYu = `${g.direction}${g.chengGua}：${quxiang} ${heBiDesc}。${wlDesc}。`;
    // 正推走中宫+阖宫，旁推走旁通
    const tuiType: "正推" | "旁推" = g.pos === 5 || g.heBi === "阖" ? "正推" : "旁推";
    return { type: tuiType, gong: g.pos, quXiang: quxiang, duanYu };
  });

  const process = `以${method === "baoshu" ? "报数" : method === "zimu" ? "字母" : "时间"}起卦：上卦${shangGua}(${upNum})，下卦${xiaGua}(${lowNum})，动爻${dongYao}。本卦${benGuaName}，互卦${huGuaName}，变卦${bianGuaName}。`;

  return {
    input: { datetime, method: method as any, numbers, chars, question },
    basicInfo: { ganZhi: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`, process },
    gongs,
    mainGua: {
      benGua: benGuaName, huGua: huGuaName, bianGua: bianGuaName,
      dongYao,
      guaCi: CHENG_GUA_QUXIANG[benGuaName]?.slice(0, 20) ?? "",
      yaoCi: `动爻第${dongYao}爻，${dongInShang ? "上卦" : "下卦"}变。`,
    },
    heBiWangLai: {
      heGongs: heGongs as any[], biGongs: biGongs as any[],
      wangGongs: wangGongs as any[], laiGongs: laiGongs as any[],
      desc: `阖宫${heGongs.length}个（${heGongs.join("、")}），辟宫${biGongs.length}个（${biGongs.join("、")}）。往来之间，${wangGongs.length > laiGongs.length ? "气机往外，宜主动进取" : laiGongs.length > wangGongs.length ? "气机往内，宜守成接纳" : "往来得中，动静皆宜"}。`,
    },
    tuiDuan: tuiDuan as any,
    duanYu: `${benGuaName}，动爻${dongYao}。阖辟往来之间，观其动静变化。${question ? `所问"${question}"，${heGongs.length > biGongs.length ? "阖宫居多，宜内敛保守，审慎决策" : "辟宫居多，宜积极行动，把握时机"}。` : ""}`,
  };
}

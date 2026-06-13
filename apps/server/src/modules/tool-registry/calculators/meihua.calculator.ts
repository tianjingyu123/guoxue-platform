// ── 梅花易数计算引擎 ──
// 算法参考：《梅花易数》《易学启蒙》
// 时间/数字起卦 + 体用生克 + 策轨计算 + 万物类象 + 64卦卦辞

import type { MeiHuaResult } from "@guoxue/shared";

const BA_GUA = [
  { num:1, name:"乾", wuXing:"金", symbol:"☰" },
  { num:2, name:"兑", wuXing:"金", symbol:"☱" },
  { num:3, name:"离", wuXing:"火", symbol:"☲" },
  { num:4, name:"震", wuXing:"木", symbol:"☳" },
  { num:5, name:"巽", wuXing:"木", symbol:"☴" },
  { num:6, name:"坎", wuXing:"水", symbol:"☵" },
  { num:7, name:"艮", wuXing:"土", symbol:"☶" },
  { num:8, name:"坤", wuXing:"土", symbol:"☷" },
];

// ── 万物类象（八卦取象，12维度）──
// 数据参考：《梅花易数·八卦万物类象》《周易·说卦传》
const WAN_WU_LEI_XIANG: Record<string, Record<string, string>> = {
  "乾": { tianShi:"天、冰、雹、霰", diLi:"西北方、京都、形胜高地", renWu:"君父、大人、老人、长官", shenTi:"首、骨、肺", dongWu:"马、天鹅、狮、象", jingWu:"金玉、珠宝、圆物、冠镜", wuShe:"公廨、楼台、高堂、驿舍", hunYin:"官贵之眷、威仪之家", yinShi:"马肉、珍味、多骨、干腊", qiuMing:"宜随朝待聘、达官贵人", wuSe:"大赤、玄色", wuWei:"辛、辣" },
  "兑": { tianShi:"雨泽、新月、星", diLi:"西方、泽畔、缺池、废井", renWu:"少女、妾、歌伎、巫师", shenTi:"口、舌、肺、喉", dongWu:"羊、豹、猿、水禽", jingWu:"金刃、乐器、缺器、废物", wuShe:"近泽之居、败墙绝壁", hunYin:"少女配长男、口舌之争", yinShi:"羊肉、辛辣、腌渍", qiuMing:"宜西方、武职、刑官", wuSe:"白", wuWei:"辛、辣" },
  "离": { tianShi:"日、电、虹、霞", diLi:"南方、炉冶之所、向阳地", renWu:"中女、文人、甲胄之士", shenTi:"目、心、上焦", dongWu:"雉、龟、蚌、孔雀", jingWu:"文书、甲骨、干戈、槁木", wuShe:"明堂、虚阁、灶舍", hunYin:"文化之家、书香门第", yinShi:"雉肉、煎炒、干脯", qiuMing:"宜南方、文书、文学之职", wuSe:"赤、红", wuWei:"苦" },
  "震": { tianShi:"雷", diLi:"东方、大途、闹市、竹林", renWu:"长男", shenTi:"足、肝、发、声音", dongWu:"龙、蛇、马、鸣虫", jingWu:"乐器、草木、鲜花、蔬果", wuShe:"山林之居、东向之屋、楼阁", hunYin:"长男配长女、可成", yinShi:"蹄、肉、鲜味、酸果", qiuMing:"宜东方、山林管理、木业", wuSe:"青、绿、碧", wuWei:"酸" },
  "巽": { tianShi:"风", diLi:"东南方、花果菜园、草木茂秀之所", renWu:"长女、寡妇、山林仙道之人", shenTi:"股肱、气、肝", dongWu:"鸡、百禽、蛇", jingWu:"绳直之物、工巧之器、扇、帆", wuShe:"寺观、山林仙居、东南向舍", hunYin:"长女配长男、可成之家", yinShi:"鸡肉、山林野味、蔬果、酸味", qiuMing:"宜东南、香火、僧道、林艺", wuSe:"青绿、碧、白", wuWei:"酸" },
  "坎": { tianShi:"月、雨、雪、露、霜", diLi:"北方、江湖、溪涧、卑湿之地", renWu:"中男、江湖之人、盗贼", shenTi:"耳、血、肾", dongWu:"豕、鱼、狐", jingWu:"水具、弓轮、蒺藜、带核之物", wuShe:"近水之居、向北之屋、水阁江楼", hunYin:"中男配中女、有险", yinShi:"豕肉、酒、冷味、羹汤", qiuMing:"宜北方、江湖、水利、鱼盐", wuSe:"黑", wuWei:"咸" },
  "艮": { tianShi:"云、雾、山岚", diLi:"东北方、山径、丘陵、坟墓", renWu:"少男、闲人、山中人", shenTi:"手、指、背、鼻", dongWu:"狗、鼠、黔喙之属", jingWu:"土石、瓜果、闾寺之物", wuShe:"山居、近路之宅、东北向", hunYin:"少男配少女、阻隔", yinShi:"野味、果实、笋蕨", qiuMing:"宜东北、山城、土产、僧道", wuSe:"黄", wuWei:"甘" },
  "坤": { tianShi:"云阴、雾气", diLi:"西南方、田野、乡里、平地", renWu:"老母、农夫、乡人、众人", shenTi:"腹、脾、肉", dongWu:"牛、百兽、牝马", jingWu:"方物、柔物、布帛、釜甑", wuShe:"村舍、矮屋、仓库、西南向", hunYin:"宜乡里之家、寡妇之家", yinShi:"牛肉、土中物、甘味", qiuMing:"宜西南方、农耕、土地之职", wuSe:"黄、黑", wuWei:"甘" },
};

// ── 64卦卦辞（周易经文简释）──
const GUA_CI_64: Record<string, string> = {
  "乾为天":"元亨利贞。天行健，君子以自强不息。",
  "天泽履":"履虎尾，不咥人，亨。君子以辨上下，定民志。",
  "天火同人":"同人于野，亨。利涉大川，利君子贞。君子以类族辨物。",
  "天雷无妄":"元亨利贞。其匪正有眚，不利有攸往。先王以茂对时育万物。",
  "天风姤":"女壮，勿用取女。后以施命诰四方。",
  "天水讼":"有孚窒惕，中吉终凶。利见大人，不利涉大川。君子以作事谋始。",
  "天山遁":"亨，小利贞。君子以远小人，不恶而严。",
  "天地否":"否之匪人，不利君子贞，大往小来。君子以俭德辟难，不可荣以禄。",
  "泽天夬":"扬于王庭，孚号有厉。君子以施禄及下，居德则忌。",
  "兑为泽":"亨利贞。君子以朋友讲习。",
  "泽火革":"巳日乃孚，元亨利贞，悔亡。君子以治历明时。",
  "泽雷随":"元亨利贞，无咎。君子以向晦入宴息。",
  "泽风大过":"栋桡，利有攸往，亨。君子以独立不惧，遁世无闷。",
  "泽水困":"亨贞，大人吉，无咎，有言不信。君子以致命遂志。",
  "泽山咸":"亨利贞，取女吉。君子以虚受人。",
  "泽地萃":"亨。王假有庙，利见大人，亨利贞。君子以除戎器，戒不虞。",
  "火天大有":"元亨。君子以遏恶扬善，顺天休命。",
  "火泽睽":"小事吉。君子以同而异。",
  "离为火":"利贞亨。畜牝牛吉。大人以继明照于四方。",
  "火雷噬嗑":"亨，利用狱。先王以明罚敕法。",
  "火风鼎":"元吉亨。君子以正位凝命。",
  "火水未济":"亨，小狐汔济，濡其尾，无攸利。君子以慎辨物居方。",
  "火山旅":"小亨，旅贞吉。君子以明慎用刑而不留狱。",
  "火地晋":"康侯用锡马蕃庶，昼日三接。君子以自昭明德。",
  "雷天大壮":"利贞。君子以非礼弗履。",
  "雷泽归妹":"征凶，无攸利。君子以永终知敝。",
  "雷火丰":"亨，王假之，勿忧，宜日中。君子以折狱致刑。",
  "震为雷":"亨。震来虩虩，笑言哑哑。君子以恐惧修省。",
  "雷风恒":"亨，无咎，利贞，利有攸往。君子以立不易方。",
  "雷水解":"利西南，无所往，其来复吉。君子以赦过宥罪。",
  "雷山小过":"亨利贞，可小事不可大事。君子以行过乎恭，丧过乎哀，用过乎俭。",
  "雷地豫":"利建侯行师。先王以作乐崇德，殷荐之上帝以配祖考。",
  "风天小畜":"亨，密云不雨，自我西郊。君子以懿文德。",
  "风泽中孚":"豚鱼吉，利涉大川，利贞。君子以议狱缓死。",
  "风火家人":"利女贞。君子以言有物而行有恒。",
  "风雷益":"利有攸往，利涉大川。君子以见善则迁，有过则改。",
  "巽为风":"小亨，利有攸往，利见大人。君子以申命行事。",
  "风水涣":"亨。王假有庙，利涉大川，利贞。君子以享于帝立庙。",
  "风山渐":"女归吉，利贞。君子以居贤德善俗。",
  "风地观":"盥而不荐，有孚颙若。先王以省方观民设教。",
  "水天需":"有孚，光亨，贞吉，利涉大川。君子以饮食宴乐。",
  "水泽节":"亨，苦节不可贞。君子以制数度，议德行。",
  "水火既济":"亨小利贞，初吉终乱。君子以思患而预防之。",
  "水雷屯":"元亨利贞，勿用有攸往，利建侯。君子以经纶。",
  "水风井":"改邑不改井，无丧无得。君子以劳民劝相。",
  "坎为水":"有孚，维心亨，行有尚。君子以常德行，习教事。",
  "水山蹇":"利西南，不利东北。利见大人，贞吉。君子以反身修德。",
  "水地比":"吉，原筮元永贞，无咎。先王以建万国亲诸侯。",
  "山天大畜":"利贞，不家食吉，利涉大川。君子以多识前言往行以畜其德。",
  "山泽损":"有孚元吉，无咎可贞，利有攸往。君子以惩忿窒欲。",
  "山火贲":"亨小利有攸往。君子以明庶政，无敢折狱。",
  "山雷颐":"贞吉，观颐，自求口实。君子以慎言语节饮食。",
  "山风蛊":"元亨，利涉大川，先甲三日，后甲三日。君子以振民育德。",
  "山水蒙":"亨。匪我求童蒙，童蒙求我。君子以果行育德。",
  "艮为山":"艮其背，不获其身，行其庭，不见其人，无咎。君子以思不出其位。",
  "山地剥":"不利有攸往。上以厚下安宅。",
  "地天泰":"小往大来，吉亨。天地交而万物通也。后以财成天地之道，辅相天地之宜以左右民。",
  "地泽临":"元亨利贞，至于八月有凶。君子以教思无穷，容保民无疆。",
  "地火明夷":"利艰贞。君子以莅众用晦而明。",
  "地雷复":"亨。出入无疾，朋来无咎。先王以至日闭关，商旅不行，后不省方。",
  "地风升":"元亨，用见大人，勿恤，南征吉。君子以顺德积小以高大。",
  "地水师":"贞，丈人吉，无咎。君子以容民畜众。",
  "地山谦":"亨，君子有终。君子以裒多益寡，称物平施。",
  "坤为地":"元亨，利牝马之贞。地势坤，君子以厚德载物。",
};

// ── 384爻辞（周易经文简释，按卦名索引）──
const YAO_CI: Record<string, string[]> = {
  "乾为天":["潜龙勿用。","见龙在田，利见大人。","君子终日乾乾，夕惕若厉，无咎。","或跃在渊，无咎。","飞龙在天，利见大人。","亢龙有悔。"],
  "坤为地":["履霜，坚冰至。","直方大，不习无不利。","含章可贞，或从王事，无成有终。","括囊，无咎无誉。","黄裳元吉。","龙战于野，其血玄黄。"],
  "震为雷":["震来虩虩，后笑言哑哑，吉。","震来历，亿丧贝，跻于九陵，勿逐，七日得。","震苏苏，震行无眚。","震遂泥。","震往来厉，亿无丧有事。","震索索，视矍矍，征凶。"],
  "巽为风":["进退，利武人之贞。","巽在床下，用史巫纷若，吉无咎。","频巽，吝。","悔亡，田获三品。","贞吉悔亡，无不利，无初有终。","巽在床下，丧其资斧，贞凶。"],
  "坎为水":["习坎，入于坎窞，凶。","坎有险，求小得。","来之坎坎，险且枕，入于坎窞，勿用。","樽酒簋贰，用缶，纳约自牖，终无咎。","坎不盈，祇既平，无咎。","系用徽纆，寘于丛棘，三岁不得，凶。"],
  "离为火":["履错然，敬之无咎。","黄离，元吉。","日昃之离，不鼓缶而歌，则大耋之嗟，凶。","突如其来如，焚如，死如，弃如。","出涕沱若，戚嗟若，吉。","王用出征，有嘉折首，获匪其丑，无咎。"],
  "艮为山":["艮其趾，无咎，利永贞。","艮其腓，不拯其随，其心不快。","艮其限，列其夤，厉薰心。","艮其身，无咎。","艮其辅，言有序，悔亡。","敦艮，吉。"],
  "兑为泽":["和兑，吉。","孚兑，吉，悔亡。","来兑，凶。","商兑未宁，介疾有喜。","孚于剥，有厉。","引兑，未光也。"],
  "地天泰":["拔茅茹，以其汇，征吉。","包荒，用冯河，不遐遗，朋亡，得尚于中行。","无平不陂，无往不复，艰贞无咎。","翩翩，不富以其邻，不戒以孚。","帝乙归妹，以祉元吉。","城复于隍，勿用师，自邑告命，贞吝。"],
  "天地否":["拔茅茹，以其汇，贞吉亨。","包承，小人吉，大人否亨。","包羞。","有命无咎，畴离祉。","休否，大人吉。其亡其亡，系于苞桑。","倾否，先否后喜。"],
  "水火既济":["曳其轮，濡其尾，无咎。","妇丧其茀，勿逐，七日得。","高宗伐鬼方，三年克之，小人勿用。","繻有衣袽，终日戒。","东邻杀牛，不如西邻之禴祭，实受其福。","濡其首，厉。"],
  "火水未济":["濡其尾，吝。","曳其轮，贞吉。","未济，征凶，利涉大川。","贞吉悔亡，震用伐鬼方，三年有赏于大国。","贞吉无悔，君子之光有孚吉。","有孚于饮酒，无咎，濡其首，有孚失是。"],
};

// 默认爻辞（按动爻位置生成）
function getDefaultYaoCi(guaName: string, dongYao: number, yaoCiMap: Record<string, string[]>): string {
  const lines = yaoCiMap[guaName];
  if (lines && lines[dongYao - 1]) return lines[dongYao - 1];
  const posNames = ["初爻","二爻","三爻","四爻","五爻","上爻"];
  return `${guaName}${posNames[dongYao - 1]}动。` + (dongYao <= 3 ? "内卦动主内变，家宅人事有迁。" : "外卦动主外变，事业交际有迁。");
}

const GUA_64_MAP: Record<string, string> = {
  "11":"乾为天","12":"天泽履","13":"天火同人","14":"天雷无妄","15":"天风姤","16":"天水讼","17":"天山遁","18":"天地否",
  "21":"泽天夬","22":"兑为泽","23":"泽火革","24":"泽雷随","25":"泽风大过","26":"泽水困","27":"泽山咸","28":"泽地萃",
  "31":"火天大有","32":"火泽睽","33":"离为火","34":"火雷噬嗑","35":"火风鼎","36":"火水未济","37":"火山旅","38":"火地晋",
  "41":"雷天大壮","42":"雷泽归妹","43":"雷火丰","44":"震为雷","45":"雷风恒","46":"雷水解","47":"雷山小过","48":"雷地豫",
  "51":"风天小畜","52":"风泽中孚","53":"风火家人","54":"风雷益","55":"巽为风","56":"风水涣","57":"风山渐","58":"风地观",
  "61":"水天需","62":"水泽节","63":"水火既济","64":"水雷屯","65":"水风井","66":"坎为水","67":"水山蹇","68":"水地比",
  "71":"山天大畜","72":"山泽损","73":"山火贲","74":"山雷颐","75":"山风蛊","76":"山水蒙","77":"艮为山","78":"山地剥",
  "81":"地天泰","82":"地泽临","83":"地火明夷","84":"地雷复","85":"地风升","86":"地水师","87":"地山谦","88":"坤为地",
};

const GUA_SYMBOL_MAP: Record<string, string> = {
  "乾为天":"䷀","坤为地":"䷁","水雷屯":"䷂","山水蒙":"䷃","水天需":"䷄","天水讼":"䷅","地水师":"䷆","水地比":"䷇",
  "风天小畜":"䷈","天泽履":"䷉","地天泰":"䷊","天地否":"䷋","天火同人":"䷌","火天大有":"䷍","地山谦":"䷎","雷地豫":"䷏",
  "泽雷随":"䷐","山风蛊":"䷑","地泽临":"䷒","风地观":"䷓","火雷噬嗑":"䷔","山火贲":"䷕","山地剥":"䷖","地雷复":"䷗",
  "天雷无妄":"䷘","山天大畜":"䷙","山雷颐":"䷚","泽风大过":"䷛","坎为水":"䷜","离为火":"䷝","泽山咸":"䷞","雷风恒":"䷟",
  "天山遁":"䷠","雷天大壮":"䷡","火地晋":"䷢","地火明夷":"䷣","风火家人":"䷤","火泽睽":"䷥","水山蹇":"䷦","雷水解":"䷧",
  "山泽损":"䷨","风雷益":"䷩","泽天夬":"䷪","天风姤":"䷫","泽地萃":"䷬","地风升":"䷭","水风井":"䷯","泽火革":"䷰",
  "火风鼎":"䷱","震为雷":"䷲","艮为山":"䷳","风山渐":"䷴","雷泽归妹":"䷵","雷火丰":"䷶","火山旅":"䷷","巽为风":"䷸",
  "兑为泽":"䷹","风水涣":"䷺","水泽节":"䷻","风泽中孚":"䷼","雷山小过":"䷽","水火既济":"䷾","火水未济":"䷿",
};

// 卦数 ↔ 三爻卦象互转（上→下：1=阳0=阴）
const NUM_YAO_MAP: Record<number, number[]> = {
  1:[1,1,1], 2:[0,1,1], 3:[1,0,1], 4:[0,0,1],
  5:[1,1,0], 6:[0,1,0], 7:[1,0,0], 8:[0,0,0],
};
const YAO_NUM_MAP: Record<string, number> = {
  "111":1, "011":2, "101":3, "001":4, "110":5, "010":6, "100":7, "000":8,
};

function getGua(num: number) { return BA_GUA.find(g => g.num === num) ?? BA_GUA[0]; }
function getGuaName(up: number, low: number): string { return GUA_64_MAP[`${up}${low}`] ?? `${getGua(up).name}${getGua(low).name}`; }
function getGuaSymbol(name: string): string { return GUA_SYMBOL_MAP[name] ?? "?"; }

function numToGua(n: number): number {
  const r = n % 8;
  return r === 0 ? 8 : r;
}

function dongYaoCalc(n: number): number {
  const r = n % 6;
  return r === 0 ? 6 : r;
}

/** 卦数→三爻数组（上→下） */
function guaNumToYao(num: number): number[] {
  return [...(NUM_YAO_MAP[num] ?? [1,1,1])];
}

/** 三爻数组→卦数 */
function yaoToGuaNum(yao: number[]): number {
  return YAO_NUM_MAP[yao.join("")] ?? 1;
}

/** 爻变：翻转三爻卦中的指定爻位(0=上,1=中,2=下)，返回新卦数 */
function flipYao(guaNum: number, yaoIdx: number): number {
  const yao = guaNumToYao(guaNum);
  yao[yaoIdx] = 1 - yao[yaoIdx];
  return yaoToGuaNum(yao);
}

function tiYongRelation(tiWuXing: string, yongWuXing: string): string {
  const order = ["金","水","木","火","土"];
  const tiIdx = order.indexOf(tiWuXing);
  const yongIdx = order.indexOf(yongWuXing);
  if (tiIdx === yongIdx) return "ti-yong-bihe";
  if ((yongIdx + 1) % 5 === tiIdx) return "yong-sheng-ti";
  if ((tiIdx + 1) % 5 === yongIdx) return "ti-sheng-yong";
  if ((tiIdx + 2) % 5 === yongIdx || (tiIdx + 3) % 5 === yongIdx) return "ti-ke-yong";
  return "yong-ke-ti";
}

function getSeason(month: number): string {
  if (month <= 3) return "春"; if (month <= 6) return "夏"; if (month <= 9) return "秋"; return "冬";
}

function guaQi(wuXing: string, season: string): string {
  const map: Record<string, Record<string, string>> = {
    "春":{木:"旺",火:"相",水:"休",金:"囚",土:"死"},
    "夏":{火:"旺",土:"相",木:"休",水:"囚",金:"死"},
    "秋":{金:"旺",水:"相",土:"休",火:"囚",木:"死"},
    "冬":{水:"旺",木:"相",金:"休",土:"囚",火:"死"},
  };
  return map[season]?.[wuXing] ?? "休";
}

/** 主计算函数 */
export function calculateMeiHua(input: Record<string, unknown>): MeiHuaResult {
  const method = (input.method as string) ?? "time";
  const datetime = input.datetime as string ?? new Date().toISOString();

  const d = new Date(datetime);
  let upperNum: number, lowerNum: number, dongYaoNum: number;

  if (method === "time") {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    upperNum = numToGua(year + month + day);
    lowerNum = numToGua(month + day + hour);
    dongYaoNum = dongYaoCalc(year + month + day + hour);
  } else if (method === "number" && input.numbers) {
    const nums = input.numbers as number[];
    upperNum = numToGua(nums[0] ?? 1);
    lowerNum = numToGua(nums[1] ?? 1);
    dongYaoNum = dongYaoCalc(nums[2] ?? 1);
  } else {
    upperNum = numToGua((input.upperGua as number) ?? 1);
    lowerNum = numToGua((input.lowerGua as number) ?? 1);
    dongYaoNum = dongYaoCalc((input.dongYao as number) ?? 1);
  }

  const benGuaName = getGuaName(upperNum, lowerNum);
  const upperGua = getGua(upperNum);
  const lowerGua = getGua(lowerNum);

  // ── 变卦：翻转动爻所在位置的阴阳 ──
  // 动爻1-3在下卦，4-6在上卦；爻序自下而上(1=下,2=中,3=上)
  // 三爻数组索引：0=上,1=中,2=下 → 动爻1→idx2, 动爻2→idx1, 动爻3→idx0
  const yaoIdxInTrigam = dongYaoNum <= 3 ? (3 - dongYaoNum) : (6 - dongYaoNum);
  let bianUpper = upperNum, bianLower = lowerNum;
  if (dongYaoNum <= 3) {
    bianLower = flipYao(lowerNum, yaoIdxInTrigam);
  } else {
    bianUpper = flipYao(upperNum, yaoIdxInTrigam);
  }
  const bianGuaName = getGuaName(bianUpper, bianLower);

  // ── 互卦：取本卦中间四爻（2,3,4爻为下卦，3,4,5爻为上卦）──
  // fullYao = [上卦上爻,上卦中爻,上卦下爻, 下卦上爻,下卦中爻,下卦下爻]
  //          = [pos6,     pos5,     pos4,     pos3,     pos2,     pos1]
  const upperYao = guaNumToYao(upperNum);
  const lowerYao = guaNumToYao(lowerNum);
  const fullYao = [...upperYao, ...lowerYao];
  // 互卦下卦 = 本卦第2,3,4爻，[上=pos4, 中=pos3, 下=pos2]
  // 互卦上卦 = 本卦第3,4,5爻，[上=pos5, 中=pos4, 下=pos3]
  const huUpper = yaoToGuaNum([fullYao[1], fullYao[2], fullYao[3]]);
  const huLower = yaoToGuaNum([fullYao[2], fullYao[3], fullYao[4]]);
  const huGuaName = getGuaName(huUpper, huLower);

  // 体用
  const tiNum = dongYaoNum <= 3 ? upperNum : lowerNum;
  const yongNum = dongYaoNum <= 3 ? lowerNum : upperNum;
  const tiGua = getGua(tiNum);
  const yongGua = getGua(yongNum);
  const tiYongRel = tiYongRelation(tiGua.wuXing, yongGua.wuXing);

  // 卦气
  const season = getSeason(d.getMonth() + 1);
  const guaQiResult: Record<string, string> = {};
  for (const g of BA_GUA) {
    guaQiResult[g.name] = guaQi(g.wuXing, season);
  }

  // 策轨
  const ceGui = {
    yuanCe: upperNum * 100 + lowerNum * 10 + dongYaoNum,
    yuanGui: upperNum * 10 + lowerNum * 100 + dongYaoNum * 50,
    yanCe: { yuan: upperNum * 12, hui: lowerNum * 12, yun: dongYaoNum * 12, shi: (upperNum + lowerNum) * 6 },
  };

  const tiYongName: Record<string, string> = {
    "yong-sheng-ti":"用生体（大吉）","ti-yong-bihe":"体用比和（吉）","ti-ke-yong":"体克用（小吉）","ti-sheng-yong":"体生用（凶）","yong-ke-ti":"用克体（大凶）",
  };

  const duanYu = `${benGuaName}之${bianGuaName}，${tiYongName[tiYongRel] ?? "体用关系"}。体卦${tiGua.name}${tiGua.wuXing}，用卦${yongGua.name}${yongGua.wuXing}。`;

  // 卦辞/爻辞/万物类象
  const guaCi = GUA_CI_64[benGuaName] ?? getDefaultGuaCi(benGuaName);
  const yaoCi = getDefaultYaoCi(benGuaName, dongYaoNum, YAO_CI);
  const tiYongAnalysis = buildTiYongAnalysis(tiGua, yongGua, tiYongRel, season);

  // Box-drawing 结构化总结
  const tiYongLabel = tiYongName[tiYongRel] ?? "体用关系";
  const wxSummary = BA_GUA.map(g => `${g.symbol}${g.name}${guaQiResult[g.name] || "—"}`).join(" ");
  const summary = [
    "┌──────────────────────────────────────┐",
    "│      梅花易数 · 起卦断卦             │",
    "├──────────────────────────────────────┤",
    "│ 本卦：" + benGuaName + " " + getGuaSymbol(benGuaName) + " 上" + upperGua.name + "下" + lowerGua.name + " ".repeat(12) + "│",
    "│ 变卦：" + bianGuaName + " " + getGuaSymbol(bianGuaName) + " 上" + getGua(bianUpper).name + "下" + getGua(bianLower).name + " ".repeat(12) + "│",
    "│ 互卦：" + huGuaName + " " + getGuaSymbol(huGuaName) + " ".repeat(24) + "│",
    "│ 动爻：第" + dongYaoNum + "爻动（" + (dongYaoNum <= 3 ? "下卦" : "上卦") + "）" + " ".repeat(21) + "│",
    "├──────────────────────────────────────┤",
    "│ 体卦：" + tiGua.name + "(" + tiGua.wuXing + ") 用卦：" + yongGua.name + "(" + yongGua.wuXing + ")" + " ".repeat(15) + "│",
    "│ 关系：" + tiYongLabel.padEnd(29) + "│",
    "│ 时令：" + season + "季 体" + guaQi(tiGua.wuXing, season) + " 用" + guaQi(yongGua.wuXing, season) + " ".repeat(22) + "│",
    "├──────────────────────────────────────┤",
    "│ 卦象旺衰                              │",
    "│ " + wxSummary.slice(0, 38).padEnd(38) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《梅花易数》邵雍著              │",
    "│ 参校：《易学启蒙》《周易·说卦传》     │",
    "│ 卦卦用八卦万物类象，爻爻参周易经文     │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { method: method as any, datetime },
    benGua: {
      name: benGuaName, symbol: getGuaSymbol(benGuaName),
      upper: { number: upperNum, name: upperGua.name, wuXing: upperGua.wuXing },
      lower: { number: lowerNum, name: lowerGua.name, wuXing: lowerGua.wuXing },
      binary: `${upperNum}${lowerNum}`,
    },
    dongYao: dongYaoNum,
    bianGua: {
      name: bianGuaName, symbol: getGuaSymbol(bianGuaName),
      upper: { number: bianUpper, name: getGua(bianUpper).name, wuXing: getGua(bianUpper).wuXing },
      lower: { number: bianLower, name: getGua(bianLower).name, wuXing: getGua(bianLower).wuXing },
    },
    huGua: {
      name: huGuaName, symbol: getGuaSymbol(huGuaName),
      upper: { number: huUpper, name: getGua(huUpper).name, wuXing: getGua(huUpper).wuXing },
      lower: { number: huLower, name: getGua(huLower).name, wuXing: getGua(huLower).wuXing },
    },
    tiGua: { number: tiNum, name: tiGua.name, wuXing: tiGua.wuXing },
    yongGua: { number: yongNum, name: yongGua.name, wuXing: yongGua.wuXing },
    tiYongRelation: tiYongRel as any,
    guaQi: guaQiResult as any,
    ceGui: ceGui as any,
    jieQi: "",
    shenSha: [],
    kongWang: "",
    duanYu,
    guaCi,
    yaoCi,
    tiYongAnalysis,
    summary,
  } as MeiHuaResult & { summary: string };
}

/** 默认卦辞 */
function getDefaultGuaCi(name: string): string {
  const guaNames = name.split("");
  const t = guaNames[0] || "";
  const d = guaNames[2] || guaNames[1] || "";
  return `${name}：${t}上${d}下，观卦象而知吉凶，察爻变而明进退。`;
}

/** 体用深度解读（结合万物类象） */
function buildTiYongAnalysis(tiGua: { name: string; wuXing: string }, yongGua: { name: string; wuXing: string }, tiYongRel: string, season: string): string {
  const tiWX = WAN_WU_LEI_XIANG[tiGua.name];
  const yongWX = WAN_WU_LEI_XIANG[yongGua.name];

  const analysisMap: Record<string, string> = {
    "yong-sheng-ti": `大吉之象。用卦${yongGua.name}(${yongGua.wuXing})生体卦${tiGua.name}(${tiGua.wuXing})，主外在环境、人事生助自己，诸事顺遂。${tiWX ? `体卦应象：${tiWX.tianShi}之天时、${tiWX.renWu}之人物、${tiWX.shenTi}之身体部位。` : ""}${yongWX ? `用卦应象：${yongWX.renWu}之人可带来好运。` : ""}`,
    "ti-yong-bihe": `吉象。体用皆属${tiGua.wuXing}，五行比和，主内外和谐、上下同心。${tiWX ? `体用同气，应${tiWX.diLi}之地利，${tiWX.qiuMing}之事业方向。` : ""}${yongWX ? `若见${yongWX.dongWu}之象，尤为吉利。` : ""}`,
    "ti-ke-yong": `小吉之象。体卦${tiGua.name}(${tiGua.wuXing})克用卦${yongGua.name}(${yongGua.wuXing})，主自己可掌控局势，但需费心力。${tiWX ? `体卦应${tiWX.jingWu}之物象，宜掌握${tiWX.qiuMing}之机缘。` : ""}${yongWX ? `忌${yongWX.wuWei}之味、${yongWX.wuSe}之色。` : ""}`,
    "ti-sheng-yong": `凶象。体卦${tiGua.name}生用卦${yongGua.name}，主泄气耗神，付出多而回报少，宜守不宜攻。${tiWX ? `体卦${tiWX.shenTi}须防损耗。` : ""}${yongWX ? `用卦应${yongWX.hunYin}之象，事多耗散。` : ""}`,
    "yong-ke-ti": `大凶之象。用卦${yongGua.name}(${yongGua.wuXing})克体卦${tiGua.name}(${tiGua.wuXing})，主外患内忧、诸事不顺。${tiWX ? `体卦${tiWX.shenTi}须格外养护。` : ""}${yongWX ? `忌往${yongWX.diLi}方位，避${yongWX.tianShi}之时。` : ""}`,
  };

  const baseAnalysis = analysisMap[tiYongRel] ?? `体用关系待详察。`;
  const seasonNote = `\n时令${season}季，体卦${tiGua.wuXing}于${season}季${guaQi(tiGua.wuXing, season)}，用卦${yongGua.wuXing}于${season}季${guaQi(yongGua.wuXing, season)}。`;
  return baseAnalysis + seasonNote;
}

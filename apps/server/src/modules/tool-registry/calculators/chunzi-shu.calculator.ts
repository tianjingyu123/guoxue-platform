// ── 蠢子数计算引擎 ──
// 算法参考：《蠢子数》《邵子神数》
import type { ChunZiShuResult, ChunZiItem } from "@guoxue/shared";

// ── 时辰干支起卦辅助 ──
// 禁止 Date.now() 毫秒/随机定签。未传报数时，用求签时刻的「日干支序数」(六十甲子) 起卦，
// 同一日得同一签，符合传统神数「同时同卦」逻辑，结果可复现。
const GANZHI_EPOCH_UTC = Date.UTC(1984, 1, 2); // 甲子日
const DAY_MS = 86400000;

/** 计算给定时刻的日干支序数（0=甲子 … 59=癸亥）。 */
function getDayGanZhiIndex(date?: string | number | Date): number {
  const t = date !== undefined ? new Date(date).getTime() : Date.now();
  const days = Math.floor((t - GANZHI_EPOCH_UTC) / DAY_MS);
  return ((days % 60) + 60) % 60;
}

// 蠢子数96条签名（简化集，源自民间蠢子数签文）
const CHUNZI_ITEMS: ChunZiItem[] = [
  { id: 1, text: "日出东方照九州，万里无云万里天。", jiXiong: "上上", category: "天时" },
  { id: 2, text: "龙游浅水遭虾戏，虎落平阳被犬欺。", jiXiong: "下下", category: "处境" },
  { id: 3, text: "春风得意马蹄疾，一日看尽长安花。", jiXiong: "上吉", category: "事业" },
  { id: 4, text: "山重水复疑无路，柳暗花明又一村。", jiXiong: "中吉", category: "转机" },
  { id: 5, text: "金鳞岂是池中物，一遇风云便化龙。", jiXiong: "上上", category: "机遇" },
  { id: 6, text: "画虎画皮难画骨，知人知面不知心。", jiXiong: "下平", category: "人心" },
  { id: 7, text: "踏破铁鞋无觅处，得来全不费工夫。", jiXiong: "中吉", category: "寻物" },
  { id: 8, text: "路遥知马力，日久见人心。", jiXiong: "中平", category: "考验" },
  { id: 9, text: "近水楼台先得月，向阳花木早逢春。", jiXiong: "上吉", category: "先机" },
  { id: 10, text: "月到中秋分外明，花逢春至自然开。", jiXiong: "上平", category: "时机" },
  { id: 11, text: "命里有时终须有，命里无时莫强求。", jiXiong: "中平", category: "命运" },
  { id: 12, text: "车到山前必有路，船到桥头自然直。", jiXiong: "中吉", category: "信心" },
  { id: 13, text: "水能载舟亦能覆舟，得人心者得天下。", jiXiong: "上吉", category: "处世" },
  { id: 14, text: "凤凰台上凤凰游，凤去台空江自流。", jiXiong: "下平", category: "无常" },
  { id: 15, text: "大鹏一日同风起，扶摇直上九万里。", jiXiong: "上上", category: "前程" },
  { id: 16, text: "城门失火殃及池鱼，未雨绸缪方为上。", jiXiong: "下平", category: "预警" },
  { id: 17, text: "桃之夭夭灼灼其华，之子于归宜其室家。", jiXiong: "上吉", category: "婚嫁" },
  { id: 18, text: "夫妻本是同林鸟，大难临头各自飞。", jiXiong: "下下", category: "婚变" },
  { id: 19, text: "三分天注定，七分靠打拼。", jiXiong: "中平", category: "努力" },
  { id: 20, text: "塞翁失马焉知非福，祸兮福之所倚。", jiXiong: "中平", category: "辩证" },
  { id: 21, text: "十年磨一剑，霜刃未曾试。", jiXiong: "中吉", category: "准备" },
  { id: 22, text: "花开堪折直须折，莫待无花空折枝。", jiXiong: "中吉", category: "时机" },
  { id: 23, text: "长江后浪推前浪，一代新人换旧人。", jiXiong: "中平", category: "更替" },
  { id: 24, text: "不畏浮云遮望眼，只缘身在最高层。", jiXiong: "上吉", category: "境界" },
  { id: 25, text: "独在异乡为异客，每逢佳节倍思亲。", jiXiong: "下平", category: "思乡" },
  { id: 26, text: "海内存知己，天涯若比邻。", jiXiong: "上吉", category: "友情" },
  { id: 27, text: "黑发不知勤学早，白首方悔读书迟。", jiXiong: "下平", category: "劝学" },
  { id: 28, text: "会当凌绝顶，一览众山小。", jiXiong: "上上", category: "志向" },
  { id: 29, text: "莫愁前路无知己，天下谁人不识君。", jiXiong: "上吉", category: "前程" },
  { id: 30, text: "白日依山尽，黄河入海流，欲穷千里目，更上一层楼。", jiXiong: "上吉", category: "进阶" },
  { id: 31, text: "春蚕到死丝方尽，蜡炬成灰泪始干。", jiXiong: "下平", category: "牺牲" },
  { id: 32, text: "山不在高有仙则名，水不在深有龙则灵。", jiXiong: "上吉", category: "品质" },
  { id: 33, text: "旧时王谢堂前燕，飞入寻常百姓家。", jiXiong: "下平", category: "盛衰" },
  { id: 34, text: "不以规矩，不能成方圆。", jiXiong: "中平", category: "规矩" },
  { id: 35, text: "良药苦口利于病，忠言逆耳利于行。", jiXiong: "中吉", category: "谏言" },
  { id: 36, text: "天行健，君子以自强不息。", jiXiong: "上上", category: "奋斗" },
  { id: 37, text: "地势坤，君子以厚德载物。", jiXiong: "上吉", category: "德行" },
  { id: 38, text: "云横秦岭家何在，雪拥蓝关马不前。", jiXiong: "下下", category: "困阻" },
  { id: 39, text: "锲而不舍，金石可镂。", jiXiong: "上吉", category: "坚持" },
  { id: 40, text: "亡羊补牢，为时未晚。", jiXiong: "中吉", category: "补过" },
  { id: 41, text: "二人同心，其利断金。", jiXiong: "上吉", category: "合作" },
  { id: 42, text: "橘生淮南则为橘，生于淮北则为枳。", jiXiong: "中平", category: "环境" },
  { id: 43, text: "不入虎穴，焉得虎子。", jiXiong: "中平", category: "冒险" },
  { id: 44, text: "前事不忘，后事之师。", jiXiong: "中平", category: "经验" },
  { id: 45, text: "鹬蚌相争，渔翁得利。", jiXiong: "下平", category: "争斗" },
  { id: 46, text: "螳螂捕蝉，黄雀在后。", jiXiong: "下平", category: "警惕" },
  { id: 47, text: "一叶障目，不见泰山。", jiXiong: "下平", category: "短视" },
  { id: 48, text: "千里之行，始于足下。", jiXiong: "中吉", category: "务实" },
  { id: 49, text: "星星之火，可以燎原。", jiXiong: "上吉", category: "趋势" },
  { id: 50, text: "静如处子，动如脱兔。", jiXiong: "中吉", category: "策略" },
  { id: 51, text: "有心栽花花不开，无心插柳柳成荫。", jiXiong: "中平", category: "机缘" },
  { id: 52, text: "失之东隅，收之桑榆。", jiXiong: "中吉", category: "得失" },
  { id: 53, text: "破镜重圆，分钗合钿。", jiXiong: "中吉", category: "复合" },
  { id: 54, text: "画龙点睛，神来之笔。", jiXiong: "上吉", category: "灵感" },
  { id: 55, text: "一言既出，驷马难追。", jiXiong: "中平", category: "信用" },
  { id: 56, text: "玉不琢不成器，人不学不知义。", jiXiong: "中平", category: "学习" },
  { id: 57, text: "万事俱备，只欠东风。", jiXiong: "中吉", category: "筹备" },
  { id: 58, text: "屋漏偏逢连夜雨，船迟又遇打头风。", jiXiong: "下下", category: "困境" },
  { id: 59, text: "人无远虑，必有近忧。", jiXiong: "中平", category: "远见" },
  { id: 60, text: "兵马未动，粮草先行。", jiXiong: "中平", category: "准备" },
  { id: 61, text: "明修栈道，暗度陈仓。", jiXiong: "上吉", category: "谋略" },
  { id: 62, text: "狡兔死走狗烹，飞鸟尽良弓藏。", jiXiong: "下下", category: "功成" },
  { id: 63, text: "前人栽树，后人乘凉。", jiXiong: "上吉", category: "福荫" },
  { id: 64, text: "兼听则明，偏信则暗。", jiXiong: "中平", category: "明辨" },
  { id: 65, text: "春江水暖鸭先知，向阳花木早逢春。", jiXiong: "上吉", category: "先知" },
  { id: 66, text: "树倒猢狲散，墙倒众人推。", jiXiong: "下下", category: "世态" },
  { id: 67, text: "同是天涯沦落人，相逢何必曾相识。", jiXiong: "下平", category: "共鸣" },
  { id: 68, text: "此曲只应天上有，人间能得几回闻。", jiXiong: "上吉", category: "惊喜" },
  { id: 69, text: "落红不是无情物，化作春泥更护花。", jiXiong: "中吉", category: "奉献" },
  { id: 70, text: "野火烧不尽，春风吹又生。", jiXiong: "上吉", category: "韧性" },
  { id: 71, text: "随遇而安知足乐，粗茶淡饭也香甜。", jiXiong: "上吉", category: "知足" },
  { id: 72, text: "君子报仇十年不晚，小人报仇眼前。", jiXiong: "中平", category: "耐心" },
  { id: 73, text: "钱财如粪土，仁义值千金。", jiXiong: "上吉", category: "义利" },
  { id: 74, text: "人生自古谁无死，留取丹心照汗青。", jiXiong: "上上", category: "气节" },
  { id: 75, text: "醉翁之意不在酒，在乎山水之间也。", jiXiong: "中吉", category: "隐喻" },
  { id: 76, text: "问君能有几多愁，恰似一江春水向东流。", jiXiong: "下平", category: "忧愁" },
  { id: 77, text: "桃花潭水深千尺，不及汪伦送我情。", jiXiong: "上吉", category: "情谊" },
  { id: 78, text: "无可奈何花落去，似曾相识燕归来。", jiXiong: "下平", category: "无奈" },
  { id: 79, text: "先天下之忧而忧，后天下之乐而乐。", jiXiong: "上上", category: "胸怀" },
  { id: 80, text: "采菊东篱下，悠然见南山。", jiXiong: "上吉", category: "隐逸" },
  { id: 81, text: "抽刀断水水更流，举杯消愁愁更愁。", jiXiong: "下下", category: "愁苦" },
  { id: 82, text: "书山有路勤为径，学海无涯苦作舟。", jiXiong: "中吉", category: "勤学" },
  { id: 83, text: "粉身碎骨浑不怕，要留清白在人间。", jiXiong: "上上", category: "刚正" },
  { id: 84, text: "横眉冷对千夫指，俯首甘为孺子牛。", jiXiong: "上吉", category: "担当" },
  { id: 85, text: "人生得意须尽欢，莫使金樽空对月。", jiXiong: "中吉", category: "豁达" },
  { id: 86, text: "天生我材必有用，千金散尽还复来。", jiXiong: "上上", category: "自信" },
  { id: 87, text: "随风潜入夜，润物细无声。", jiXiong: "上吉", category: "潜移默化" },
  { id: 88, text: "纸上得来终觉浅，绝知此事要躬行。", jiXiong: "中吉", category: "实践" },
  { id: 89, text: "众里寻他千百度，蓦然回首那人却在灯火阑珊处。", jiXiong: "上吉", category: "缘分" },
  { id: 90, text: "人生如梦，一樽还酹江月。", jiXiong: "下平", category: "感慨" },
  { id: 91, text: "长风破浪会有时，直挂云帆济沧海。", jiXiong: "上吉", category: "信念" },
  { id: 92, text: "沉舟侧畔千帆过，病树前头万木春。", jiXiong: "中吉", category: "希望" },
  { id: 93, text: "海阔凭鱼跃，天高任鸟飞。", jiXiong: "上吉", category: "自由" },
  { id: 94, text: "宝剑锋从磨砺出，梅花香自苦寒来。", jiXiong: "上吉", category: "磨炼" },
  { id: 95, text: "欲穷千里目，更上一层楼。", jiXiong: "上吉", category: "进取" },
  { id: 96, text: "万事劝人休瞒昧，举头三尺有神明。", jiXiong: "中吉", category: "戒慎" },
];

export function calculateChunZiShu(input: Record<string, unknown>): ChunZiShuResult {
  const number = input.number as number | undefined;
  const date = input.date as string | number | undefined;

  // 起卦：报数优先，未传报数时用求签时刻的日干支序数兜底（确定性、可复现，禁止毫秒/随机）
  let selectedId: number;
  let qiGuaNote: string;
  if (number && number >= 1 && number <= 96) {
    selectedId = number;
    qiGuaNote = `报数 ${number}`;
  } else {
    const gzIndex = getDayGanZhiIndex(date); // 0-59
    selectedId = (gzIndex % 96) + 1;
    qiGuaNote = `依时辰日干支（六十甲子第 ${gzIndex + 1} 位）`;
  }

  const selected = CHUNZI_ITEMS.find(i => i.id === selectedId) || CHUNZI_ITEMS[0];
  const summary = `蠢子数第${selected.id}签：${selected.text}（${selected.jiXiong}·${selected.category}）｜起卦：${qiGuaNote}`;

  return { items: CHUNZI_ITEMS, selected, summary };
}

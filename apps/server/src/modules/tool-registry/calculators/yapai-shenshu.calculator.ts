// ── 牙牌神数计算引擎 ──
// 算法参考：《牙牌神数》《牙牌灵数》《灵棋经》《周易》
// 牙牌神数源于宋代，以天九牌32张配合六十四卦推演人事吉凶
// 《牙牌神数》云：「三十二张天九牌，配合卦象断吉凶。天地人和分上下，红黑单双定穷通。」

import type { YaPaiShenShuResult, YaPaiItem } from "@guoxue/shared";
import { cryptoShuffle } from "./helpers";

// ── 天九牌32张详解 ──
// 牙牌分天地人和四大类，每类各有红黑单双之分
const YA_PAI_DECK: YaPaiItem[] = [
  // ── 天字牌（6张）──
  { id: 1, name: "天牌（双天）", type: "天", meaning: "上上·天地交泰，万象更新。双天护佑，天官赐福。主官运亨通、贵人扶持、百事大吉。问名望：一举成名；问财运：财源滚滚；问出行：一路顺风；问婚姻：天作之合。" },
  { id: 2, name: "地牌（双地）", type: "地", meaning: "上吉·厚德载物，根基稳固。双地涵养，德合无疆。主家宅平安、财禄丰盈、事业稳固。问家宅：家运昌隆；问财运：稳中有升；问健康：根基深厚。" },
  { id: 3, name: "人牌（双人）", type: "人", meaning: "中平·人和为贵，团结协作。双人合心，其利断金。主合作得利、人际关系和顺。问合伙：一拍即合；问纠纷：以和为贵；问事业：得道多助。" },
  { id: 4, name: "和牌（双和）", type: "和", meaning: "上吉·和气致祥，家庭和睦。双和聚福，五福临门。主夫妻恩爱、家庭和乐、万事顺遂。问婚姻：白头偕老；问子嗣：兰桂齐芳；问纷争：化干戈为玉帛。" },
  { id: 5, name: "至尊（天地至尊）", type: "尊", meaning: "上上·至尊至贵，龙凤呈祥。天地交感，大吉大利。万难皆消，百事如意。问大事：旗开得胜；问功名：平步青云；问财运：富甲一方；问诉讼：理直气壮。" },
  { id: 6, name: "天罡（天罡星）", type: "罡", meaning: "上吉·罡星护体，正气凛然。天罡正照，邪不能侵。主逢凶化吉、遇难成祥。问病：药到病除；问灾：化险为夷；问出行：吉人天相。" },

  // ── 长牌（4张）──
  { id: 7, name: "长三（三长）", type: "三", meaning: "中吉·三星高照，福禄寿全。三阳开泰，冬去春来。主福气深厚、事业渐进。问前程：循序渐进；问财运：日积月累；问健康：老当益壮。" },
  { id: 8, name: "长二（二长）", type: "二", meaning: "中平·双喜临门，好事成双。二气感应，协力同心。主合作成功、喜事重叠。问姻缘：双喜临门；问商贾：合作有利；问出行：一路顺风。" },
  { id: 9, name: "长五（五长）", type: "五", meaning: "上吉·五福临门，财源广进。五谷丰登，金玉满堂。主事业发达、名利双收。问财运：五路进财；问功名：五子登科；问农业：五谷丰登。" },
  { id: 10, name: "梅花（梅花长）", type: "花", meaning: "中吉·梅花香自苦寒来。先难后获，守得云开见月明。主苦尽甘来、守成终成。问创业：先苦后甜；问学术：厚积薄发；问困境：否极泰来。" },

  // ── 幺牌（10张）──
  { id: 11, name: "幺六（六幺）", type: "六", meaning: "中吉·六六大顺，诸事顺遂。六合之内，莫不顺成。主诸般顺遂，但需防小人暗算。问运势：一切顺利；问出行：六六大顺；问合作：先明后暗需警惕。" },
  { id: 12, name: "幺五（五幺）", type: "五", meaning: "下平·五鬼运财，财来财去。五行相克，须防口舌是非。主财运不稳、人际纠纷。问财运：进少出多；问口舌：谨言慎行；问合作：防人暗算。" },
  { id: 13, name: "幺四（四幺）", type: "四", meaning: "中平·四平八稳，按部就班。四方安定，不宜冒进。主安稳守成、稳中求进。问事业：稳扎稳打；问投资：不宜冒险；问搬迁：按兵不动。" },
  { id: 14, name: "幺三（三幺）", type: "三", meaning: "下下·三灾八难，波折坎坷。三煞临门，须忍耐守成。主事多阻碍、进退两难。问事业：处处碰壁；问财运：损耗多端；问健康：小病不断。" },
  { id: 15, name: "幺二（二幺）", type: "二", meaning: "下平·进退两难，举棋不定。二心不定，一事无成。主选择困难、犹豫不决。问决策：举棋不定；问感情：摇摆不定；问出行：去留两难。" },

  // ── 点子牌（10张）──
  { id: 16, name: "红九（红九点）", type: "红", meaning: "上上·红运当头，九九归一。红日高照，大事可成。主事业巅峰、功成名就。问功名：状元及第；问商贾：一本万利；问婚姻：红鸾星动。" },
  { id: 17, name: "黑九（黑九点）", type: "黑", meaning: "下平·暗九之年，阴霾笼罩。九幽之气，须谨慎行事。主运势低潮、暗流涌动。问事业：小人暗算；问财运：暗耗多端；问健康：隐疾潜伏。" },
  { id: 18, name: "红八（红八点）", type: "红", meaning: "上吉·八方来财，红红火火。八面威风，事业上升。主财运亨通、事业拓展。问财运：八方进财；问事业：左右逢源；问社交：八面玲珑。" },
  { id: 19, name: "黑八（黑八点）", type: "黑", meaning: "中平·八面来风，消息灵通。八方消息，需辨真伪。主信息纷乱、决策困难。问消息：真假难辨；问决策：顾虑太多；问出行：路线多变。" },
  { id: 20, name: "红七（红七点）", type: "红", meaning: "中吉·七星拱照，贵人提携。七政同辉，前途光明。主得贵人相助、事业有突破。问贵人：贵人自至；问学业：七步成诗；问变动：虽有波动终向好。" },
  { id: 21, name: "黑七（黑七点）", type: "黑", meaning: "下下·七煞当头，血光之厄。七杀攻身，须化解消灾。主意外灾祸、健康危机。问病：病情凶险；问出行：血光之灾；问诉讼：败诉危矣。" },
  { id: 22, name: "红五（红五点）", type: "红", meaning: "中吉·五福在望，喜事将近。五色祥云，吉兆显现。主好事将近，但不可贪多求全。问喜事：好事多磨；问财运：小有进账；问前程：不可急进。" },
  { id: 23, name: "黑五（黑五点）", type: "黑", meaning: "下平·五黄煞气，运势低迷。五阴晦气，须修身养性。主运势不佳、诸事不顺。问运势：无所作为；问财运：守成为上；问健康：静养为宜。" },
  { id: 24, name: "红三（红三点）", type: "红", meaning: "中上·三阳开泰，冬去春来。三光普照，运势上升。主困境将解、转机将至。问转机：曙光已现；问财运：触底反弹；问感情：冰释前嫌。" },
  { id: 25, name: "黑三（黑三点）", type: "黑", meaning: "下平·三阴晦气，暂时困顿。三日阴雨，但转机将至。主短期困顿、非长久之厄。问时机：还需等待；问财运：暂时亏空；问出行：暂不宜行。" },

  // ── 武功牌（7张）──
  { id: 26, name: "斧头（斧钺）", type: "斧", meaning: "中吉·开山劈路，勇往直前。斧钺之利，得贵人指引披荆斩棘。主突破困境、开辟新路。问创业：劈波斩浪；问困境：有人相助；问事业：大刀阔斧。" },
  { id: 27, name: "板凳（板凳）", type: "板", meaning: "中平·四平八稳，稳扎稳打。以静制动，根基牢靠。主稳重守成、不急不躁。问事业：稳步前进；问投资：长线持有；问搬迁：择日再议。" },
  { id: 28, name: "铜锤（铜锤）", type: "锤", meaning: "上吉·一锤定音，决断果敢。千钧之力，成大事不拘小节。主决断正确、一击必中。问决策：当机立断；问竞标：一举夺魁；问纠纷：一锤定音。" },
  { id: 29, name: "地煞（地煞星）", type: "煞", meaning: "下下·煞气当头，百事不宜。地煞临宫，须斋戒祈福。主运势最低、灾祸临头。问灾厄：大凶之兆；问出行：寸步难行；问健康：病来如山。" },
  { id: 30, name: "红日（红日）", type: "红", meaning: "上上·如日中天，光辉灿烂。红日照耀，万邪不侵。主事业巅峰、一切顺遂。问前程：前途无量；问财运：日进斗金；问声望：众望所归。" },
  { id: 31, name: "黑月（黑月）", type: "黑", meaning: "下平·月黑风高，暗流涌动。明月被遮，须明哲保身。主暗处有险、保持警惕。问风险：隐藏危机；问合作：对方不可靠；问出行：夜路难行。" },
  { id: 32, name: "双天（双天护佑）", type: "天", meaning: "上上·双天护佑，天官赐福。双星并照，百无禁忌。此为上上之签，求之必得。问功名：连中三元；问财运：财源滚滚；问子嗣：双喜临门。" },
];

// ── 三牌合断解析 ──
// 三张牌的排列组合形成64种卦象雏形
function analyzeThreeCards(cards: YaPaiItem[]): string {
  const types = cards.map(c => c.type);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const names = cards.map(c => c.name);
  const jiCount = cards.filter(c => c.meaning.startsWith("上")).length;
  const xiongCount = cards.filter(c => c.meaning.startsWith("下")).length;
  const pingCount = cards.filter(c => c.meaning.startsWith("中")).length;

  let overall = "";
  if (jiCount >= 2 && xiongCount === 0) {
    overall = "大吉之兆。三牌之中吉象占主导，所求之事大有可为。宜积极行动，趁势而上。";
  } else if (jiCount === 1 && xiongCount <= 1) {
    overall = "中吉之兆。吉凶参半，吉多凶少。宜把握时机审慎行事，趋吉避凶。";
  } else if (jiCount >= 2 && xiongCount >= 1) {
    overall = "吉中藏凶。虽有吉象但暗藏隐患，须防乐极生悲。得利于前防失于后。";
  } else if (xiongCount >= 2) {
    overall = "凶多吉少，宜静不宜动。此时不可妄动干戈，须忍耐守成等待时机。可择吉日另行占卜。";
  } else if (pingCount >= 2) {
    overall = "中平之兆。运势平稳无大波澜，宜按部就班稳中求进。时机未到不可冒进。";
  } else {
    overall = "运势平平，无喜无忧。宜守不宜攻，静待时机。";
  }

  // 牌型组合判断
  const typeSet = new Set(types);
  let combo = "";
  if (types.includes("天") && types.includes("地")) {
    combo += "天地交泰之象，上下通达。";
  }
  if (types.includes("红") && jiCount >= 2) {
    combo += "红运当头，好上加好。";
  }
  if (types.includes("煞") || types.includes("黑")) {
    combo += "暗煞潜伏，须处处小心。";
  }
  if (typeSet.size === 3) {
    combo += "三才各立，事有多方影响，须全面考虑。";
  }

  return `${overall}${combo}`;
}

// ── 六十四卦配牌（简化关联） ──
const GUA_REFERENCE: Record<string, string> = {
  "天": "乾为天，健行不息。君子以自强不息。出处：《周易·乾卦》",
  "地": "坤为地，厚德载物。君子以厚德载物。出处：《周易·坤卦》",
  "尊": "龙凤呈祥，天地交泰。泰卦之象。出处：《周易·泰卦》",
  "红": "离为火，光明照耀。大人以继明照于四方。出处：《周易·离卦》",
  "黑": "坎为水，险陷暗伏。君子以常德行习教事。出处：《周易·坎卦》",
  "煞": "凶煞临宫。君子以恐惧修省，避凶趋吉。出处：《周易·震卦》",
  "斧": "兑为金，决断刚猛。君子以朋友讲习。出处：《周易·兑卦》",
  "花": "巽为风，潜移默化。君子以申命行事。出处：《周易·巽卦》",
};

export function calculateYaPaiShenShu(input: Record<string, unknown>): YaPaiShenShuResult {
  const random = input.random !== false;
  const cards = input.cards as number[] | undefined;

  let drawn: YaPaiItem[];
  if (cards && cards.length > 0) {
    drawn = cards.map((id: number) => YA_PAI_DECK.find(c => c.id === id) || YA_PAI_DECK[0]);
  } else if (random) {
    const shuffled = cryptoShuffle([...YA_PAI_DECK]);
    drawn = [shuffled[0], shuffled[1], shuffled[2]];
  } else {
    drawn = [YA_PAI_DECK[0], YA_PAI_DECK[1], YA_PAI_DECK[2]];
  }

  // 逐牌解读
  const cardLines = drawn.map((c, i) => {
    const pos = i === 0 ? "初牌（过去/根基）" : i === 1 ? "中牌（现在/过程）" : "末牌（未来/结果）";
    const typeRef = GUA_REFERENCE[c.type];
    return `│ ${pos}：【${c.name}】${c.meaning}${typeRef ? "（" + typeRef.split("。")[0] + "）" : ""}`;
  });

  // 三牌合断
  const comboAnalysis = analyzeThreeCards(drawn);

  // 统计
  const jiCount = drawn.filter(c => c.meaning.startsWith("上")).length;
  const overallJi = jiCount >= 2 ? "大吉" : jiCount >= 1 ? "中吉" : "须谨慎";

  const interpretation = drawn.map(c => `【${c.name}】${c.meaning}`).join("\n");

  const summary = [
    `【牙牌神数占卜】`,
    ``,
    `┌─ 牌阵解析 ─────────────────`,
    ...cardLines,
    ``,
    `├─ 三牌合断 ─────────────────`,
    `│ ${comboAnalysis}`,
    ``,
    `├─ 综合判断 ─────────────────`,
    `│ 总体运势：${overallJi}`,
    `│ 吉牌：${jiCount}张 凶牌：${drawn.filter(c => c.meaning.startsWith("下")).length}张 中平：${drawn.filter(c => c.meaning.startsWith("中")).length}张`,
    `│ 牌型：${drawn.map(c => c.type).join("→")}`,
    ``,
    `├─ 各牌出处 ─────────────────`,
    ...drawn.map(c => {
      const ref = GUA_REFERENCE[c.type];
      return `│ · ${c.name}（${c.type}类）→ ${ref ? ref : "牙牌灵数古诀"}`;
    }),
    ``,
    `├─ 占卜提示 ─────────────────`,
    `│ 1. 牙牌神数宜诚心默祷后抽牌，心诚则灵`,
    `│ 2. 同一事不宜反复占问，亵渎则不灵`,
    `│ 3. 初牌示过去之因，中牌示当前之势，末牌示未来之果`,
    `│ 4. 三牌以末牌为重，末牌定乾坤`,
    `│ 5. 若得凶牌不必惊慌，可通过行善积德化解`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《牙牌神数》：「三十二张天九牌，配合卦象断吉凶。」`,
    `   《牙牌灵数》：「天地人和分上下，红黑单双定穷通。」`,
    `   《灵棋经》：「三才定位，象在其中。吉凶悔吝，各以类应。」`,
    `   《周易》：「易有太极，是生两仪。两仪生四象，四象生八卦。」`,
    ``,
    `牙牌虽小，象天法地。三张牌阵，涵盖过去现在未来。吉则勉之，凶则避之。`,
  ].filter(Boolean).join("\n");

  return { drawnCards: drawn, interpretation, summary };
}

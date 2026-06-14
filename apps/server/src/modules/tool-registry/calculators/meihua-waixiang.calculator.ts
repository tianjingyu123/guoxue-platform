// ── 梅花外应计算引擎 ──
// 算法参考：《梅花易数》《易学启蒙》《康节说易》《三要灵应篇》
// 梅花易数之精髓「观物而论，应物而断」。外应者，天地万物之象，皆可为卦之佐证。
// 康节先生云：「天向一中分造化，人于心上起经纶。」

import type {
  MeiHuaWaiXiangInput,
  MeiHuaWaiXiangResult,
  WaiXiangCategory,
} from "@guoxue/shared";

// 外应六大类目详解（含古籍出处）
const WAI_XIANG_CATEGORIES: WaiXiangCategory[] = [
  {
    type: "天时",
    description: "日月星辰、风雨雷电、寒暑阴晴等天象变化，观天时可知天意所在",
    entries: [
      { xianXiang: "日光明媚", jiXiong: "吉", suoZhu: "谋事可成，贵人相助，百事亨通", yingQi: "3日内有喜", shiLi: "求职面试时天晴日出，主得贵人赏识，顺利入职" },
      { xianXiang: "月晕重重", jiXiong: "平", suoZhu: "暗中有变，谨防小人暗算，宜保守行事", yingQi: "7日内防口舌", shiLi: "外出谈判遇月晕，对方别有用心，需仔细核查条款" },
      { xianXiang: "星明闪烁", jiXiong: "吉", suoZhu: "心愿可遂，远行大利，文星拱照", yingQi: "今夜至明晨", shiLi: "考前夜观星明，主文思泉涌，发挥出色" },
      { xianXiang: "风起云涌", jiXiong: "平", suoZhu: "局势将变，宜随机应变，不可固执", yingQi: "3-7日有变", shiLi: "签合同遇风云突起，主条款或有变更，需灵活调整" },
      { xianXiang: "雷电交加", jiXiong: "凶", suoZhu: "突发变故，惊险之事，宜暂停行动", yingQi: "今日慎行", shiLi: "开业遇雷雨，主开业不顺有波折，建议延期" },
      { xianXiang: "雨后彩虹", jiXiong: "吉", suoZhu: "先难后易，苦尽甘来，终获成功", yingQi: "1周后转好", shiLi: "投资遇雨后虹，主先亏后赚，坚持可获利" },
      { xianXiang: "浓雾弥漫", jiXiong: "凶", suoZhu: "方向不明，误入歧途，宜静不宜动", yingQi: "雾散后决断", shiLi: "出行遇大雾，主行程不顺，信息不明，暂缓出发" },
      { xianXiang: "瑞雪纷飞", jiXiong: "吉", suoZhu: "瑞气临门，新机将至，白手起家之兆", yingQi: "雪停后3日", shiLi: "创业遇初雪，主新事业如白雪纯净，前途光明" },
    ],
  },
  {
    type: "地理",
    description: "山川河流、道路桥梁、房屋建筑等地势地貌，观地理可知吉凶方位",
    entries: [
      { xianXiang: "高山险峻", jiXiong: "平", suoZhu: "事业有靠，但艰难险阻多，需毅力", yingQi: "半年见成效", shiLi: "选址遇高山为靠，主公司有后台支持但发展需克服困难" },
      { xianXiang: "流水清澈", jiXiong: "吉", suoZhu: "财运亨通，财源滚滚，流通无阻", yingQi: "1个月内进财", shiLi: "开业遇门前流水潺潺，主生意兴隆财源不断" },
      { xianXiang: "路直无阻", jiXiong: "吉", suoZhu: "前途坦荡，事业发展顺利", yingQi: "立见成效", shiLi: "出行遇大路畅通，主办事顺利毫无阻碍" },
      { xianXiang: "桥断路毁", jiXiong: "凶", suoZhu: "计划受阻，合作破裂，宜另辟蹊径", yingQi: "需重新规划", shiLi: "签约途中遇断桥绕路，主合同变卦或合作中断" },
      { xianXiang: "古树参天", jiXiong: "吉", suoZhu: "根基稳固，家业兴旺，长寿之兆", yingQi: "长久之福", shiLi: "购房遇院中古树，主家宅安稳根基深厚" },
      { xianXiang: "枯木朽株", jiXiong: "凶", suoZhu: "生机衰退，事业凋零，宜弃旧图新", yingQi: "及时止损", shiLi: "公司旁有枯树，主业绩下滑需转型" },
    ],
  },
  {
    type: "人事",
    description: "人物言行、喜怒哀乐、服饰动作等人事现象，观人事可知吉凶意向",
    entries: [
      { xianXiang: "喜鹊登枝", jiXiong: "吉", suoZhu: "喜事临门，婚姻有成，贵客将至", yingQi: "3日内有喜", shiLi: "求姻缘时见喜鹊，主良缘即至" },
      { xianXiang: "乌鸦啼叫", jiXiong: "凶", suoZhu: "口舌是非，小人作祟，防意外", yingQi: "近日慎言慎行", shiLi: "谈判时闻鸦叫，主对方有诈需谨慎" },
      { xianXiang: "童言吉语", jiXiong: "吉", suoZhu: "赤子之言通神灵，所言必应", yingQi: "童子言时即应", shiLi: "投资前闻童子说发财，主利好可投" },
      { xianXiang: "争吵打斗", jiXiong: "凶", suoZhu: "纷争将至，合作破裂，关系紧张", yingQi: "近日防口舌", shiLi: "签约见人争吵，主合同有争议条款" },
      { xianXiang: "贵人临门", jiXiong: "吉", suoZhu: "得遇贵人，事业腾达，官运亨通", yingQi: "遇贵人时即转", shiLi: "求职路遇故交推荐，主得贵人提携" },
      { xianXiang: "丧服白事", jiXiong: "凶", suoZhu: "衰运将至，宜守不宜攻，忌喜庆之事", yingQi: "一月内谨慎", shiLi: "开业遇送葬队伍，主开业不吉应延期" },
    ],
  },
  {
    type: "物象",
    description: "器物、动物、植物等外物现象，观物象可知吉凶预兆",
    entries: [
      { xianXiang: "灯花爆喜", jiXiong: "吉", suoZhu: "喜事将至，远客将归，佳音即来", yingQi: "今夜便有消息", shiLi: "等消息时灯花爆，主好消息即将传来" },
      { xianXiang: "碗碟碎裂", jiXiong: "平", suoZhu: "破财消灾，有小损失但可化解大祸", yingQi: "碎时即应", shiLi: "投资前碗碎，主有惊无险小损换大安" },
      { xianXiang: "蜘蛛吊线", jiXiong: "吉", suoZhu: "喜从天降，贵人临门，好事将近", yingQi: "1-3日有喜", shiLi: "求财见蛛丝下垂，主意外之财降临" },
      { xianXiang: "犬吠不止", jiXiong: "凶", suoZhu: "贼人窥伺，防盗防偷，防小人", yingQi: "当夜防贼", shiLi: "谈生意闻犬狂吠，主对方有不良企图" },
      { xianXiang: "炉火旺盛", jiXiong: "吉", suoZhu: "家业兴旺，事业红火，人气旺盛", yingQi: "持续旺势", shiLi: "开店炉火旺，主生意红火人气爆棚" },
      { xianXiang: "鱼跃出水", jiXiong: "吉", suoZhu: "鱼跃龙门，考试中第，升迁有望", yingQi: "近期有跳升", shiLi: "考试前见鱼跃水面，主金榜题名高中榜首" },
    ],
  },
  {
    type: "声音",
    description: "各种声音、响动、言语，观声音可知吉凶动静",
    entries: [
      { xianXiang: "钟声悠扬", jiXiong: "吉", suoZhu: "名扬四海，声誉鹊起，功名成就", yingQi: "1月内出名", shiLi: "创业时闻钟声，主品牌将声名远播" },
      { xianXiang: "雷声隆隆", jiXiong: "平", suoZhu: "声势浩大，但需防雷声大雨点小", yingQi: "落实方知虚实", shiLi: "融资时闻雷声，主对方声势大但未必落袋" },
      { xianXiang: "笑声朗朗", jiXiong: "吉", suoZhu: "喜庆之事，人际和谐，合作愉快", yingQi: "近日有聚", shiLi: "谈判时闻笑声，主合作愉快达成共识" },
      { xianXiang: "哭声凄凄", jiXiong: "凶", suoZhu: "损失将至，感情破裂，事业受挫", yingQi: "近日慎防", shiLi: "入职时闻哭声，主公司内部有矛盾" },
      { xianXiang: "鸟鸣清脆", jiXiong: "吉", suoZhu: "生机盎然，新机勃发，好事临近", yingQi: "晨起有佳音", shiLi: "面试时闻鸟鸣，主offer即将到手" },
      { xianXiang: "车鸣急促", jiXiong: "平", suoZhu: "事情紧迫，宜加速推进不可拖延", yingQi: "3日内须决策", shiLi: "谈项目闻急刹声，主需抓紧否则错过时机" },
    ],
  },
  {
    type: "文字",
    description: "文字、数字、符号等文字意象，观文字可知天机所示",
    entries: [
      { xianXiang: "见福字", jiXiong: "吉", suoZhu: "福气降临，家宅安康，万事如意", yingQi: "福到之时", shiLi: "签约时见福字招牌，主合作有福可享" },
      { xianXiang: "见数字6", jiXiong: "吉", suoZhu: "六六大顺，事事顺利，财运亨通", yingQi: "6日内顺遂", shiLi: "选号时见6，主此数大吉大利" },
      { xianXiang: "见破字", jiXiong: "凶", suoZhu: "破损之兆，事业有漏，宜查缺补漏", yingQi: "见字即查", shiLi: "投标时见破字，主标书有漏洞需补救" },
      { xianXiang: "见龙字", jiXiong: "吉", suoZhu: "龙腾虎跃，飞黄腾达，大展宏图", yingQi: "龙抬头之机", shiLi: "创业遇龙字招牌，主事业有腾飞之象" },
      { xianXiang: "见绝字", jiXiong: "凶", suoZhu: "绝路之兆，应果断转向不可执迷", yingQi: "见字即转", shiLi: "投资时见绝字路牌，主此路不通应换方向" },
      { xianXiang: "见喜字", jiXiong: "吉", suoZhu: "双喜临门，婚嫁大利，合作双赢", yingQi: "近日有双喜", shiLi: "相亲时见双喜字，主姻缘天成好事成双" },
    ],
  },
];

// ── 六大类目古籍出处 ──
const CATEGORY_CLASSICAL_REF: Record<string, string> = {
  "天时": "《梅花易数·天时占》：「凡占天时，观日月星辰风雨雷电可知天意。」《康节说易》：「天垂象，见吉凶。」",
  "地理": "《梅花易数·地理占》：「山川河流各有其象，高者为山低者为水，观其形势可知吉凶。」",
  "人事": "《梅花易数·人事占》：「人事纷繁，喜怒哀乐皆可为兆。察言观色，闻声辨意。」《三要灵应篇》：「人事之应，最为切近。」",
  "物象": "《梅花易数·器物占》：「万物皆有灵，器动有兆。寻常器物之异常变化，皆天机所示。」",
  "声音": "《梅花易数·声音占》：「声者心之发也。吉凶之声各有其类，闻声辨意可知休咎。」《三要灵应篇》：「耳为灵官，声入心通。」",
  "文字": "《梅花易数·字画占》：「字者心之迹也。见字识兆，观字知机。天垂象，见吉凶，圣人象之。」",
};

const SAN_YAO_SHI_YING = [
  {
    name: "三要",
    content: "运耳目心三者之要。耳为灵官，目为察官，心为思官。耳听八方之声以辨吉凶，目观四方之物以察征兆，心思万物之理以断天机。三要并用，方得外应之真谛。凡占卜之时，须先用耳目观察周遭事物之异常变化，再用心思揣摩其象征意义，然后结合主卦综合判断。",
  },
  {
    name: "十应",
    content: "正应：卦象与外象相合则吉；变应：卦爻变动与外象相应；动应：外象主动呼应所占之事；静应：外象安静不动示事可成；时应：外应之时间定应期；方应：外应之方位定方向；物应：外应之物类定属性；人应：外应之人事定关系；声应：外应之声音定消息；色应：外应之颜色定五行。十应之法，须融会贯通，不可执一而论。",
  },
  {
    name: "灵应",
    content: "心有灵犀一点通。占卜之时，心诚则灵。凡起卦前，须静心凝神，排除杂念，将心中所问之事默念三遍。若此时外有异常动静，即为灵应，乃天地神灵之启示。灵应有五不占：心不诚不占、意不专不占、事不正不占、时不吉不占、地不净不占。",
  },
];

function buildAnalysis(waiXiangType: string | undefined, category: WaiXiangCategory | null): string {
  if (category) {
    const jiCount = category.entries.filter(e => e.jiXiong === "吉").length;
    const xiongCount = category.entries.filter(e => e.jiXiong === "凶").length;
    const pingCount = category.entries.filter(e => e.jiXiong === "平").length;
    const ref = CATEGORY_CLASSICAL_REF[category.type] || "";

    return [
      `梅花易数外应之「${category.type}」类，共收录${category.entries.length}条外应。`,
      `其中吉兆${jiCount}条、凶兆${xiongCount}条、平兆${pingCount}条。`,
      `${category.description}。`,
      `出处：${ref}`,
      `外应之法贵在临机应变，同一外应因时间、地点、人事不同而吉凶迥异。`,
      `运用之妙存乎一心，不可拘泥条目，须与主卦、变卦、互卦综合参详。`,
    ].join("");
  }

  const totalEntries = WAI_XIANG_CATEGORIES.reduce((sum, c) => sum + c.entries.length, 0);
  return [
    "梅花易数外应预测，共分六大门类：天时、地理、人事、物象、声音、文字。",
    `总计收录${totalEntries}条外应条目。`,
    "外应乃梅花易数之精髓，康节先生云：「观物而论，应物而断」。",
    "平常人视而不见之事，善易者能见微知著，于寻常处见天机。",
    "请先选取一个外应类别，仔细体察周遭事物之异动，再结合卦象综合判断。",
  ].join("");
}

export function calculateMeiHuaWaiXiang(input: Record<string, unknown>): MeiHuaWaiXiangResult & { summary: string } {
  const { waiXiangType } = input as MeiHuaWaiXiangInput;

  const category = waiXiangType
    ? WAI_XIANG_CATEGORIES.find(c => c.type === waiXiangType) || null
    : null;

  const totalEntries = WAI_XIANG_CATEGORIES.reduce((sum, c) => sum + c.entries.length, 0);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalJi = WAI_XIANG_CATEGORIES.reduce((sum, c) => sum + c.entries.filter(e => e.jiXiong === "吉").length, 0);

  // 结构化 box-drawing 摘要
  if (category) {
    // 单类目详情模式
    const jiCount = category.entries.filter(e => e.jiXiong === "吉").length;
    const xiongCount = category.entries.filter(e => e.jiXiong === "凶").length;
    const pingCount = category.entries.filter(e => e.jiXiong === "平").length;
    const ref = CATEGORY_CLASSICAL_REF[category.type] || "";

    const lines: string[] = [
      `┌─ 梅花外应·${category.type}类 ─────────────────`,
      `│ ${category.description}`,
      `│ 共${category.entries.length}条（吉${jiCount}/凶${xiongCount}/平${pingCount}）`,
      ``,
      `├─ 外应条目 ─────────────────`,
    ];
    for (const e of category.entries) {
      const flag = e.jiXiong === "吉" ? "★" : e.jiXiong === "凶" ? "☠" : "·";
      lines.push(`│ ${flag} ${e.xianXiang.padEnd(10, " ")} → ${e.suoZhu.slice(0, 30)}`);
      lines.push(`│   应期：${e.yingQi.padEnd(14, " ")} 实例：${e.shiLi.slice(0, 40)}`);
    }
    lines.push(`│`);
    lines.push(`├─ 古籍出处 ─────────────────`);
    lines.push(`│ ${ref}`);
    lines.push(`│`);
    lines.push(`├─ 三要十应 ─────────────────`);
    lines.push(`│ 三要：运耳目心三者之要。耳听声辨吉凶，目观物察征兆，心思理断天机。`);
    lines.push(`│ 十应：正应/变应/动应/静应/时应/方应/物应/人应/声应/色应，融会贯通。`);
    lines.push(`│ 灵应：心诚则灵，心有灵犀一点通。五不占：心不诚/意不专/事不正/时不吉/地不净。`);
    lines.push(`│`);
    lines.push(`├─ 康节先生云 ─────────────────`);
    lines.push(`│ 「天向一中分造化，人于心上起经纶。」`);
    lines.push(`│ 「观物而论，应物而断」—— 外应之精髓在于临机应变。`);
    lines.push(`│ 同一外应因时/地/人/事不同而吉凶迥异，不可执一而论。`);
    lines.push(`│`);
    lines.push(`└─ 应用提示 ─────────────────`);
    lines.push(`   外应须与主卦/变卦/互卦综合参详，不可独立使用。`);
    lines.push(`   平常人视而不见，善易者见微知著，于寻常处见天机。`);
    lines.push(`   吉兆遇凶卦则吉中有凶，凶兆遇吉卦则凶中有救。`);
    const summary = lines.join("\n");
    return {
      category, allCategories: WAI_XIANG_CATEGORIES,
      sanYaoShiYing: SAN_YAO_SHI_YING,
      analysis: buildAnalysis(waiXiangType, category),
      summary,
    } as MeiHuaWaiXiangResult & { summary: string };
  }

  // 全览模式
  const lines: string[] = [
    `┌─ 梅花易数·外应全览 ─────────────────`,
    `│ 六大门类共${totalEntries}条外应 来源：《梅花易数》《三要灵应篇》`,
    ``,
  ];
  for (const cat of WAI_XIANG_CATEGORIES) {
    const jiC = cat.entries.filter(e => e.jiXiong === "吉").length;
    const xiongC = cat.entries.filter(e => e.jiXiong === "凶").length;
    lines.push(`├─ ${cat.type}（${cat.entries.length}条·${jiC}吉${xiongC}凶）─────────────────`);
    lines.push(`│ ${cat.description}`);
    for (const e of cat.entries) {
      const flag = e.jiXiong === "吉" ? "★" : e.jiXiong === "凶" ? "☠" : "·";
      lines.push(`│ ${flag} ${e.xianXiang.padEnd(10, " ")} ${e.suoZhu.slice(0, 30)}`);
    }
    lines.push(`│`);
  }
  lines.push(`├─ 三要十应灵应 ─────────────────`);
  lines.push(`│ 三要：耳为灵官、目为察官、心为思官 → 三要并用方得真谛`);
  lines.push(`│ 十应：正应/变应/动应/静应/时应/方应/物应/人应/声应/色应 → 融会贯通`);
  lines.push(`│ 灵应：心诚则灵 → 起卦前静心凝神默念所问之事三遍 → 感而遂通`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《梅花易数》—— 宋·邵康节著，外应预测之源头`);
  lines.push(`│ 《三要灵应篇》—— 耳目心三要并用之法则`);
  lines.push(`│ 《康节说易》—— 邵雍易学思想大全`);
  lines.push(`│ 《易学启蒙》—— 朱熹易学入门之作`);
  lines.push(`│ 康节先生云：「天向一中分造化，人于心上起经纶。」`);
  lines.push(`│`);
  lines.push(`└─ 使用提示 ─────────────────`);
  lines.push(`   输入waiXiangType="天时"等查看具体类目外应条目。`);
  lines.push(`   外应贵在临机应变，不可拘泥。须与主卦/变卦/互卦综合参详。`);
  lines.push(`   平常人视而不见之事，善易者能于寻常处见天机。`);
  const summary = lines.join("\n");

  return {
    category, allCategories: WAI_XIANG_CATEGORIES,
    sanYaoShiYing: SAN_YAO_SHI_YING,
    analysis: buildAnalysis(waiXiangType, category),
    summary,
  } as MeiHuaWaiXiangResult & { summary: string };
}

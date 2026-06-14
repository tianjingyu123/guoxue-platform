// ── 紫微星曜详解计算引擎 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
// 紫微斗数14主星+六吉六煞+禄存天马详解

import type { ZiWeiXingYaoInput, ZiWeiXingYaoResult, XingYaoDetail } from "@guoxue/shared";

const XING_YAO_DB: XingYaoDetail[] = [
  { starName:"紫微", category:"主星", wuXing:"土", yinYang:"阳", douBu:"中天", miaoWang:"子午卯酉", liXian:"寅申巳亥", character:"帝王之星，尊贵威严，有领导力，好面子重排场。自尊心强，不喜受人指使。", career:"宜政府/管理/公职/企业高管/品牌运营", wealth:"财源广阔，贵气生财，不宜计较小利", romance:"择偶标准高，喜才貌双全之偶，感情中居于主导", huaQi:"尊贵之气", representative:"皇帝/君主", specialUse:"百官朝拱格：紫微得左右昌曲夹辅，贵不可言" },
  { starName:"天机", category:"主星", wuXing:"木", yinYang:"阴", douBu:"南斗", miaoWang:"巳亥寅申", liXian:"子午卯酉", character:"智慧机敏，善策划谋略，心性多变。思维活跃，好奇心强，喜欢学习新事物。", career:"宜IT/策划/咨询/教育/科研/文职", wealth:"智慧生财，策划得利，不宜冒险投机", romance:"心思细腻但多变，需找稳重可靠的伴侣互补", huaQi:"智慧之机", representative:"谋士/军师", specialUse:"机月同梁格：天机太阴天同天梁会合，宜公职文教" },
  { starName:"太阳", category:"主星", wuXing:"火", yinYang:"阳", douBu:"中天", miaoWang:"寅卯辰巳", liXian:"申酉戌亥", character:"光明磊落，热情慷慨，乐于助人。日生人更旺，夜生人稍逊。好动不好静，有博爱精神。", career:"宜公益/教育/能源/传媒/演艺/外交", wealth:"光明正大得财，公益事业有回报，不宜暗箱操作", romance:"热情浪漫，付出型恋人，但有时过于自我中心", huaQi:"光明之贵", representative:"英雄/领袖", specialUse:"日照雷门格：太阳在卯宫，旭日东升大吉大利" },
  { starName:"武曲", category:"主星", wuXing:"金", yinYang:"阴", douBu:"北斗", miaoWang:"辰戌丑未", liXian:"寅申巳亥", character:"刚毅果决，理财能力强，执行力突出。性格刚直，不善拐弯抹角。先勤后富之命。", career:"宜金融/会计/审计/机械/工程/军队", wealth:"正财之星，理财有道，勤劳致富", romance:"感情中较被动，不善表达，宜找开朗善沟通的伴侣", huaQi:"财富之刚", representative:"将军/商人", specialUse:"将星得地格：武曲在辰戌，刚柔并济大业可成" },
  { starName:"天同", category:"主星", wuXing:"水", yinYang:"阳", douBu:"南斗", miaoWang:"寅卯辰巳", liXian:"申酉戌亥", character:"温和包容，享福安逸，不善竞争。心性善良，人际关系好，但有时缺乏进取心。", career:"宜艺术/设计/美食/旅游/教育/社工", wealth:"福气生财，不争不抢自有来，宜稳定理财", romance:"温柔体贴，善解人意，理想的家庭伴侣", huaQi:"福泽之气", representative:"艺术家/隐士", specialUse:"明珠出海格：天同在亥，如明珠出海大放异彩" },
  { starName:"廉贞", category:"主星", wuXing:"火", yinYang:"阴", douBu:"北斗", miaoWang:"寅午戌", liXian:"巳酉丑", character:"亦正亦邪，才艺多变，机敏善辩。性情激烈，爱憎分明，有艺术天赋但有时偏激。", career:"宜法律/艺术/演艺/广告/公关/司法", wealth:"才艺生财，桃花带财，宜注意财路清白", romance:"桃花星，异性缘佳，但情路多波折，须防桃花劫", huaQi:"桃花之气", representative:"艺术家/刺客", specialUse:"雄宿乾元格：廉贞在寅申，才华横溢可登高位" },
  { starName:"天府", category:"主星", wuXing:"土", yinYang:"阳", douBu:"南斗", miaoWang:"丑卯辰未", liXian:"子午酉戌", character:"稳重守成，善于管理，胸襟开阔。为人诚信可靠，处事稳健，但有时保守固执。", career:"宜管理/公务员/银行/地产/仓储/教育", wealth:"库星守财，善于积蓄管理，宜买田置业", romance:"稳重可靠，是安心型伴侣，但较慢热", huaQi:"库藏之气", representative:"太师/宰相", specialUse:"天府朝垣格：天府居命官，管理之才可当大任" },
  { starName:"太阴", category:"主星", wuXing:"水", yinYang:"阴", douBu:"中天", miaoWang:"卯辰亥子", liXian:"午未申酉", character:"温柔细腻，内敛含蓄，感性重情。心思细腻有美感，月生人更佳，日生人稍逊。", career:"宜文艺/美容/护理/教育/心理咨询/酒店", wealth:"暗财得利，女性贵人相助，宜稳健理财", romance:"温柔多情，善解人意，理想的贤内助", huaQi:"阴柔之气", representative:"皇后/女官", specialUse:"月朗天门格：太阴在卯，清贵之名远播" },
  { starName:"贪狼", category:"主星", wuXing:"水木", yinYang:"阳", douBu:"北斗", miaoWang:"寅午戌", liXian:"巳酉丑", character:"多才多艺，善于交际，欲望强烈。桃花星之首，人缘好，但须防纵欲败身。", career:"宜演艺/销售/外交/艺术/餐饮/文旅", wealth:"交际生财，偏财多但花销也大", romance:"桃花最旺，异性缘极佳，宜选稳重对象", huaQi:"欲望之气", representative:"交际花/商人", specialUse:"贪武同行格：贪狼武曲同宫，文武双全富贵可期" },
  { starName:"巨门", category:"主星", wuXing:"水", yinYang:"阴", douBu:"北斗", miaoWang:"子午丑未", liXian:"寅申卯酉", character:"深沉内敛，口才思辨，心思缜密。善于分析，有研究精神，但有时多疑猜忌。", career:"宜法律/学术/新闻/律师/侦探/审计", wealth:"暗财多，但不稳定，宜分散投资", romance:"感情中不善表达真心，易有误会，需坦诚沟通", huaQi:"暗曜之气", representative:"律师/侦探", specialUse:"巨日同宫格：巨门太阳同宫，口才极佳宜涉外" },
  { starName:"天相", category:"主星", wuXing:"水", yinYang:"阳", douBu:"南斗", miaoWang:"子午丑未", liXian:"寅申卯酉", character:"辅佐之才，公正无私，善于协调。为人正直有原则，善于调和矛盾，忠诚可靠。", career:"宜人力资源/法务/公务员/秘书/咨询", wealth:"正财稳定，辅佐得禄，不宜独自创业", romance:"忠诚可靠，是理想的终身伴侣", huaQi:"印绶之气", representative:"丞相/秘书长", specialUse:"天相朝垣格：天相得吉辅，位至三公" },
  { starName:"天梁", category:"主星", wuXing:"土", yinYang:"阳", douBu:"南斗", miaoWang:"子午辰戌", liXian:"寅申卯酉", character:"长厚稳健，德行高尚，庇荫他人。有长者之风，乐于助人，但有时过于清高。", career:"宜医疗/慈善/教育/社保/宗教/公务员", wealth:"荫财得利，德财相配，不宜急功近利", romance:"责任心强，是可靠的家庭支柱", huaQi:"寿星之气", representative:"长者/慈善家", specialUse:"天梁拱月格：天梁太阴会合，德高望重" },
  { starName:"七杀", category:"主星", wuXing:"金", yinYang:"阴", douBu:"南斗", miaoWang:"寅申巳亥", liXian:"子午卯酉", character:"刚烈决断，勇往直前，不畏艰难。将星之首，执行力极强，但有时冲动急躁。", career:"宜军警/体育/创业/工程/外科医生", wealth:"大刀阔斧得财，创业致富，宜注意风险管理", romance:"感情中占有欲强，宜找包容性强的伴侣", huaQi:"肃杀之气", representative:"将军/猛将", specialUse:"七杀朝斗格：七杀在寅申，将星得位大展宏图" },
  { starName:"破军", category:"主星", wuXing:"水", yinYang:"阴", douBu:"北斗", miaoWang:"子午卯酉", liXian:"寅申巳亥", character:"破旧立新，敢作敢为，勇于创新。先锋性格，不按常理出牌，有破坏才有建设。", career:"宜创业/创新/科研/工程技术/改革", wealth:"大起大落，创新致富，宜保守理财", romance:"感情中追求新鲜感，宜找理解包容的伴侣", huaQi:"破军之气", representative:"先锋/改革家", specialUse:"英星入庙格：破军在子午，英明决断可成大事" },
  // 六吉星
  { starName:"文昌", category:"吉星", wuXing:"金", yinYang:"阳", douBu:"中天", miaoWang:"寅午戌", liXian:"巳酉丑", character:"文思敏捷，学识渊博，好读书。主科举功名，文章出众，学术有成。", career:"宜教育/写作/出版/学术/IT", wealth:"文财得利，文章稿费版税收入", romance:"喜欢知书达理的伴侣，重精神交流", huaQi:"文华之气", representative:"文官/状元", specialUse:"文昌文曲夹命，文采斐然考试大利" },
  { starName:"文曲", category:"吉星", wuXing:"水", yinYang:"阴", douBu:"中天", miaoWang:"申子辰", liXian:"寅午戌", character:"才艺出众，口才流利，多才多艺。异路功名，才艺方面的天赋突出。", career:"宜演艺/设计/音乐/美术/广告/新媒体", wealth:"才艺生财，偏门收入，宜注意节制", romance:"浪漫多情，善于表达，但有时多情善变", huaQi:"才艺之气", representative:"才子/艺人", specialUse:"文曲在命，才艺出众宜以才艺谋生" },
  { starName:"左辅", category:"吉星", wuXing:"土", yinYang:"阳", douBu:"中天", miaoWang:"辰戌丑未", liXian:"其他", character:"辅佐助力，忠诚可靠，贵人扶持。为人忠厚，助人为乐，贵人多助。", career:"宜助理/秘书/行政管理/服务业", wealth:"得贵人助而获利，合伙经营佳", romance:"是忠实的伴侣，顾家负责", huaQi:"辅助之气", representative:"忠臣/助手", specialUse:"左辅右弼夹命，贵人多助事业大成" },
  { starName:"右弼", category:"吉星", wuXing:"水", yinYang:"阴", douBu:"中天", miaoWang:"寅申巳亥", liXian:"其他", character:"暗中相助，幕后智者，润物无声。温和有智慧，不喜欢出风头但能力很强。", career:"宜幕后策划/咨询/心理/教育/文化", wealth:"暗中得利，隐性收入多", romance:"默默付出型，偶尔会被忽视", huaQi:"暗助之气", representative:"幕僚/谋士", specialUse:"右弼在命，暗中得贵人相助事半功倍" },
  { starName:"天魁", category:"吉星", wuXing:"火", yinYang:"阳", douBu:"中天", miaoWang:"寅申卯酉", liXian:"其他", character:"阳贵星，得男性贵人相助。为人豪爽仗义，有侠气，男贵人缘佳。", career:"宜公务员/律师/警察/管理/军队", wealth:"得男性贵人相助而致富", romance:"容易遇到条件好的对象", huaQi:"阳贵之气", representative:"贵公子/侠客", specialUse:"魁钺夹命，贵气逼人科甲有望" },
  { starName:"天钺", category:"吉星", wuXing:"火", yinYang:"阴", douBu:"中天", miaoWang:"子午卯酉", liXian:"其他", character:"阴贵星，得女性贵人相助。为人温和谦逊，女贵人缘佳。", career:"宜文化/教育/医疗/艺术/社会服务", wealth:"得女性贵人相助而致富", romance:"容易遇到温柔体贴的对象", huaQi:"阴贵之气", representative:"贵女/贤内助", specialUse:"天钺在命，女贵人提携一飞冲天" },
  // 六煞星
  { starName:"火星", category:"煞星", wuXing:"火", yinYang:"阳", douBu:"中天", miaoWang:"寅午戌", liXian:"巳酉丑", character:"性急如火，脾气暴躁，但行动力很强。急性子，容易冲动坏事，但也因此效率高。", career:"宜消防/军警/体育/机械/快消", wealth:"来得快去得也快，宜快进快出", romance:"感情中容易急躁冲动，需冷静沟通", huaQi:"暴烈之气", representative:"武将/急先锋", specialUse:"火贪格：火星贪狼同宫，暴发暴富之兆" },
  { starName:"铃星", category:"煞星", wuXing:"火", yinYang:"阴", douBu:"中天", miaoWang:"寅午戌", liXian:"巳酉丑", character:"性急内敛，心中暗火，不易外露。表面平静内心波涛汹涌，忍耐力强但爆发时难以收拾。", career:"宜科研/技术/IT/财务/审计", wealth:"暗财积累，隐忍不发待机爆发", romance:"感情中隐忍不发，积压太久易爆发", huaQi:"暗火之气", representative:"隐忍将", specialUse:"铃贪格：铃星贪狼同宫，隐忍后暴发" },
  { starName:"擎羊", category:"煞星", wuXing:"金", yinYang:"阳", douBu:"北斗", miaoWang:"辰戌", liXian:"子午卯酉", character:"刚强冲动，果决敢为，但易伤人误事。有冲劲但缺乏深思，先行动后思考。", career:"宜外科/军警/机械/工程/屠宰", wealth:"冲劲得财但易有纠纷，宜注意合约", romance:"感情中占有欲强，容易强势伤人", huaQi:"刑伤之气", representative:"刽子手/外科医", specialUse:"马头带箭格：擎羊在午，刚毅果断出将入相" },
  { starName:"陀罗", category:"煞星", wuXing:"金", yinYang:"阴", douBu:"北斗", miaoWang:"辰戌", liXian:"子午卯酉", character:"拖泥带水，反复无常，犹豫不决。做事缠缠绕绕不够痛快，但也有坚韧不拔的一面。", career:"宜精密加工/手工艺/质检/科研", wealth:"细水长流但进程缓慢，宜耐心经营", romance:"感情中拖拖拉拉，难以果断决定", huaQi:"迟滞之气", representative:"工匠/守财奴", specialUse:"陀罗入命，宜精雕细琢型工作" },
  { starName:"地空", category:"煞星", wuXing:"火", yinYang:"阴", douBu:"中天", miaoWang:"-", liXian:"-", character:"好高骛远，脱离实际，思想飘忽。多理想主义，不切实际，但创意十足。", career:"宜艺术/创意/设计/哲学/宗教", wealth:"财来财去不长久，宜及时行乐", romance:"感情中不切实际，宜找现实派伴侣", huaQi:"虚空之气", representative:"幻想家/艺术家", specialUse:"地空入命，不宜经商宜从艺" },
  { starName:"地劫", category:"煞星", wuXing:"火", yinYang:"阳", douBu:"中天", miaoWang:"-", liXian:"-", character:"波折起伏，命运多变，抗压力强。人生多坎坷但也因此积累了丰富经验。", career:"宜探险/极限运动/风险投资/科研", wealth:"大起大落，宜多元化配置", romance:"感情经历丰富但多波折", huaQi:"波折之气", representative:"探险家/冒险者", specialUse:"地劫入命，人生多起伏宜顺势而为" },
  // 辅星
  { starName:"禄存", category:"辅星", wuXing:"土", yinYang:"阳", douBu:"北斗", miaoWang:"寅卯申酉", liXian:"其他", character:"财禄丰足，生活无忧，稳重守成。主钱财积蓄，一生衣食无忧，但不宜单独主事。", career:"宜金融/财会/银行/保险/地产", wealth:"天禄之星，最利钱财积蓄和稳定投资", romance:"物质条件好，能给对方安稳的生活", huaQi:"天禄之气", representative:"富翁/财主", specialUse:"禄马交驰格：禄存天马同宫，富贵双全" },
  { starName:"天马", category:"辅星", wuXing:"火", yinYang:"阳", douBu:"中天", miaoWang:"寅申巳亥", liXian:"其他", character:"奔波劳碌，四处行走，不喜安定。好动不好静，适合需要移动和变化的工作。", career:"宜物流/贸易/外交/导游/空乘/销售", wealth:"奔波得财，动中获利，宜多走动经营", romance:"感情中需要空间和自由，宜找独立型伴侣", huaQi:"奔腾之气", representative:"旅行家/商人", specialUse:"天马在命，宜从事需要频繁移动的职业" },
];

const CATEGORY_ORDER: Record<string, number> = { "主星":1, "吉星":2, "煞星":3, "辅星":4 };

export function calculateZiWeiXingYao(input: Record<string, unknown>): ZiWeiXingYaoResult & { summary: string } {
  const { starName } = input as unknown as ZiWeiXingYaoInput;
  const xingYao = starName ? (XING_YAO_DB.find(s => s.starName === starName) || null) : null;
  const allXingYao = [...XING_YAO_DB].sort((a,b) => (CATEGORY_ORDER[a.category]||9) - (CATEGORY_ORDER[b.category]||9));
  const grouped: Record<string, XingYaoDetail[]> = {};
  for (const s of allXingYao) {
    (grouped[s.category] = grouped[s.category] || []).push(s);
  }
  const analysis = starName && xingYao
    ? `${xingYao.starName}(${xingYao.category}，${xingYao.wuXing}${xingYao.yinYang})：${xingYao.character.slice(0,80)}；庙旺${xingYao.miaoWang}；${xingYao.huaQi}。${xingYao.specialUse}。`
    : `紫微斗数${XING_YAO_DB.length}颗星曜，包括14主星、6吉星、6煞星及辅星。`;

  // 结构化 box-drawing 摘要
  const catNames = Object.keys(grouped).sort((a,b) => (CATEGORY_ORDER[a]||9) - (CATEGORY_ORDER[b]||9));
  const jiCount = XING_YAO_DB.filter(s => s.wuXing === "金").length;
  const muCount = XING_YAO_DB.filter(s => s.wuXing.startsWith("木")).length;
  const shuiCount = XING_YAO_DB.filter(s => s.wuXing.startsWith("水")).length;
  const huoCount = XING_YAO_DB.filter(s => s.wuXing === "火").length;
  const tuCount = XING_YAO_DB.filter(s => s.wuXing === "土").length;

  if (starName && xingYao) {
    const s = xingYao;
    const summary = [
      `┌─ 紫微星曜详解 ────────────────────────`,
      `│ 星名：${s.starName}（${s.category}·${s.wuXing}${s.yinYang}）`,
      `│ 斗部：${s.douBu} 庙旺：${s.miaoWang} 落陷：${s.liXian}`,
      ``,
      `├─ 星性解读 ─────────────────`,
      `│ 性格：${s.character.slice(0,60)}`,
      `${s.character.length > 60 ? `│ ${s.character.slice(60, 120)}` : ""}`,
      `${s.character.length > 120 ? `│ ${s.character.slice(120)}` : ""}`,
      `│`,
      `├─ 十二宫应用 ─────────────────`,
      `│ 事业：${s.career}`,
      `│ 财运：${s.wealth}`,
      `│ 感情：${s.romance}`,
      `│`,
      `├─ 化气格局 ─────────────────`,
      `│ 化气：${s.huaQi}`,
      `│ 代表人物：${s.representative}`,
      `│ 特殊格局：${s.specialUse}`,
      ``,
      `├─ 古籍出处 ─────────────────`,
      `│ 《紫微斗数全书》陈抟老祖著`,
      `│ 《十八飞星策天紫微斗数》`,
      `│ 紫微斗数五大神数之首，14主星配六吉六煞`,
      `│ 以太阴历定命宫，十二宫分布星曜论断吉凶`,
      ``,
      `└─ 综合解读 ─────────────────`,
      `   ${s.starName}属${s.category === "主星" ? "十四主星" : s.category}，`,
      `   五行${s.wuXing}${s.yinYang === "阳" ? "阳性刚健" : "阴性柔顺"}。`,
      `   庙旺在${s.miaoWang}，得地则${s.huaQi}尽显；`,
      `   落陷在${s.liXian}，失地则其性受制反为不利。`,
      `   格局「${s.specialUse}」为关键判断。`,
    ].filter(l => l !== "").join("\n");
    return { xingYao, allXingYao, grouped, analysis, summary } as ZiWeiXingYaoResult & { summary: string };
  }

  // 全览模式
  const lines: string[] = [
    `┌─ 紫微斗数星曜全览 ────────────────────────`,
    `│ 共计${XING_YAO_DB.length}颗星曜 来源：《紫微斗数全书》《十八飞星策天紫微斗数》`,
    ``,
  ];
  for (const cat of catNames) {
    const stars = grouped[cat];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const starNames = stars.map(s => s.starName).join("、");
    lines.push(`├─ ${cat}（${stars.length}颗）─────────────────`);
    for (const s of stars) {
      lines.push(`│ ${s.starName.padEnd(4, " ")} ${s.wuXing.padEnd(4, " ")} ${s.yinYang} ${s.douBu.padEnd(4, " ")} 庙${s.miaoWang.padEnd(10, " ")} ${s.huaQi}`);
    }
    lines.push(`│`);
  }
  lines.push(`├─ 五行分布 ─────────────────`);
  lines.push(`│ 金${jiCount}颗 木${muCount}颗 水${shuiCount}颗 火${huoCount}颗 土${tuCount}颗`);
  lines.push(`│`);
  lines.push(`├─ 紫微斗数基础 ─────────────────`);
  lines.push(`│ 紫微斗数以命宫为核心，分列十二宫：`);
  lines.push(`│ 命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/交友/官禄/田宅/福德/父母`);
  lines.push(`│ 身宫寄于命宫/夫妻/财帛/官禄/迁移/福德六宫之一`);
  lines.push(`│ 定命宫法：生月+生时，以太阴历为准。`);
  lines.push(`│ 四化星：化禄/化权/化科/化忌，随生年天干而定。`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《紫微斗数全书》—— 陈抟老祖著，紫微斗数根本经典`);
  lines.push(`│ 《十八飞星策天紫微斗数》—— 飞星派源头`);
  lines.push(`│ 《紫微斗数骨髓赋》—— 赋文断法精要`);
  lines.push(`│ 紫微斗数为五大神数之首，与四柱八字并称命理双璧。`);
  lines.push(`│`);
  lines.push(`└─ 使用提示 ─────────────────`);
  lines.push(`   输入具体星曜名称可获单星六维详解（性格/事业/财运/感情/化气/格局）。`);
  lines.push(`   星曜不可孤立论断，须结合三方四正、四化飞星、以及大运流年综合判断方得全功。`);
  const summary = lines.join("\n");
  return { xingYao, allXingYao, grouped, analysis, summary } as ZiWeiXingYaoResult & { summary: string };
}

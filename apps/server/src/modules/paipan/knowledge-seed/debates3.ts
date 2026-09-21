import type { ReportKnowledgeSeed } from "./types";

/**
 * 观点对照第三批（2026-09-18）：给议题偏少的五个工具各补一个「核心分歧」。
 *
 * 补这一批的原因：核对覆盖面时发现八字有 5 个议题，而六爻、梅花、奇门、六壬各只有 2 个。
 * 一份九节的卦书里只有两处能看到「我们怎么看」，对「用户不必自己去查各派怎么说」这个定位来说太薄。
 *
 * 选题只挑**真实存在、且直接影响这一盘算出什么**的分歧，不凑数：
 *   奇门 → 定局法（拆补 / 置闰 / 茅山）
 *   六壬 → 月将过宫按中气还是交节
 *   紫微 → 三合派与飞星派看的是同一张盘的两套方法
 *   六爻 → 旬空、月破怎么判，何时还原
 *   梅花 → 互卦变卦在断卦里占多大分量
 *
 * 前两个议题尤其要紧：**它们不是纸上之争，而是用户在排盘页上能选的参数**
 * （引擎 startMethod 默认 chaibu、jiangMethod 默认 zhongqi，另有置闰、茅山、交节可选）。
 * 选得不同，盘本身就不同。所以这两条主线写成「按你排盘时选定的那一种」，
 * 不把默认值说成唯一正确——否则用户选了置闰，报告却告诉他我们按拆补讲，就是自相矛盾。
 *
 * tags 全部取自**真实引擎输出**，不是照代码猜的：
 * 用 computeLiuyao / computeMeihua 与库中真实 QIMEN / DALIUREN / ZIWEI 记录跑了一遍 signals，
 * 确认卦宫吐「兑宫」（六爻）与「兑」（梅花）、元吐「上元」、月将吐「小吉」、五行局吐「水二局」。
 * 上一次靠读代码猜 tags，六壬写成「涉害课」而引擎吐「涉害」，整组条目成了死条目，单测还全绿——
 * mock 的 signals 怎么写都能过，这种错只有拿真盘跑才抓得到。
 */

const src = (label: string) => [{ label, note: "平台自行重述，非逐字摘录" }];

type DebateSeed = Omit<ReportKnowledgeSeed, "paipanType" | "sourceKind" | "sourceRefs"> & {
  sourceKind?: ReportKnowledgeSeed["sourceKind"];
  sourceRefs?: ReportKnowledgeSeed["sourceRefs"];
};

const mk = (paipanType: string, label: string) => (x: DebateSeed): ReportKnowledgeSeed => ({
  paipanType,
  sourceKind: "platform_expert",
  sourceRefs: src(label),
  ...x,
});

const web = (paipanType: string) => (x: DebateSeed): ReportKnowledgeSeed => ({
  paipanType,
  sourceKind: "web",
  sourceRefs: [{ label: "当代网络教学文章与视频的通行讲法汇总", note: "平台归纳重述，非摘录某一篇" }],
  ...x,
});

const qimen = mk("qimen", "《烟波钓叟歌》《奇门遁甲元灵经》与各家定局法公开讲法");
const daliuren = mk("daliuren", "《六壬大全》《六壬指南》及当代六壬教材公开讲法");
const ziwei = mk("ziwei", "《紫微斗数全书》通行本与三合、飞星两派公开讲法");
const liuyao = mk("liuyao", "《增删卜易》《卜筮正宗》《黄金策》通行说法");
const meihua = mk("meihua", "《梅花易数》通行本基本法则");
const qimenWeb = web("qimen");
const liuyaoWeb = web("liuyao");
// 决策人要求「互联网上主流观点也要考虑参考」。核对后发现八字、紫微、奇门、六爻都有这类条目，
// 梅花与六壬缺——这两门在网上恰恰流传着最简化的口诀，不摆出来反倒说不清我们为什么不那么讲。
const meihuaWeb = web("meihua");
const daliurenWeb = web("daliuren");

// ══════════════ 奇门：定局法 ══════════════

/**
 * 这是奇门最根上的分歧：局定错了，值符值使、九宫布局全盘皆错，
 * 后面讲得再细也是在另一个盘上说话。
 */
const KEY_QIMEN_JU = "qimen:定局法:拆补置闰";
/** 元是定局的产物，每盘必出其一，挂在这里必然命中 */
const TAG_YUAN = ["上元", "中元", "下元"];

const QIMEN_DINGJU: ReportKnowledgeSeed[] = [
  qimen({
    kind: "school_theory", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "consensus", tags: TAG_YUAN,
    title: "共识：先定局才有盘，局错则满盘皆错",
    content:
      "各家都承认时家奇门的第一步是定局——确定阴遁阳遁与第几局，再按局布九宫、起值符值使。分歧的源头是一件绕不开的事：节气按太阳走，每气十五天左右；符头（甲己日）按干支走，每元整十天。两条线对不齐，一年下来必然错开几天。怎么处理这几天的错位，就分出了几种定局法。所以争的不是谁懂奇门，而是这几天怎么补。",
  }),
  qimen({
    kind: "school_theory", school: "chaibu", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "mainstream", tags: TAG_YUAN,
    title: "主流：拆补法——节气一到就换局，元按符头拆补",
    content:
      "拆补法以节气交接为准：交节即换局，上中下元按符头（甲己为符头）顺次拆补，不足之日补入邻元。它的好处是节气与局始终对齐，不会出现「已经立春了还在用上一个节气的局」，排出来的盘和历法直观一致，也便于复核。当代排盘软件与多数教材默认采用这一路，本平台排盘引擎的默认值同样是拆补。",
  }),
  qimen({
    kind: "school_theory", school: "zhirun", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "alternative", tags: TAG_YUAN,
    title: "另一说：置闰法——遇超神接气则置闰，保住符头与节气同步",
    content:
      "置闰法不肯打断符头的节奏：当符头跑到节气前面（超神）累积到一定程度，就重复一个节气的局作为闰局，把符头与节气重新拉回同步，此即「超神接气、置闰补齐」。主张者认为奇门的根在六十甲子的循环，宁可闰一次，也不该把一元拆散。代价是需要判断何时置闰，不同师承的置闰时机不完全一致，同一天可能排出不同的局——这也是两派长期争论不下的原因。",
  }),
  qimen({
    kind: "school_theory", school: "maoshan", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "minority", tags: TAG_YUAN,
    title: "少数说：茅山一路不分三元，直接由时干支定局",
    content:
      "茅山法及部分阴盘奇门不走三元定局，直接以时辰干支定局，省去了符头与节气对齐的整个麻烦。这一路多用于择时应事而非长时段推演，自成体系、内部自洽，但与拆补、置闰不是同一套坐标，不能拿三元的盘去校验它，也不宜把两边的断语混着用。存录备考。",
  }),
  qimenWeb({
    kind: "knowledge_point", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "mainstream", tags: TAG_YUAN,
    title: "网上一般这么说：「拆补置闰各有传承，看你跟哪位老师」",
    content:
      "网络教学里最常见的处理是把这件事归给师承——「拆补置闰各有道理，跟哪位老师就用哪一种」，然后不再深究。这句话方向没错，两派确实都有传承；但它容易让初学者以为这只是口味问题。实际影响是具体的：在超神接气那几天，两法排出的局不同，值符值使随之不同，断出来的方位与时机也不同。平日两法结果多数一致，恰恰是这几天见分晓——所以要紧的不是选哪派，而是知道自己用的是哪一种、什么时候会分岔。",
  }),
  qimen({
    kind: "knowledge_point", topic: "时家奇门怎么定局", debateKey: KEY_QIMEN_JU, stance: "platform_line", tags: TAG_YUAN,
    title: "本报告主线：按你排盘时选定的定局法来讲，默认拆补",
    content:
      "本报告用的局，就是你排盘时选定的那一种；你没有特意改过，用的是拆补法——节气一到即换局，上中下元按符头拆补。选它作默认有两个实在的理由：与本平台排盘引擎、与你在页面上看到的那张盘完全一致，不会出现报告和盘面各说一套；当代教材与软件也以这一路为通行，你拿别处的盘来对照，结果多半对得上。要点是：这一盘的所有断语都建立在这个局上，换一种定局法就是换一张盘，不能把两边的结论混着用。若你跟的师承用置闰法，在排盘页把定局法改成置闰再出一份报告即可，本报告会按置闰的盘重新讲。",
  }),
];

// ══════════════ 六壬：月将过宫 ══════════════

/**
 * 月将加时是六壬起课的根，月将取错则四课三传全错——
 * 与奇门定局法一样，这也是用户在排盘页能选的参数。
 */
const KEY_LIUREN_JIANG = "daliuren:月将:中气还是交节";
/** 十二月将名，每课必出其一 */
const TAG_JIANG = ["登明", "河魁", "从魁", "传送", "小吉", "胜光", "太乙", "天罡", "太冲", "功曹", "大吉", "神后"];

const LIUREN_YUEJIANG: ReportKnowledgeSeed[] = [
  daliuren({
    kind: "school_theory", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "consensus", tags: TAG_JIANG,
    title: "共识：月将是课的根，月将错则四课三传无一处可信",
    content:
      "六壬起课的第一步是「月将加时」——把当月的月将加在占时上转天盘，四课由此取出，三传由四课发出。所以月将一旦取错，后面整课都建立在错的天盘上，课体、天将、发用全部随之而错，不存在「只错一点」的可能。各家在这一点上没有分歧；分歧在于月将究竟何时换：按中气，还是按交节。",
  }),
  daliuren({
    kind: "school_theory", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "mainstream", tags: TAG_JIANG,
    title: "主流：按中气换将——雨水后用亥将登明，依次退行",
    content:
      "通行诸书都以中气换将：雨水后亥将登明、春分后戌将河魁、谷雨后酉将从魁、小满后申将传送、夏至后未将小吉、大暑后午将胜光、处暑后巳将太乙、秋分后辰将天罡、霜降后卯将太冲、小雪后寅将功曹、冬至后丑将大吉、大寒后子将神后。这样排的道理在于月将本意是太阳所在之宫，而中气正是太阳过宫的时刻，中气换将才与太阳实际所在对得上。这是《六壬大全》以来的主流，也是本平台排盘引擎的默认。",
  }),
  daliuren({
    kind: "school_theory", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "alternative", tags: TAG_JIANG,
    title: "另一说：按交节换将，与四柱的月建保持一致",
    content:
      "另有一路主张按交节换将，理由是六壬用干支、四柱也用干支，月建既然以交节为界，月将不该另立一套，否则同一天在两门术里分属不同的月。这一说在与八字合参、或师承本就以节气为纲时更顺手。但它与「月将即太阳所在」的本义有出入，且在中气与交节之间那半个月里，两法取出的月将相差一位，天盘整体错开一宫，课体常常完全不同。",
  }),
  daliuren({
    kind: "school_theory", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "minority", tags: TAG_JIANG,
    title: "少数说：直接按太阳实际黄经过宫",
    content:
      "天文一路主张既然月将就是太阳所在之宫，便直接按太阳实际黄经定将，不迁就中气或交节的日期取整。理论上最贴合本义，在过宫当日尤其精确；代价是需要天文历数支持，手工起课难以复核，也与流传的课例对不上号。存录备考，本报告不据此起课。",
  }),
  daliurenWeb({
    kind: "knowledge_point", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "mainstream", tags: TAG_JIANG,
    title: "网上一般这么说：「月将就是月建的对冲」",
    content:
      "网络入门文章里常把月将说成「月建的对冲支」——正月建寅、月将取亥，看着确实对得上。这个口诀好记，多数月份也算得出正确结果，但它把因果讲反了：月将的本义是太阳所在之宫，与月建对冲只是历法上的巧合结果，不是定义。照口诀推，一旦碰上中气与交节之间那半个月就会出错，因为月建已经换了、太阳却还没过宫。所以本报告按太阳过宫来讲，不用这句口诀。",
  }),
  daliuren({
    kind: "knowledge_point", topic: "月将按中气还是交节过宫", debateKey: KEY_LIUREN_JIANG, stance: "platform_line", tags: TAG_JIANG,
    title: "本报告主线：按你排盘时选定的换将法，默认中气换将",
    content:
      "本课的月将，按你排盘时选定的换将法取；你没有特意改过，用的是中气换将。取它作默认的理由很直接：月将的本义是太阳所在之宫，中气正是太阳过宫之时，二者本就该对齐；这也是《六壬大全》以来诸书的通行取法，你拿古书课例来对照才对得上。落到这一课上要记住一点：中气与交节之间那半个月，两法的月将相差一位，天盘整体错开一宫，课体与三传都会变——不是小出入。所以不要把按另一法起的课与这一课的断语混着看。若你的师承按交节换将，在排盘页改选后重出一份报告即可。",
  }),
];

// ══════════════ 紫微：三合与飞星 ══════════════

const KEY_ZIWEI_PAI = "ziwei:看盘方法:三合还是飞星";
/** 五行局每盘必出其一 */
const TAG_JU = ["水二局", "木三局", "金四局", "土五局", "火六局"];

const ZIWEI_SANHE_FEIXING: ReportKnowledgeSeed[] = [
  ziwei({
    kind: "school_theory", topic: "三合派与飞星派怎么看同一张盘", debateKey: KEY_ZIWEI_PAI, stance: "consensus", tags: TAG_JU,
    title: "共识：两派用的是同一张盘，分歧在怎么读它",
    content:
      "先把一件容易被误会的事说清楚：三合与飞星不是两种排盘法，而是两种读盘法。十二宫怎么安、十四主星怎么布、五行局怎么定，两派并无二致——你在页面上看到的这张盘，两派看到的是同一张。分歧在于把重心放在哪里：是看星曜落宫与三方四正的会照，还是看四化在宫与宫之间的牵引。知道这一点，就不会因为两派讲法不同而以为自己的盘被排错了。",
  }),
  ziwei({
    kind: "school_theory", school: "sanhe", topic: "三合派与飞星派怎么看同一张盘", debateKey: KEY_ZIWEI_PAI, stance: "mainstream", tags: TAG_JU,
    title: "主流：三合派——以星曜组合与三方四正会照论格局",
    content:
      "三合派是流传最广的一路：以命宫为主，兼看三方四正（对宫、财帛、官禄）会照的星曜，按主星组合与庙旺落陷判格局高低，再以吉煞加会定成败。它的长处是体系完整、有大量成例可循，对「这个人大体是什么路数」给得出清晰的轮廓，初学也最容易入门。短处是格局一旦定下，容易把话说得偏死，对具体事情的来龙去脉说得不够细。",
  }),
  ziwei({
    kind: "school_theory", school: "feixing", topic: "三合派与飞星派怎么看同一张盘", debateKey: KEY_ZIWEI_PAI, stance: "alternative", tags: TAG_JU,
    title: "另一说：飞星派——重四化飞星与宫位互涉，不重庙陷",
    content:
      "飞星派（河洛派、钦天四化一路）看的是四化在宫与宫之间怎么飞：某宫化禄入某宫、化忌冲某宫，由此看事情从哪里来、往哪里去、被什么牵绊。它基本不以庙旺落陷论高低，认为星曜的吉凶要看它在这个盘里被四化牵成了什么关系。长处是讲得动具体事件与因果脉络；短处是宫位互涉推起来层层递进，稍一放宽就能自圆其说，对判断者的克制要求更高。",
  }),
  ziwei({
    kind: "school_theory", topic: "三合派与飞星派怎么看同一张盘", debateKey: KEY_ZIWEI_PAI, stance: "minority", tags: TAG_JU,
    title: "少数说：中州派、紫云派等各有独门取法",
    content:
      "此外还有中州派（重星曜庙陷的细分与星系性质）、紫云派（重宫位与人事的对应）等各立门户的取法，各有一套自洽的规矩与验证方式。它们多以师承口传为主，公开材料零散，彼此的术语也不通用。存录备考：知道有这些讲法即可，不必拿它们的结论来校验本报告。",
  }),
  ziwei({
    kind: "knowledge_point", topic: "三合派与飞星派怎么看同一张盘", debateKey: KEY_ZIWEI_PAI, stance: "platform_line", tags: TAG_JU,
    title: "本报告主线：以三合的宫位会照为骨架，四化作为线索，庙陷不作断语依据",
    content:
      "本报告按三合的路子搭骨架：先看命宫主星与三方四正会照的组合，定下大体的路数，再用生年四化的落宫作为线索，看哪几宫被牵动得最要紧。有一点必须如实说明：本平台的排盘引擎目前不计算星曜庙旺落陷，所以本报告不拿庙陷说吉凶，凡涉及庙陷的断语一律不出——这是实现上的限制，不是学理上认为庙陷无用。因此你读到的结论，是从宫位结构与四化牵引推出来的，不含「某星在某宫庙旺所以好」这一类话。若你师从飞星一路，可把本报告的宫位结构当作共同底盘，再按飞星的方法自行推演，两者不冲突。",
  }),
];

// ══════════════ 六爻：旬空与月破 ══════════════

const KEY_LIUYAO_KONGPO = "liuyao:旬空月破:怎么判何时还原";
/** 卦宫每卦必出其一 */
const TAG_GONG = ["乾宫", "兑宫", "离宫", "震宫", "巽宫", "坎宫", "艮宫", "坤宫"];

const LIUYAO_KONGPO: ReportKnowledgeSeed[] = [
  liuyao({
    kind: "school_theory", topic: "旬空与月破怎么判、何时还原", debateKey: KEY_LIUYAO_KONGPO, stance: "consensus", tags: TAG_GONG,
    title: "共识：空破之爻当下不顶用，但不等于这件事没有指望",
    content:
      "各家都承认：爻逢旬空或月破，当下是不受力的——用神旬空，事情眼下悬着；用神月破，眼下被压着。同样各家都承认空破有还原之时，不能一见空破就断绝望。真正的分歧在两处：什么样的空才算「真空」，以及还原的时机怎么定。看卦时先把这一层共识摆正，就不会被「逢空即凶」这类断语吓住。",
  }),
  liuyao({
    kind: "school_theory", topic: "旬空与月破怎么判、何时还原", debateKey: KEY_LIUYAO_KONGPO, stance: "mainstream", tags: TAG_GONG,
    title: "主流：《增删卜易》一路——空待出空而应，破待出月或填实",
    content:
      "通行取法很明确：旬空之爻，待出了本旬（到该爻地支的值日或本旬结束）即为出空，事应于出空之时；月破之爻，待出了本月，或到与该爻地支相同之日「填实」，破处方能受力。这一路把空破当作时间上的「暂缓」而非结果上的「否定」，因此断语往往落在应期上——不是成不成，而是何时才动得了。这是流传最广、也最便于验证的一路。",
  }),
  liuyao({
    kind: "school_theory", topic: "旬空与月破怎么判、何时还原", debateKey: KEY_LIUYAO_KONGPO, stance: "alternative", tags: TAG_GONG,
    title: "另一说：分真空假空——有气者不为空，无气者才是真空",
    content:
      "另一路主张空要分真假：爻虽逢空，若得月建日辰生扶、或本爻发动，是「假空」，出空即能用；若休囚无气、又被克制，才是「真空」，出空也难有作为。旺不为空、动不为空、有日辰生扶不为空，是这一路常用的判别。它比单看旬空更细，能解释为什么有些逢空的卦照样成事；代价是判定「有气无气」本身要拿捏，标准宽一点就容易把真空说成假空，把断语说宽。",
  }),
  liuyaoWeb({
    kind: "knowledge_point", topic: "旬空与月破怎么判、何时还原", debateKey: KEY_LIUYAO_KONGPO, stance: "mainstream", tags: TAG_GONG,
    title: "网上一般这么说：「逢空则空，月破无用」",
    content:
      "网络文章与短视频里最常见的是两句口诀——「逢空则空」「月破无用」，用神一见空破就直接断作不成。方向上它承接的是主流说法，作为口诀记没有错；但它把「眼下不受力」说成了「这件事没有指望」，既不提出空填实的时机，也不分真空假空。照这两句对号入座，最容易出现的偏差就是把只是需要等待的事，断成了根本没门——这正是本报告要把应期和条件讲清楚的原因。",
  }),
  liuyao({
    kind: "knowledge_point", topic: "旬空与月破怎么判、何时还原", debateKey: KEY_LIUYAO_KONGPO, stance: "platform_line", tags: TAG_GONG,
    title: "本报告主线：空破按「暂缓」讲，落到出空填实的时点上，不按吉凶下结论",
    content:
      "本报告一律按主流一路来讲：用神逢旬空，作「眼下悬着、待出空而动」，应期落在出空之日；用神逢月破，作「此月被压、待出月或填实方能受力」。同时把真假空的条件一并说清——若该爻得日辰月建生扶或本爻发动，出空即能用，力度不打折；若休囚无气又受克，即便出了空也只是勉强。这样安排的理由是：主流一路的时点判断可以落到具体日子上，你能拿后续的事情去验证它，而「真空假空」如果单独拿来下结论，标准松紧全在判断者一念之间。所以本报告的做法是：结论按主流定，真假空只用来调整力度，不用来推翻结论。",
  }),
];

// ══════════════ 梅花：互卦与变卦的分量 ══════════════

const KEY_MEIHUA_HUBIAN = "meihua:互卦变卦:占多大分量";
/** 梅花的卦宫吐单字（与六爻的「兑宫」不同），每卦必出其一 */
const TAG_PALACE = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];

const MEIHUA_HUBIAN: ReportKnowledgeSeed[] = [
  meihua({
    kind: "school_theory", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "consensus", tags: TAG_PALACE,
    title: "共识：本卦看眼下、互卦看过程、变卦看结果，三者管的不是同一段",
    content:
      "各家都用本、互、变三卦，也都同意它们各管一段：本卦是事情当下的样子，互卦是中间那一程会遇到什么，变卦是最后落到哪里。分歧不在要不要看，而在权重——断吉凶时以哪一卦为准，其余两卦能不能推翻它。这一层共识先立住，就不会觉得几卦的讲法互相打架：它们本来说的就是事情的不同阶段。",
  }),
  meihua({
    kind: "school_theory", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "mainstream", tags: TAG_PALACE,
    title: "主流：体用生克定吉凶，变卦次之，互卦最轻",
    content:
      "《梅花易数》通行本的路子是以体用为纲：先看体用之间的生克比和定下吉凶大局，再以变卦看结果的去向，互卦只作过程参考。理由是体用之分直接对应「我」与「所占之事」，关系最实在；互卦是从本卦中间四爻取出的，隔了一层，所推的是曲折而非成败。这一路最稳，初学照着断不容易跑偏。",
  }),
  meihua({
    kind: "school_theory", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "alternative", tags: TAG_PALACE,
    title: "另一说：重互卦——事情的曲折全在中间那一程",
    content:
      "另有一路特别看重互卦，认为体用只给出大方向，事情究竟怎么走、中途卡在哪里，全看互卦：互卦克体则中途受阻，互卦生体则有人相助，互卦与变卦相连还能看出转折在何处发生。用于问过程、问阻碍时，这一路确实比单看体用讲得细。但把互卦提到与体用同等的地位去定吉凶，容易出现本卦体用明明为吉、因互卦不利而改断为凶的情况，结论就飘了。",
  }),
  meihua({
    kind: "school_theory", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "minority", tags: TAG_PALACE,
    title: "少数说：只取体用，不看互变",
    content:
      "有一路主张梅花贵在简捷，一卦一断，只论体用生克与卦气旺衰，互卦变卦一概不取，认为多看一层便多一层附会。用于当下起卦、即时决断确实利落；但问事情的结果与走向时无话可说，也难以给出应期。存录备考。",
  }),
  meihuaWeb({
    kind: "knowledge_point", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "mainstream", tags: TAG_PALACE,
    title: "网上一般这么说：「变卦克体就是凶」",
    content:
      "短视频与入门文章里最常见的是一句「体生用为耗、用生体为吉、变卦克体则凶」，一句口诀套所有卦。方向承接的是通行讲法，记住不吃亏；但它把变卦当成了最终判决，也不问体卦本身旺不旺、互卦那一程顺不顺。照它对号入座，最容易出现的偏差是把只在中途受些阻碍的事，直接断成办不成——这正是本报告要把体用、互卦、变卦各管哪一段说清楚的原因。",
  }),
  meihua({
    kind: "knowledge_point", topic: "互卦变卦在断卦里占多大分量", debateKey: KEY_MEIHUA_HUBIAN, stance: "platform_line", tags: TAG_PALACE,
    title: "本报告主线：体用定吉凶、变卦定结果、互卦只讲过程，互卦不推翻体用",
    content:
      "本报告按通行本的主次来讲，并且把这个主次定死：吉凶由体用生克定；结果的去向看变卦；互卦只用来说中途会遇到什么，不参与吉凶的判定。也就是说，互卦不利时，本报告会告诉你「中途有一段不顺、难在哪里」，但不会因此把体用已定的结论翻过来。这样定的理由是：体用对应「我」与「所占之事」，关系最直接，可复核；互卦隔着一层，若允许它推翻体用，同一卦按不同人的取舍就能断出相反结果，卦也就不成其为卦了。你若专门想问过程的曲折，把注意力放在本报告讲互卦的那几句上，那正是为这个问题准备的。",
  }),
];

export const DEBATE_SEEDS_3: ReportKnowledgeSeed[] = [
  ...QIMEN_DINGJU,
  ...LIUREN_YUEJIANG,
  ...ZIWEI_SANHE_FEIXING,
  ...LIUYAO_KONGPO,
  ...MEIHUA_HUBIAN,
];

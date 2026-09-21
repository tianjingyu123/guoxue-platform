import type { ReportKnowledgeSeed } from "./types";

/**
 * 观点对照条目·第二批（2026-09-18）
 *
 * 第一批每个工具只有一两个议题，一份报告常常只命中一条，覆盖面太薄。
 * 这一批补的都是各自术数里**最常被问、各家讲法最不一致**的地方，
 * 并且刻意挂在与第一批不同的检索信号上——同一份报告才能多命中几组，
 * 而不是几个议题抢同一个 tag。
 *
 * 写法与第一批一致：每组必须有且只有一条 platform_line，且主线要给确定结论。
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
const webOf = (paipanType: string) => (x: DebateSeed): ReportKnowledgeSeed => ({
  paipanType,
  sourceKind: "web",
  sourceRefs: [{ label: "当代网络命理文章与教学视频的通行讲法汇总", note: "平台归纳重述，非摘录某一篇" }],
  ...x,
});

const bazi = mk("bazi", "《子平真诠》《穷通宝鉴》《滴天髓》及盲派口传的公开讲法");
const baziWeb = webOf("bazi");
const ziwei = mk("ziwei", "《紫微斗数全书》通行本与三合、飞星两派公开讲法");
const ziweiWeb = webOf("ziwei");
const liuyao = mk("liuyao", "《增删卜易》《卜筮正宗》《黄金策》通行说法");
const meihua = mk("meihua", "《梅花易数》通行本基本法则");
const qimen = mk("qimen", "《烟波钓叟歌》《奇门遁甲元灵经》通行说法");
const daliuren = mk("daliuren", "《六壬大全》《六壬指南》通行说法");

// ══════════════ 八字 ══════════════

/** 中和之局怎么取用——身不偏旺也不偏弱时，扶抑法失去着力点，这里最容易各说各话 */
const K_YONG = "bazi:用神:扶抑还是调候";
const YONG_FA: ReportKnowledgeSeed[] = [
  bazi({
    kind: "school_theory", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "consensus",
    tags: ["用神调候取用"],
    title: "共识：用神是全盘的抓手，取错了后面全是空话",
    content:
      "用神定下来，喜忌、岁运吉凶、行事方向才有依据，这一点各派没有异议。争的是「怎么取」：日主明显偏旺偏弱时，扶抑法人人会用；难就难在旺衰相当的中和之局——扶也不是抑也不是，这时各家取法开始分道扬镳。",
  }),
  bazi({
    kind: "school_theory", school: "ziping", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "mainstream",
    tags: ["用神调候取用"],
    title: "调候一路：先看寒暖燥湿，再谈强弱",
    content:
      "《穷通宝鉴》一路主张先论调候：生于寒月者取火暖局，生于燥月者取水润局，湿重取火土去湿，燥甚取水金润燥。理由是寒暖燥湿是一个人过得舒不舒展的底色，中和之局强弱本就分不出高下，再在强弱上纠缠没有意义，不如从气候入手。这是目前中和局取用最通行的一路。",
  }),
  bazi({
    kind: "school_theory", school: "ziping", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "alternative",
    tags: ["用神调候取用"],
    title: "另一说：取通关之神，解开全局最紧的那一处冲克",
    content:
      "另一路主张看全局哪两组力量相持不下，取能在中间起沟通作用的那一行为用——如水火相战取木通之、金木相战取水通之。这一说不看寒暖而看结构，认为中和之局的问题不在冷热而在僵持；用神的作用是把僵住的地方打通。",
  }),
  bazi({
    kind: "school_theory", school: "mangpai", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "alternative",
    tags: ["用神调候取用"],
    title: "盲派：不取用神，只看全局在做什么功",
    content:
      "盲派干脆不设「用神」这个环节，而是看全局在做什么功：谁制谁、谁合谁、谁进了库、谁开了库。在这一路看来，用神是后人为了讲解方便立的名目，真正决定成败的是干支之间成不成事。因此中和之局在盲派手里不构成难题——本来就不按强弱论。",
  }),
  baziWeb({
    kind: "knowledge_point", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "mainstream",
    tags: ["用神调候取用"],
    title: "网上一般这么说：日主强就抑、弱就扶，一句话套到底",
    content:
      "网络上讲用神，绝大多数只讲扶抑一条：强则克泄耗，弱则生扶帮。这条规则好记、好用，对偏旺偏弱的盘也确实管用，所以传播最广。它的问题是遇到中和之局就失灵——强弱分不出来时，「该扶还是该抑」这个问题本身就不成立，而多数文章到这里就含糊过去，或者硬把中和判成偏弱。",
  }),
  bazi({
    kind: "knowledge_point", topic: "中和之局怎么取用", debateKey: K_YONG, stance: "platform_line",
    tags: ["用神调候取用"],
    title: "本报告主线：旺衰分明用扶抑，中和之局取调候",
    content:
      "本报告按这条线取用：日主偏旺偏弱时用扶抑，旺衰相当的中和之局改用调候，先看生于何月、寒暖燥湿如何，再定该补什么。" +
      "这样分工的理由是两法各管一段——扶抑回答「力量够不够」，调候回答「过得舒不舒展」，中和局本就分不出强弱，硬判一个反而误导。" +
      "通关一说我们当作补充：全局确有两组力量僵持时，会在正文里点出通关之神在哪一行。盲派不取用神的路子另成体系，本报告不混用，以免出现两套口径。",
  }),
];

/** 神煞该占多大分量——初学者最容易被神煞吓到的地方 */
const K_SHEN_SHA = "bazi:神煞:断命里占多大分量";
const SHEN_SHA_FEN: ReportKnowledgeSeed[] = [
  bazi({
    kind: "school_theory", topic: "神煞占多大分量", debateKey: K_SHEN_SHA, stance: "consensus",
    tags: ["天乙贵人", "华盖", "驿马", "桃花", "羊刃", "空亡", "孤辰", "寡宿"],
    title: "共识：神煞是取象的补充，不是决定吉凶的主干",
    content:
      "无论哪一派都承认：一颗吉神救不了破格之局，一颗凶煞也压不倒成格得用之命。神煞的作用是说明「这件事以什么面貌出现」——是热闹的、孤清的、奔波的，还是招人议论的。分歧在于它到底该占几分权重，以及那些听着吓人的煞要不要照说。",
  }),
  bazi({
    kind: "school_theory", school: "ziping", topic: "神煞占多大分量", debateKey: K_SHEN_SHA, stance: "mainstream",
    tags: ["天乙贵人", "华盖", "驿马", "桃花", "羊刃", "空亡", "孤辰", "寡宿"],
    title: "子平主流：格局用神为主，神煞只作旁证",
    content:
      "子平法把神煞放在很次要的位置：先定格局用神，再拿神煞来补充描述。同样是命带桃花，身旺有制的人是人缘好、场面开得开，身弱无制的人才容易因情感耗损——决定的是格局，不是那颗桃花。因此断命顺序不能颠倒，先看骨架再看装饰。",
  }),
  bazi({
    kind: "school_theory", school: "mangpai", topic: "神煞占多大分量", debateKey: K_SHEN_SHA, stance: "alternative",
    tags: ["天乙贵人", "华盖", "驿马", "桃花", "羊刃", "空亡", "孤辰", "寡宿"],
    title: "盲派：神煞用来定事，落在哪一柱就说明事发在哪一段",
    content:
      "盲派用神煞比子平重，但用法不同：不论吉凶，只用来定事。驿马定动、桃花定人缘与情感、华盖定技艺与清冷，落在年柱就关乎早年与长辈，落在时柱就关乎晚年与子女。这一路把神煞当作「事象的坐标」，与子平把它当「旁证」的用法并不冲突，只是精细程度不同。",
  }),
  baziWeb({
    kind: "knowledge_point", topic: "神煞占多大分量", debateKey: K_SHEN_SHA, stance: "mainstream",
    tags: ["天乙贵人", "华盖", "驿马", "桃花", "羊刃", "空亡", "孤辰", "寡宿"],
    title: "网上一般这么说：命带某煞就会怎样，一颗定终身",
    content:
      "网络上关于神煞的内容最多也最耸动：「命带孤辰寡宿必晚婚」「羊刃入命必有血光」「桃花重的人感情必乱」。这类说法抓眼球、好传播，却把一颗星的分量放大到能定终身。实际推命时，同样带孤辰的人里，绝大多数只是性子独立、喜欢独处，与「注定孤苦」相去很远。看到这类断语，先问一句「这个盘的格局用神是什么」，就不至于被一颗煞牵着走。",
  }),
  bazi({
    kind: "knowledge_point", topic: "神煞占多大分量", debateKey: K_SHEN_SHA, stance: "platform_line",
    tags: ["天乙贵人", "华盖", "驿马", "桃花", "羊刃", "空亡", "孤辰", "寡宿"],
    title: "本报告主线：神煞只用来取象，不用来定吉凶",
    content:
      "本报告按子平的次序：先讲格局用神，再用神煞补充「这件事长什么样」，**不拿任何一颗神煞下吉凶断语**。" +
      "这么定有两个理由：一是神煞体系历代叠加、同名异说极多，拿它定吉凶经不起复核；二是那些耸人听闻的断语对使用者没有帮助，只会制造恐惧。" +
      "盲派用神煞定事那一路我们采纳其中合理的部分——报告会标明神煞落在哪一柱，供你判断事情大致发生在人生哪一段。",
  }),
];

// ══════════════ 紫微 ══════════════

const K_WU_ZHU = "ziwei:命无主星:该怎么论";
const WU_ZHU_XING: ReportKnowledgeSeed[] = [
  ziwei({
    kind: "school_theory", topic: "命宫无主星怎么论", debateKey: K_WU_ZHU, stance: "consensus",
    tags: ["命无主星"],
    title: "共识：命宫不坐十四主星，不能就此断为命薄",
    content:
      "十二宫里总有几宫不坐主星，命宫落在其中并不稀奇，各派都不认为这本身是坏事。要处理的只是一个技术问题：主星是论命的骨架，命宫没有骨架时，该从哪里补一副进来。",
  }),
  ziwei({
    kind: "school_theory", school: "sanhe", topic: "命宫无主星怎么论", debateKey: K_WU_ZHU, stance: "mainstream",
    tags: ["命无主星"],
    title: "主流：借对宫（迁移宫）主星来论",
    content:
      "通行做法是借对宫主星：命宫无主星时，把迁移宫的主星视作命宫的主星来讲，同时参看三方四正会照的吉煞。理由是对宫与本宫气息相通，本宫空时对宫的力量自然显出来。借来的星要打个折扣看——性情是那个性情，但表现得不如本身坐命那样鲜明。",
  }),
  ziwei({
    kind: "school_theory", topic: "命宫无主星怎么论", debateKey: K_WU_ZHU, stance: "alternative",
    tags: ["命无主星"],
    title: "另一说：不借星，直接看三方四正与四化",
    content:
      "另一路主张不必借：命宫无主星者本就性格可塑、随境而转，强行借一颗星反而把人说死了。这一路把重心放在三方四正会照的辅煞与四化落宫上，认为「环境塑造了他」正是这类命盘的特点，借星是多此一举。",
  }),
  ziweiWeb({
    kind: "knowledge_point", topic: "命宫无主星怎么论", debateKey: K_WU_ZHU, stance: "mainstream",
    tags: ["命无主星"],
    title: "网上一般这么说：命宫无主星＝空宫＝命弱",
    content:
      "网络上常把无主星直接说成「空宫」，再引申为命弱、无主见、一生飘零。这个说法流传很广，也最容易让人心里发慌。实际上「空」只是没坐那十四颗正曜，宫里往往仍有辅星、煞星、四化，并不真的空；而随境而变在现代社会常常是适应力强的表现，与「命弱」不是一回事。",
  }),
  ziwei({
    kind: "knowledge_point", topic: "命宫无主星怎么论", debateKey: K_WU_ZHU, stance: "platform_line",
    tags: ["命无主星"],
    title: "本报告主线：借对宫主星来讲，并说明借来的要打折扣",
    content:
      "本报告按主流做法：命宫无主星时借迁移宫主星来论，同时把三方四正的会照与四化一并讲清。" +
      "取这条线是因为它有骨架可循、便于复核，也和大多数教材一致，你拿本报告去对照别处的资料不会打架。" +
      "但我们会明确写出两点：一是借来的星表现得不如本身坐命鲜明，论断要留余地；二是无主星不等于命弱——吉星拱照者反成明珠出海之象，报告里若成此格会单独标出。",
  }),
];

const K_DA_XIAN = "ziwei:大限:顺行还是逆行";
const DA_XIAN: ReportKnowledgeSeed[] = [
  ziwei({
    kind: "school_theory", topic: "大限顺逆怎么定", debateKey: K_DA_XIAN, stance: "consensus",
    tags: ["水二局", "木三局", "金四局", "土五局", "火六局"],
    title: "共识：大限排错，十年一步全错位",
    content:
      "大限自命宫起、按五行局数定起始年龄、一宫十年，这一套各派一致。也都同意一件事：顺逆排错，等于把人生的每一个十年都挪到了别的宫，运程判断整个失准。分歧只在顺逆由什么决定。",
  }),
  ziwei({
    kind: "school_theory", school: "sanhe", topic: "大限顺逆怎么定", debateKey: K_DA_XIAN, stance: "mainstream",
    tags: ["水二局", "木三局", "金四局", "土五局", "火六局"],
    title: "主流：阳男阴女顺行，阴男阳女逆行",
    content:
      "通行做法按生年天干的阴阳与性别定顺逆：阳年生的男性、阴年生的女性顺行（命宫→父母→福德…），阴年生的男性、阳年生的女性逆行。这一套与子平定大运顺逆的思路同源，是目前教材与排盘软件的默认做法。",
  }),
  ziwei({
    kind: "school_theory", topic: "大限顺逆怎么定", debateKey: K_DA_XIAN, stance: "alternative",
    tags: ["水二局", "木三局", "金四局", "土五局", "火六局"],
    title: "另一说：一律顺行，不分阴阳男女",
    content:
      "有一路主张十二宫既然按固定次序排列，大限也应一律顺行，阴阳男女之分是从子平借来的、于紫微本身的结构无据。持此说者不多，但在某些传承里确实这么用，两法排出的运程走向完全相反，遇到时必须先问清对方用的是哪一套。",
  }),
  ziwei({
    kind: "knowledge_point", topic: "大限顺逆怎么定", debateKey: K_DA_XIAN, stance: "platform_line",
    tags: ["水二局", "木三局", "金四局", "土五局", "火六局"],
    title: "本报告主线：阳男阴女顺行，阴男阳女逆行",
    content:
      "本报告采用主流做法：按生年阴阳与性别定顺逆，每一宫的大限起讫年龄都排在盘面上，你可以直接对照复核。" +
      "取这一路的理由很实际——它是教材、软件与绝大多数实战案例的共同基准，你在别处看到的紫微资料多半也按这个来，口径一致才谈得上互相印证。" +
      "一律顺行那一说我们不采用，但在这里标明它的存在：如果你手上的资料运程走向与本报告相反，多半就是这个原因，而不是哪一方算错了。",
  }),
];

// ══════════════ 六爻 ══════════════

const K_YING_QI = "liuyao:应期:怎么取";
const YING_QI: ReportKnowledgeSeed[] = [
  liuyao({
    kind: "school_theory", topic: "应期怎么取", debateKey: K_YING_QI, stance: "consensus",
    tags: ["乾宫", "坎宫", "艮宫", "震宫", "巽宫", "离宫", "坤宫", "兑宫"],
    title: "共识：应期只能给区间，不能给确定日期",
    content:
      "六爻取应期靠的是爻的状态与时辰的对应关系，各派都承认这是一种推断而非计算：同一卦在不同人手里可能取出不同的应期，事情本身也会因人的作为而提前或延后。因此报应期一律给区间、给可核对的理由，不给「某月某日必成」这种话。",
  }),
  liuyao({
    kind: "school_theory", topic: "应期怎么取", debateKey: K_YING_QI, stance: "mainstream",
    tags: ["乾宫", "坎宫", "艮宫", "震宫", "巽宫", "离宫", "坤宫", "兑宫"],
    title: "主流：看用神的状态，逢值逢合、出空填实",
    content:
      "通行取法是从用神本身的状态入手：旬空者取出空之日月，月破者取出月或逢合之时，入墓者取冲开墓库之时，休囚者取得生扶之时，旺相而静者取逢冲之日，旺相而动者取逢合之日。一句话概括——缺什么补什么的那个时间点，就是应期。",
  }),
  liuyao({
    kind: "school_theory", topic: "应期怎么取", debateKey: K_YING_QI, stance: "alternative",
    tags: ["乾宫", "坎宫", "艮宫", "震宫", "巽宫", "离宫", "坤宫", "兑宫"],
    title: "另一说：按爻位远近定远近，初爻近、六爻远",
    content:
      "另一路从爻位取时间：用神在初爻二爻主近期，在三爻四爻主中期，在五爻六爻主远期；再配合卦宫五行所值的季节收窄范围。这一说胜在直观，但精度粗，多用于「大概多久」而非「具体哪个月」。",
  }),
  liuyao({
    kind: "knowledge_point", topic: "应期怎么取", debateKey: K_YING_QI, stance: "platform_line",
    tags: ["乾宫", "坎宫", "艮宫", "震宫", "巽宫", "离宫", "坤宫", "兑宫"],
    title: "本报告主线：按用神状态取应期，并写明是按哪一条推的",
    content:
      "本报告按主流取法：从用神的旺衰、空破、动静入手推应期，并在正文里写明这一卦是按哪一条推的（出空、填实、逢冲还是逢合），你可以顺着这条理由自己复核。" +
      "取这一路是因为它有明确的判断依据，能讲清「为什么是这个时间」，而不是给一个说不出道理的数字。" +
      "爻位远近一路作为参考：当用神状态推出的区间较宽时，我们会用爻位来收窄「偏近还是偏远」。无论哪一条，给的都是区间，不会给确定日期。",
  }),
];

// ══════════════ 梅花 ══════════════

const K_WAI_YING = "meihua:外应:分量有多大";
const WAI_YING: ReportKnowledgeSeed[] = [
  meihua({
    kind: "school_theory", topic: "外应占多大分量", debateKey: K_WAI_YING, stance: "consensus",
    tags: ["体乾", "体坤", "体震", "体巽", "体坎", "体离", "体艮", "体兑"],
    title: "共识：外应是梅花区别于其他术数的地方",
    content:
      "起卦当时身边的声音、景象、人事，梅花称之为外应，并主张把它纳入判断——这是梅花与八字、六爻最不同的一处，各派都认。分歧在于外应能占多大分量：是卦象为主外应为辅，还是外应可以推翻卦象。",
  }),
  meihua({
    kind: "school_theory", topic: "外应占多大分量", debateKey: K_WAI_YING, stance: "mainstream",
    tags: ["体乾", "体坤", "体震", "体巽", "体坎", "体离", "体艮", "体兑"],
    title: "主流：卦象为主，外应用来把话说具体",
    content:
      "通行做法是以体用生克定成败，外应只用来补充细节：卦断有成，外应见喜鹊、见红色，就说成得快、成得喜庆；卦断有阻，外应闻争吵、见破损，就说阻在人事口舌。外应让断辞更贴切，但不改变成败方向。",
  }),
  meihua({
    kind: "school_theory", topic: "外应占多大分量", debateKey: K_WAI_YING, stance: "alternative",
    tags: ["体乾", "体坤", "体震", "体巽", "体坎", "体离", "体艮", "体兑"],
    title: "另一说：外应可以压过卦象，心易相通者以感应为先",
    content:
      "另一路认为梅花本就是「心易」，起卦不过是个由头，真正起作用的是当下的感应；若外应极其鲜明而与卦象相反，应以外应为准。这一说在传承里确有，但门槛极高——它依赖断卦者的状态，别人无从复核，初学者照搬容易流于随意。",
  }),
  meihua({
    kind: "knowledge_point", topic: "外应占多大分量", debateKey: K_WAI_YING, stance: "platform_line",
    tags: ["体乾", "体坤", "体震", "体巽", "体坎", "体离", "体艮", "体兑"],
    title: "本报告主线：以体用生克定成败，外应留给你自己补",
    content:
      "本报告按主流取法：成败方向一律由体用生克与互变推出，结论就按这条线给。" +
      "外应我们不替你判断——起卦当时你身边发生了什么，只有你自己知道，平台无从得知，硬编一个外应反而是假的。" +
      "正确的用法是：拿本报告的卦象结论作骨架，再用你当时留意到的外应把细节填实。若外应与卦象方向明显相反，说明这一卦可以再起一次，而不是让你在两者之间硬选一个。",
  }),
];

// ══════════════ 奇门 ══════════════

const K_QM_YONG = "qimen:用神:怎么取";
const QM_YONG: ReportKnowledgeSeed[] = [
  qimen({
    kind: "school_theory", topic: "用神怎么取", debateKey: K_QM_YONG, stance: "consensus",
    tags: ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"],
    title: "共识：用神取错，满盘皆错",
    content:
      "奇门断事先取用神——用什么符号代表所问之事，再看它落在哪一宫。这一步错了，后面的门迫、入墓、格局全是白算。各派一致。分歧在于同一件事往往有好几个符号都能代表，该以哪个为准。",
  }),
  qimen({
    kind: "school_theory", topic: "用神怎么取", debateKey: K_QM_YONG, stance: "mainstream",
    tags: ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"],
    title: "主流：按事取门，求财取生门、问官取开门、问文书取景门",
    content:
      "通行取法以八门为主：求财置业取生门，求官求职见贵取开门，问文书消息取景门，问争斗讨债取伤门，问隐匿避事取杜门，问了结丧葬取死门，问惊扰官非取惊门，问安稳和合取休门。门主人事，最贴近日常所问之事。",
  }),
  qimen({
    kind: "school_theory", topic: "用神怎么取", debateKey: K_QM_YONG, stance: "alternative",
    tags: ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"],
    title: "另一说：以人取干，自己取日干、对方取时干",
    content:
      "另一路主张按人取天干：求测人取日干，所问之人或对方取时干，再看两干落宫的生克与远近。持此说者认为事在人为，看人比看事更根本；问合作、问感情、问官司这类两造分明的事，这一取法往往比取门更贴切。",
  }),
  qimen({
    kind: "knowledge_point", topic: "用神怎么取", debateKey: K_QM_YONG, stance: "platform_line",
    tags: ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"],
    title: "本报告主线：以八门取用，涉及两造时同时看日干时干",
    content:
      "本报告按主流取法：按所问之事取相应的门为用神，看它落在哪一宫、门与宫是否相生（门迫与否），结论据此给出。" +
      "取门为主是因为门直接对应人事，规则明确、容易复核，也是教材与案例最通用的口径。" +
      "所问之事涉及两造（合作、感情、诉讼）时，我们会同时把日干与时干的落宫列出来，作为取门之外的一条印证——两者指向一致时结论更稳，不一致时报告会明说这一处需要再斟酌。",
  }),
];

// ══════════════ 六壬 ══════════════

const K_LR_ZHU = "daliuren:四课三传:以谁为主";
const LR_ZHU: ReportKnowledgeSeed[] = [
  daliuren({
    kind: "school_theory", topic: "四课与三传以谁为主", debateKey: K_LR_ZHU, stance: "consensus",
    tags: [
      "元首", "重审", "比用", "涉害", "涉害·见机", "涉害·察微", "涉害·缀瑕",
      "遥克·蒿矢", "遥克·弹射", "昴星·虎视", "昴星·冬蛇掩目", "别责", "八专",
      "伏吟", "伏吟·自任", "伏吟·自信", "返吟", "返吟·井栏", "返吟有克",
    ],
    title: "共识：四课是根，三传是流，两者不可偏废",
    content:
      "四课由日干日支及其天盘神组成，是事情的根底；三传自四课取出，是事情的发展。各派都承认两者一体，只是在实际断课时，先看哪一头、以哪一头为准，做法不同。",
  }),
  daliuren({
    kind: "school_theory", topic: "四课与三传以谁为主", debateKey: K_LR_ZHU, stance: "mainstream",
    tags: [
      "元首", "重审", "比用", "涉害", "涉害·见机", "涉害·察微", "涉害·缀瑕",
      "遥克·蒿矢", "遥克·弹射", "昴星·虎视", "昴星·冬蛇掩目", "别责", "八专",
      "伏吟", "伏吟·自任", "伏吟·自信", "返吟", "返吟·井栏", "返吟有克",
    ],
    title: "主流：以三传为主线，四课作根据",
    content:
      "通行做法是把三传当作断事的主线：初传是事情的起因与当下，中传是经过与转折，末传是结局与归宿，顺着这条线把事情讲成一条完整的推演。四课则用来说明这件事的根底——谁是主、谁是客、双方关系如何。",
  }),
  daliuren({
    kind: "school_theory", topic: "四课与三传以谁为主", debateKey: K_LR_ZHU, stance: "alternative",
    tags: [
      "元首", "重审", "比用", "涉害", "涉害·见机", "涉害·察微", "涉害·缀瑕",
      "遥克·蒿矢", "遥克·弹射", "昴星·虎视", "昴星·冬蛇掩目", "别责", "八专",
      "伏吟", "伏吟·自任", "伏吟·自信", "返吟", "返吟·井栏", "返吟有克",
    ],
    title: "另一说：先看四课定人事，三传只管时间与转折",
    content:
      "另一路主张四课才是主：日干上神代表求测人当下的处境，日支上神代表对方或事体，两者的生克已经把事情的成败讲了大半；三传的作用是补充过程与时间。这一说在问人事、问关系的课上尤其明显，断法与三传为主的一路可能得出不同的着重点。",
  }),
  daliuren({
    kind: "knowledge_point", topic: "四课与三传以谁为主", debateKey: K_LR_ZHU, stance: "platform_line",
    tags: [
      "元首", "重审", "比用", "涉害", "涉害·见机", "涉害·察微", "涉害·缀瑕",
      "遥克·蒿矢", "遥克·弹射", "昴星·虎视", "昴星·冬蛇掩目", "别责", "八专",
      "伏吟", "伏吟·自任", "伏吟·自信", "返吟", "返吟·井栏", "返吟有克",
    ],
    title: "本报告主线：三传为主线，四课先讲清主客关系",
    content:
      "本报告按主流做法：先用四课把主客关系讲明白（谁是求测人、谁是对方、两者生克如何），再以三传为主线讲事情的起、中、结。" +
      "这样安排的理由是三传本就自四课取出，顺着它讲，推演链条最完整，读者也容易跟着走一遍。" +
      "问人事关系的课上，四课的分量会加重，报告会在正文里明确指出「这一课的关键在日干与日支的生克」——那正是另一说所强调的重点，我们把它并进主线，而不是另开一套。",
  }),
];

export const DEBATE_SEEDS_2: ReportKnowledgeSeed[] = [
  ...YONG_FA,
  ...SHEN_SHA_FEN,
  ...WU_ZHU_XING,
  ...DA_XIAN,
  ...YING_QI,
  ...WAI_YING,
  ...QM_YONG,
  ...LR_ZHU,
];

// ── 奇门应期判断计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 奇门遁甲应期：何时事成/化解

import type { QiMenYingXunInput, QiMenYingXunResult, MatterYingXun } from "@guoxue/shared";

const MATTER_DB: MatterYingXun[] = [
  { matter:"求财", yongShen:"戊(资本)/生门(利润)/甲子戊(本金)", rules:[
    { ruleType:"生门应期", method:"生门落宫地支为应期，生门旺相速则应，休囚迟则应。", example:"生门在离宫(午)，应期在午年/午月/午日。", accuracy:"高" },
    { ruleType:"戊土应期", method:"戊落宫地支为得财之时。戊+丙青龙返首，暴发之应。", example:"戊在震宫(卯)，卯年卯月得财。", accuracy:"高" },
    { ruleType:"时干生门", method:"时干落宫生开门落宫，求财易得。时干生日干，财来找我。", example:"时干在坎(水)生日干在震(木)，财利可期。", accuracy:"中" },
    { ruleType:"马星应期", method:"天马星所在之方为动应之期，马星动则财动。", example:"天马在巳，逢巳年月日得偏财。", accuracy:"中" },
  ], kouJue:"生门落宫查地支，旺相速应休囚迟。戊土得地财自至，马星动处是来时。" },
  { matter:"婚姻", yongShen:"乙(女方)/庚(男方)/六合(媒人)/休门(婚庆)", rules:[
    { ruleType:"乙庚合应", method:"乙庚落宫相生相合，地支三合六合之日为婚期。", example:"乙在卯庚在戌，卯戌合火，逢寅午戌年月日应。", accuracy:"高" },
    { ruleType:"休门应期", method:"休门落宫旺相之地支即为吉期。休门+丙奇为喜上加喜。", example:"休门在乾宫(戌亥)，秋冬之交婚期到。", accuracy:"高" },
    { ruleType:"六合应期", method:"六合落宫不空亡不逢冲，其地支为婚缘到来之时。", example:"六合在兑宫，逢申酉年月日媒妁来。", accuracy:"中" },
  ], kouJue:"乙庚合处是良辰，休门旺地吉期真。六合不空媒妁动，三合六合定终身。" },
  { matter:"出行", yongShen:"日干(出行者)/时干(目的地)/开门(道路)", rules:[
    { ruleType:"日时相生", method:"时干落宫生日干落宫，出行大利。地支应期看相生之年月日。", example:"时干在震生日干在离，春季出行大吉。", accuracy:"高" },
    { ruleType:"开门应期", method:"开门落宫不空亡不逢刑冲，其地支即为出行吉时。", example:"开门在艮宫，丑寅年月日出行大吉。", accuracy:"高" },
    { ruleType:"空亡避期", method:"日干或开门落空亡之宫，填实/冲实之时方可出行。", example:"空亡在申，待申年月日或寅年月日冲实时可出行。", accuracy:"高" },
  ], kouJue:"时生日干出行吉，开门旺地不迟疑。日时若空待填实，冲空之日是佳期。" },
  { matter:"失物", yongShen:"日干(失主)/时干(失物)/玄武(盗贼)/杜门(隐藏)", rules:[
    { ruleType:"时干落宫", method:"时干落内盘(1/8/3/4宫)失物在家，外盘失物在外。地支为找回之期。", example:"时干在坤宫(未申)，未申日可寻回。", accuracy:"高" },
    { ruleType:"玄武应期", method:"玄武落宫逢冲为贼人暴露之时，地支为破案之期。", example:"玄武在离被坎冲，子午日有线索。", accuracy:"中" },
    { ruleType:"空亡应期", method:"时干空亡则待填实，冲空亡之时失物出现。", example:"时干空在寅，寅日或申日冲实可见。", accuracy:"中" },
  ], kouJue:"时干内外判远近，逢冲之日物现身。玄武被冲贼人现，空亡填实是佳音。" },
  { matter:"官讼", yongShen:"开门(法官)/惊门(律师)/日干(原告)/时干(被告)", rules:[
    { ruleType:"开门应期", method:"开门生日干原告胜，生时干被告胜。开门落宫旺地逢合之日判决。", example:"开门在坎生日干在震，子卯日揭晓。", accuracy:"高" },
    { ruleType:"惊门应期", method:"惊门旺相则官司难解，入墓/受克之日可结案。", example:"惊门在坤入墓于丑，丑月结案。", accuracy:"中" },
    { ruleType:"庚金应期", method:"庚为阻碍，庚落宫被冲之日阻碍消除。", example:"庚在震被兑冲，卯酉日化解。", accuracy:"中" },
  ], kouJue:"开门生谁谁得胜，旺处相合是判期。惊门入墓讼方解，庚金被冲阻碍移。" },
  { matter:"疾病", yongShen:"天芮(病星)/乙奇(医药)/日干(患者)/死门(生死)", rules:[
    { ruleType:"天芮应期", method:"天芮落宫入墓/受克/空亡为病愈之期。旺相则病难愈。", example:"天芮在离旺于午，入墓于戌，戌月病转机。", accuracy:"高" },
    { ruleType:"乙奇应期", method:"乙奇落宫生天芮则药有效，乙奇旺地为服药最佳时日。", example:"乙奇在震旺于卯，卯日服药效果最佳。", accuracy:"高" },
    { ruleType:"日干应期", method:"日干旺相则康复力强，受生之日为转好之时。", example:"日干在坎受兑生，申酉日病情好转。", accuracy:"中" },
  ], kouJue:"天芮入墓病可愈，旺相缠绵入墓除。乙奇旺地药力显，日干得生康复初。" },
  { matter:"行人", yongShen:"日干(行人)/时干(目的地)/马星(动身)", rules:[
    { ruleType:"时干落宫", method:"时干生日干则归心急切，地支为归期。时干克日干暂不思归。", example:"时干生乾生日干震，卯戌日人归。", accuracy:"高" },
    { ruleType:"马星应期", method:"天马星动则身动，马星所在之地支即为启程之时。", example:"天马在亥，亥日亥月动身。", accuracy:"高" },
    { ruleType:"空亡应期", method:"时干空亡则人在途中未定，填实/冲空时为到达之时。", example:"空亡在巳，巳日或亥日冲实到达。", accuracy:"中" },
  ], kouJue:"时干生日人思归，地支即是归期推。马星动处身将动，空亡填实人自回。" },
  { matter:"谋事", yongShen:"开门(事业)/值符(上级)/日干(自己)/时干(所谋之事)", rules:[
    { ruleType:"开门应期", method:"开门生日干，上级赏识，开门落宫旺地为成事之期。", example:"开门在兑生日干在坎，申酉日事成。", accuracy:"高" },
    { ruleType:"值符应期", method:"值符生日干则贵人相助，值符旺地为得到帮助之时。", example:"值符在离生日干在坤，午月得贵人助。", accuracy:"高" },
    { ruleType:"时干应期", method:"时干生日干所谋易成，地支为可行动之时。", example:"时干在巽生日干在离，辰巳日可行。", accuracy:"中" },
  ], kouJue:"开门生我上司助，值符生我贵人扶。时干生日谋可动，旺相不空是良图。" },
  { matter:"考试", yongShen:"丁奇(文章)/景门(试卷)/值符(主考)/日干(考生)", rules:[
    { ruleType:"丁奇应期", method:"丁奇落宫旺相不空亡，地支即为考试吉日或放榜之期。", example:"丁奇在离宫，午月考试大利，午日放榜。", accuracy:"高" },
    { ruleType:"景门应期", method:"景门落宫旺相生日干，文章得赏识，地支为得名之时。", example:"景门在震生日干在离，卯日揭晓佳音。", accuracy:"高" },
    { ruleType:"值符应期", method:"值符生丁奇则主考官赏识，地支为面试/复试通过之时。", example:"值符在坎生丁奇在巽，子辰日有好消息。", accuracy:"中" },
  ], kouJue:"丁奇旺地文章利，景门生我试名扬。值符生丁考官助，旺相不空是吉方。" },
  { matter:"交易", yongShen:"戊(资本)/生门(利润)/六合(契约)/日干(自己)", rules:[
    { ruleType:"生门应期", method:"生门落宫旺相不空，地支为成交吉日。生门+丙奇则暴利可期。", example:"生门在艮宫，丑寅月日签约成交大利。", accuracy:"高" },
    { ruleType:"六合应期", method:"六合落宫不逢冲不空亡，地支为合同签订之时。", example:"六合在兑宫，申酉日签约为佳。", accuracy:"高" },
    { ruleType:"戊土应期", method:"戊落宫旺相生日干，本金安全且获利，地支为交割之日。", example:"戊在坤生日干在兑，未申日交割顺利。", accuracy:"中" },
  ], kouJue:"生门旺处是良机，六合不空契约宜。戊土生我本金稳，旺相不冲交易时。" },
  { matter:"怀孕", yongShen:"坤宫(母)/天芮(胎孕)/乙奇(胎儿)/日干(母体)", rules:[
    { ruleType:"天芮应期", method:"天芮落宫旺相不空，地支为受孕或预产之期。天芮+乙奇为顺产。", example:"天芮在坤宫旺于未申，未申月受孕顺利。", accuracy:"高" },
    { ruleType:"坤宫应期", method:"坤宫旺相受生，母子平安，地支为安胎吉期。坤宫逢冲宜注意。", example:"坤宫在离受生，午月安胎大吉。", accuracy:"高" },
    { ruleType:"乙奇应期", method:"乙奇落宫不空亡不逢庚冲，胎儿安稳，地支为产期。", example:"乙奇在震旺于卯，卯月分娩顺利。", accuracy:"中" },
  ], kouJue:"天芮旺相胎元固，坤宫受生母安和。乙奇不空胎儿稳，逢冲之日宜多护。" },
  { matter:"官禄", yongShen:"开门(官位)/值符(上司)/丁奇(文书)/日干(求官者)", rules:[
    { ruleType:"开门应期", method:"开门生日干，官运亨通，开门旺相之地支为升迁之期。", example:"开门在乾生日干在艮，戌亥月升迁有望。", accuracy:"高" },
    { ruleType:"丁奇应期", method:"丁奇为调令文书，丁奇落宫旺地生日干，地支为到任之时。", example:"丁奇在离生日干在巽，午日调令到。", accuracy:"高" },
    { ruleType:"值符应期", method:"值符代表最高领导，生日干则得提拔，地支为任命之日。", example:"值符在兑生日干在坎，申酉日有任命。", accuracy:"中" },
  ], kouJue:"开门生我官运通，丁奇旺地调令逢。值符生干提拔近，旺相不空禄位隆。" },
];

export function calculateQiMenYingXun(input: Record<string, unknown>): QiMenYingXunResult {
  const { matterType } = input as unknown as QiMenYingXunInput;
  const matter = matterType ? (MATTER_DB.find(m => m.matter === matterType) || null) : null;
  const analysis = matter
    ? `${matter.matter}应期：用神${matter.yongShen}。${matter.rules.map(r => r.method).join("；")}口诀：${matter.kouJue}`
    : `奇门应期涵盖求财/婚姻/出行/失物/官讼/疾病/行人/谋事/考试/交易/怀孕/官禄12大类，每类3-4条应期规则。`;
  return { matter, allMatters: MATTER_DB, analysis };
}

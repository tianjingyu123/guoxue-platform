// 算法参考：《卜筮正宗》《增删卜易》《火珠林》
import type { LiuYaoShenDongResult, ShenDongItem } from "@guoxue/shared"

const ITEMS: ShenDongItem[] = [
  // ═══════════ 进神 (12条) ═══════════
  { name: "父母化进", type: "进神", yaoWei: "父母爻", dongBian: "巳→午", guiZe: "父母爻动化进神，文书/考试/房屋之事日趋顺利", jiXiong: "吉", duanYu: "文书得进，考试升级，房屋增值", detailed: "父母为文书/房屋/长辈，进神巳化午火更旺，主文昌之事步步高升。若占科考必中，占房产必增值，占父母病则加重需关注。", source: "《黄金策·进神章》", guaExample: "天风姤之天山遁" },
  { name: "官鬼化进", type: "进神", yaoWei: "官鬼爻", dongBian: "寅→卯", guiZe: "官鬼化进神，事业/官非/疾病趋于加重", jiXiong: "凶", duanYu: "官运虽进但压力倍增，疾病加重，官非升级", detailed: "官鬼为官运/疾病/官非/丈夫，进神寅化卯木更旺。占功名则升迁可待，占疾病则病情加重，占官非则事态扩大。", source: "《黄金策·进神章》", guaExample: "水火既济之风火家人" },
  { name: "妻财化进", type: "进神", yaoWei: "妻财爻", dongBian: "申→酉", guiZe: "妻财化进神，财运日增，物价上涨", jiXiong: "吉", duanYu: "财运亨通步步高升，投资增值，物价看涨", detailed: "妻财为钱财/妻子/物价，进神申化酉金更旺。占求财必得且陆续增加，占婚姻可得贤妻，占物价则上涨趋势。", source: "《黄金策·进神章》", guaExample: "雷天大壮之泽天夬" },
  { name: "兄弟化进", type: "进神", yaoWei: "兄弟爻", dongBian: "午→未", guiZe: "兄弟化进神，竞争加剧，花费增多", jiXiong: "凶", duanYu: "竞争激烈，破财难免，合作伙伴夺利", detailed: "兄弟为竞争/破财/同伴，进神午化未土更旺。占求财则竞争者势大难胜，占合伙则同伴分利，占物价则下跌。", source: "《黄金策·进神章》", guaExample: "水地比之泽地萃" },
  { name: "子孙化进", type: "进神", yaoWei: "子孙爻", dongBian: "子→丑", guiZe: "子孙化进神，福泽日增，灾祸渐消", jiXiong: "吉", duanYu: "福气渐增，病愈可期，事业顺遂", detailed: "子孙为福气/健康/医药/晚辈，进神子化丑土更旺。占疾病则药到病除，占求财则先难后易财源滚滚，占子息则子孙兴旺。", source: "《黄金策·进神章》", guaExample: "山风蛊之地风升" },
  { name: "世爻化进", type: "进神", yaoWei: "世爻", dongBian: "辰→巳", guiZe: "世爻化进神，自身运势上升，所求渐成", jiXiong: "吉", duanYu: "自身运势上升，所求之事渐入佳境", detailed: "世爻为自身，进神主个人状态提升。占出行则一路顺风，占谋事则逐渐顺利，占健康则逐渐康复。", source: "《增删卜易·进神章》", guaExample: "泽雷随之天雷无妄" },
  { name: "应爻化进", type: "进神", yaoWei: "应爻", dongBian: "戌→亥", guiZe: "应爻化进神，对方/他事趋势向好", jiXiong: "吉", duanYu: "对方状态提升，所求回应渐好", detailed: "应爻为对方/所问之事，进神主他方局势向上。占婚姻则对方满意，占诉讼则对手势强需防，占合作则对方有利。", source: "《增删卜易·进神章》", guaExample: "火山旅之火地晋" },
  { name: "初爻化进", type: "进神", yaoWei: "初爻", dongBian: "寅→卯", guiZe: "初爻化进神，基础稳固，事情开端良好", jiXiong: "吉", duanYu: "基础稳固，谋事开端顺利", detailed: "初爻为事情开头/基础，进神主从基层起步。占事业则根基渐牢，占家宅则地基稳固，占出行则出发顺利。", source: "《卜筮正宗·进神篇》", guaExample: "天火同人之天山遁" },
  { name: "五爻化进", type: "进神", yaoWei: "五爻", dongBian: "申→酉", guiZe: "五爻（君位）化进神，权威地位提升", jiXiong: "大吉", duanYu: "地位提升，权威日盛，事业登峰", detailed: "五爻为君位/尊位/最高领导，进神主地位大幅度提升。占事业则有突破性进展，占官运则升至高位。", source: "《卜筮正宗·进神篇》", guaExample: "雷泽归妹之雷天大壮" },
  { name: "二爻化进", type: "进神", yaoWei: "二爻", dongBian: "午→未", guiZe: "二爻（宅位）化进神，家运渐旺", jiXiong: "吉", duanYu: "家运渐旺，住宅改善，家庭和睦", detailed: "二爻为家宅/家庭，进神主家庭运势上升。占家宅则居所越来越好，占婚姻则感情日深。", source: "《卜筮正宗·进神篇》", guaExample: "地风升之水风井" },
  { name: "四爻化进", type: "进神", yaoWei: "四爻", dongBian: "亥→子", guiZe: "四爻（大臣位）化进神，职场晋升", jiXiong: "吉", duanYu: "职场晋升，位置提高，权力增大", detailed: "四爻为中层/大臣位，进神主职场晋升。占升职则指日可待，占调动则去更好位置。", source: "《卜筮正宗·进神篇》", guaExample: "泽风大过之泽水困" },
  { name: "上九化进", type: "进神", yaoWei: "上爻", dongBian: "巳→午", guiZe: "上爻化进神，终局向好但物极必反", jiXiong: "平", duanYu: "最终结果向好但需防盛极而衰", detailed: "上爻为终局/极点，进神到极点易物极必反。占事则最终结果好但需及时收手，不宜贪多。", source: "《增删卜易·进神章》", guaExample: "风火家人之水火既济" },
  // ═══════════ 退神 (12条) ═══════════
  { name: "父母化退", type: "退神", yaoWei: "父母爻", dongBian: "午→巳", guiZe: "父母爻动化退神，文书失效，考试退步，房产贬值", jiXiong: "凶", duanYu: "文书失效合同作废，考试失利，房产贬值", detailed: "父母爻化退主文书/学历/房产类事物走下坡路。占功名则落榜，占合同则作废，占房产则贬值，占父母则病退需防危。", source: "《黄金策·退神章》", guaExample: "天地否之天雷无妄" },
  { name: "官鬼化退", type: "退神", yaoWei: "官鬼爻", dongBian: "卯→寅", guiZe: "官鬼化退神，官职退步，疾病好转，官非消解", jiXiong: "吉", duanYu: "疾病好转官非消解，但官职有退步之忧", detailed: "官鬼化退有两面：占疾病则病退为吉，占官非则事态缓解，但占功名则为降职或退休之象。", source: "《黄金策·退神章》", guaExample: "泽雷随之水雷屯" },
  { name: "妻财化退", type: "退神", yaoWei: "妻财爻", dongBian: "酉→申", guiZe: "妻财化退神，财运退步，物价下跌，收入减少", jiXiong: "凶", duanYu: "财运退步收入减少，物价看跌，投资亏损", detailed: "妻财化退主财运走下坡路。占求财则收入渐少，占物价则看跌，占婚姻则妻子有福但持家需省。", source: "《黄金策·退神章》", guaExample: "山泽损之地泽临" },
  { name: "兄弟化退", type: "退神", yaoWei: "兄弟爻", dongBian: "未→午", guiZe: "兄弟化退神，竞争减弱，花费减少", jiXiong: "吉", duanYu: "竞争减弱，花费减少，破财风险降低", detailed: "兄弟化退为吉，主竞争减弱，合作伙伴退让。占求财则对手退却，占物价则止跌回升。", source: "《黄金策·退神章》", guaExample: "天山遁之天风姤" },
  { name: "子孙化退", type: "退神", yaoWei: "子孙爻", dongBian: "丑→子", guiZe: "子孙化退神，福泽减退，病情反复", jiXiong: "凶", duanYu: "福泽减退，病情可能反复，药效减弱", detailed: "子孙为福星化退主福气渐消。占求财则财源渐枯，占疾病则药效减退病情可能反复，占子息则晚辈发展受阻。", source: "《黄金策·退神章》", guaExample: "风地观之山地剥" },
  { name: "世爻化退", type: "退神", yaoWei: "世爻", dongBian: "卯→寅", guiZe: "世爻化退神，自身运势走下坡路", jiXiong: "凶", duanYu: "自身状态下滑，所求渐难，退步趋势", detailed: "世爻化退主个人运势走下坡。占事业则位置动摇，占健康则体力衰退，占出行则不利远行。", source: "《增删卜易·退神章》", guaExample: "风天小畜之巽为风" },
  { name: "应爻化退", type: "退神", yaoWei: "应爻", dongBian: "子→亥", guiZe: "应爻化退神，对方/他事趋势向下", jiXiong: "凶", duanYu: "对方状态下滑，所得回应不如前", detailed: "应爻化退主对方退步。占婚姻则对方热情减退，占合作则对方支持减弱，占诉讼则对手势弱对我有利。", source: "《增删卜易·退神章》", guaExample: "泽水困之泽地萃" },
  { name: "初爻化退", type: "退神", yaoWei: "初爻", dongBian: "子→亥", guiZe: "初爻化退神，事物根基动摇", jiXiong: "凶", duanYu: "基础不稳，开头不顺，根基动摇", detailed: "初爻化退主基础层下滑。占事业则根基不稳，占家宅则地基问题，占健康则元气亏损需补养。", source: "《卜筮正宗·退神篇》", guaExample: "火地晋之火雷噬嗑" },
  { name: "五爻化退", type: "退神", yaoWei: "五爻", dongBian: "巳→辰", guiZe: "五爻化退神，权位松动风险", jiXiong: "大凶", duanYu: "权位松动，高位不胜寒，退位风险", detailed: "五爻为君位化退主最高层出问题。占官运则有降职/退休之危，占公司则一把手易位，占国事则政权不稳。", source: "《卜筮正宗·退神篇》", guaExample: "泽天夬之水天需" },
  { name: "三爻化退", type: "退神", yaoWei: "三爻", dongBian: "辰→卯", guiZe: "三爻化退神，中层管理动荡", jiXiong: "凶", duanYu: "中层不稳，团队动荡，执行层面问题", detailed: "三爻为中层/执行层化退主管理出问题。占公司则执行层面混乱，占项目则执行不力进度推迟。", source: "《卜筮正宗·退神篇》", guaExample: "水火既济之水天需" },
  { name: "六爻化退", type: "退神", yaoWei: "上爻", dongBian: "戌→未", guiZe: "上爻化退神，终局衰退", jiXiong: "凶", duanYu: "终局不佳，结局退步，收尾不利", detailed: "上爻化退主事务终局不利。占长期事则结局不如预期，占退休生活则需降低期望。", source: "《增删卜易·退神章》", guaExample: "天风姤之风地观" },
  { name: "四爻化退", type: "退神", yaoWei: "四爻", dongBian: "午→巳", guiZe: "四爻化退神，辅助位动摇", jiXiong: "平", duanYu: "辅佐不力，助手离去，幕僚动荡", detailed: "四爻为辅助位化退主团队支持减弱。占事业则助手离职或不能胜任，占学习则成绩退步。", source: "《卜筮正宗·退神篇》", guaExample: "雷风恒之雷火丰" },
  // ═══════════ 暗动 (8条) ═══════════
  { name: "日冲暗动·世爻", type: "暗动", yaoWei: "世爻", dongBian: "被日辰冲而暗动", guiZe: "世爻被日辰冲（旺相）为暗动，自身暗中行动", jiXiong: "平", duanYu: "自身暗中行动，不宜公开之事", detailed: "世爻旺相被日辰冲为暗动，非明动而为暗中运作。占求财则暗中得利，占出行则秘密出行，占婚姻则暗中交往。", source: "《黄金策·暗动章》", guaExample: "火风鼎之雷风恒" },
  { name: "日冲暗动·官鬼", type: "暗动", yaoWei: "官鬼爻", dongBian: "被日辰冲而暗动", guiZe: "官鬼旺相被日冲为暗动，暗中官非或秘密任务", jiXiong: "凶", duanYu: "暗中祸患，秘密官非，偷袭之忧", detailed: "官鬼暗动为祸根暗伏。占平安则暗中有灾需防范，占事业则上级暗中关注，占疾病则暗疾潜伏。", source: "《黄金策·暗动章》", guaExample: "雷地豫之雷水解" },
  { name: "日冲暗动·妻财", type: "暗动", yaoWei: "妻财爻", dongBian: "被日辰冲而暗动", guiZe: "妻财旺相被日冲为暗动，暗中得财", jiXiong: "吉", duanYu: "暗中得财，意外收入，暗财入袋", detailed: "妻财暗动为偏财暗入。占求财则有意外之财或暗箱收入，占婚姻则暗中交往有进展。", source: "《黄金策·暗动章》", guaExample: "水泽节之水雷屯" },
  { name: "日冲暗动·兄弟", type: "暗动", yaoWei: "兄弟爻", dongBian: "被日辰冲而暗动", guiZe: "兄弟旺相被日冲为暗动，暗中竞争", jiXiong: "凶", duanYu: "暗中竞争，背后角力，暗箭难防", detailed: "兄弟暗动为暗中有竞争对手。占求财则暗中被人截财，占事业则背后有人使绊。", source: "《黄金策·暗动章》", guaExample: "天泽履之天雷无妄" },
  { name: "日冲暗动·子孙", type: "暗动", yaoWei: "子孙爻", dongBian: "被日辰冲而暗动", guiZe: "子孙旺相被日冲为暗动，暗中得福", jiXiong: "吉", duanYu: "暗中得福，福气暗临，灾祸化解于无形", detailed: "子孙暗动为暗中得福之象。占疾病则暗中好转，占求财则暗中财源渐开，占安危则灾自消于无形。", source: "《黄金策·暗动章》", guaExample: "山雷颐之山火贲" },
  { name: "日冲暗动·父母", type: "暗动", yaoWei: "父母爻", dongBian: "被日辰冲而暗动", guiZe: "父母旺相被日冲为暗动，文案暗中变动", jiXiong: "平", duanYu: "文书暗中变动，合同悄然更改", detailed: "父母暗动主文件/合同暗中改动。占工作则暗中调令，占房产则暗中交易，占考试则暗中有变数。", source: "《增删卜易·暗动章》", guaExample: "山地剥之山水蒙" },
  { name: "休囚日冲·日破", type: "暗动", yaoWei: "休囚爻", dongBian: "休囚被日冲为日破", guiZe: "休囚之气被日辰冲，为暗动之反面——日破", jiXiong: "大凶", duanYu: "休囚被冲为破，动而无功反遭损失", detailed: "暗动需旺相，休囚被日冲则为日破（非暗动）。主此人/此事虚弱不堪一击即溃。", source: "《黄金策·暗动章》", guaExample: "天地否之天水讼" },
  { name: "日冲应爻·暗动", type: "暗动", yaoWei: "应爻", dongBian: "被日辰冲而暗动", guiZe: "应爻旺相被日冲为暗动，对方暗中行动", jiXiong: "平", duanYu: "对方暗中行动，所问之事暗中进展", detailed: "应爻暗动主他方暗中运作。占合作则对方暗中有动作，占感情则对方心有所动，占诉讼则对手暗中有动作。", source: "《增删卜易·暗动章》", guaExample: "泽风大过之泽山咸" },
  // ═══════════ 月破 (8条) ═══════════
  { name: "月建冲破·世爻", type: "月破", yaoWei: "世爻", dongBian: "被月建所冲为月破", guiZe: "世爻被月建冲为月破，自身失时无力", jiXiong: "大凶", duanYu: "自身无力，时机不对，所求难成", detailed: "月破为当月最弱之爻，世爻月破主自身本月运衰。百事不宜动，宜静待下月。出月不破方可行动。", source: "《黄金策·月破章》", guaExample: "兑为泽之水泽节" },
  { name: "月建冲破·官鬼", type: "月破", yaoWei: "官鬼爻", dongBian: "被月建所冲为月破", guiZe: "官鬼月破，官运/疾病/官非本月不成气候", jiXiong: "吉", duanYu: "官非无力疾病不重，但求官也不成", detailed: "官鬼月破有两面：占疾病则病轻不足虑，占官非则事小易解，但占功名求官则本月无望。出月有望。", source: "《黄金策·月破章》", guaExample: "震为风之火风鼎" },
  { name: "月建冲破·妻财", type: "月破", yaoWei: "妻财爻", dongBian: "被月建所冲为月破", guiZe: "妻财月破，财运极差收入断绝", jiXiong: "大凶", duanYu: "财运极差，本月入不敷出，求财无望", detailed: "妻财月破为本月财运最低谷。不宜投资求职，不宜谈薪资。出月财气恢复方可行事。", source: "《黄金策·月破章》", guaExample: "雷水解之雷风恒" },
  { name: "月建冲破·子孙", type: "月破", yaoWei: "子孙爻", dongBian: "被月建所冲为月破", guiZe: "子孙月破，福泽受损药效不佳", jiXiong: "凶", duanYu: "福气受损，药效不佳，投资不旺", detailed: "子孙月破主福星被制。占求财则财源枯竭，占疾病则药效不佳需换医换药，占子息则子女运薄。", source: "《黄金策·月破章》", guaExample: "风天小畜之风火家人" },
  { name: "月建冲破·兄弟", type: "月破", yaoWei: "兄弟爻", dongBian: "被月建所冲为月破", guiZe: "兄弟月破，竞争减弱花费减少", jiXiong: "吉", duanYu: "竞争对手无力，破财风险降低，物价回升", detailed: "兄弟月破为喜，竞争者本月无能。占求财则对手式微我可进取，占物价则止跌回升。", source: "《黄金策·月破章》", guaExample: "天火同人之天山遁" },
  { name: "月建冲破·父母", type: "月破", yaoWei: "父母爻", dongBian: "被月建所冲为月破", guiZe: "父母月破，文书不成合同作废", jiXiong: "凶", duanYu: "文书作废合同无效，考试不利，房产问题", detailed: "父母月破主文书之事本月难成。占签约则合同无效或延期，占考试则难上榜，占房产则交易不成。", source: "《增删卜易·月破章》", guaExample: "火雷噬嗑之火地晋" },
  { name: "月破出月论", type: "月破", yaoWei: "任意爻", dongBian: "过月建则不破", guiZe: "月破之爻出月不破，填实之日有力", jiXiong: "平", duanYu: "本月虽破，出月填实之日重新有力", detailed: "月破并非永久之破，出月则自动恢复。若值日填实则当日即不破。此为月破最关键的补救法则。", source: "《黄金策·月破章》", guaExample: "—" },
  { name: "月破逢生不起", type: "月破", yaoWei: "任意爻", dongBian: "月破之爻虽生不起", guiZe: "月破之爻即使得动爻生扶，本月也难有作为", jiXiong: "凶", duanYu: "月破无力，纵有人帮也难成事", detailed: "月破最忌之处：即使动爻来生也是白生，本月无力作为。必须出月才能借生扶之力。", source: "《增删卜易·月破章》", guaExample: "—" },
  // ═══════════ 六亲发动 (33条) ═══════════
  { name: "父母发动·文书事", type: "六亲发动", yaoWei: "父母爻", dongBian: "动而克子孙", guiZe: "父母动主文书/房屋/长辈/学业/契约/车船", jiXiong: "平", duanYu: "文书变动，考试/签约/房产/长辈之事来临", detailed: "父母爻为一切文事之主。占事业则工作变动调令，占学业则成绩有变，占家宅则房屋有变动。", source: "《黄金策·六亲发动章》", guaExample: "天水讼之天地否" },
  { name: "父母发动·占功名", type: "六亲发动", yaoWei: "父母爻", dongBian: "动来生世", guiZe: "父母动来生世爻，文书/功名大利", jiXiong: "吉", duanYu: "文书得利，考试高中，签约成功", detailed: "父母动来生世爻为最佳文书格局。占考试必中，占签约必成，占房产交易顺利。此类格局百占百验。", source: "《增删卜易·六亲章》", guaExample: "地天泰之地风升" },
  { name: "官鬼发动·占功名", type: "六亲发动", yaoWei: "官鬼爻", dongBian: "动来生世", guiZe: "官鬼动来生世爻，功名成就掌权柄", jiXiong: "吉", duanYu: "官运亨通，升迁在即，权力到手", detailed: "官鬼动来生世主贵人提携/官运来临。占求官必得，占升职必成，占事业有突破性进展。", source: "《黄金策·六亲发动章》", guaExample: "水地比之泽地萃" },
  { name: "官鬼发动·占疾病", type: "六亲发动", yaoWei: "官鬼爻", dongBian: "动而克世", guiZe: "官鬼动来克世爻，疾病/官非/灾祸", jiXiong: "大凶", duanYu: "疾病难愈，官非缠身，灾祸临头", detailed: "官鬼动克世爻为六爻第一大凶。占疾病则病重难愈需急救，占平安则有意外之灾，占出行则旅途凶险。", source: "《黄金策·六亲发动章》", guaExample: "雷泽归妹之雷地豫" },
  { name: "官鬼发动·占婚姻", type: "六亲发动", yaoWei: "官鬼爻", dongBian: "女占官鬼为夫星", guiZe: "女占官鬼动，夫星发动主婚姻变动", jiXiong: "平", duanYu: "婚姻有变，夫星动主丈夫事或新恋情", detailed: "女测婚姻官鬼为夫星。动而旺相则夫运吉，动而衰弱或化克则婚姻不利。已婚防夫有外遇，未婚防感情波折。", source: "《黄金策·六亲发动章》", guaExample: "风火家人之天火同人" },
  { name: "妻财发动·占求财", type: "六亲发动", yaoWei: "妻财爻", dongBian: "动来生世", guiZe: "妻财动来生世爻，财运亨通", jiXiong: "大吉", duanYu: "财运亨通，求财必得，意外之喜", detailed: "妻财动来生世为最佳财运格局。占求财必得且丰厚，占投资必获利，占薪资必涨。此格财来就我，不求自得。", source: "《黄金策·六亲发动章》", guaExample: "地火明夷之地天泰" },
  { name: "妻财发动·占婚姻", type: "六亲发动", yaoWei: "妻财爻", dongBian: "男占妻财为妻星", guiZe: "男占妻财动，妻星发动主婚姻变动", jiXiong: "吉", duanYu: "妻财动来生世，婚姻美满妻贤惠", detailed: "男测婚姻妻财为妻星。动来生世则娶得贤妻婚姻美满。但若动化回头克则防婚变。", source: "《增删卜易·六亲章》", guaExample: "山天大畜之火天大有" },
  { name: "妻财发动·克父母", type: "六亲发动", yaoWei: "妻财爻", dongBian: "动而克父母爻", guiZe: "妻财动克父母，为财损文书长辈", jiXiong: "凶", duanYu: "为财损文书/合同，或因财伤长辈", detailed: "妻财为父母之仇神。财动克父母主：为赚钱忽视文件/合同，或长辈健康出问题。占考试不利，签约有阻。", source: "《黄金策·六亲发动章》", guaExample: "天风姤之天地否" },
  { name: "子孙发动·占求财", type: "六亲发动", yaoWei: "子孙爻", dongBian: "动来生财", guiZe: "子孙动生妻财，财源滚滚", jiXiong: "大吉", duanYu: "财源广进，投资得利，生意兴隆", detailed: "子孙为财源（妻财之原神），动来生财主财源不断。占生意则兴隆，占投资则不断获利，占求职则找到好工作。", source: "《黄金策·六亲发动章》", guaExample: "兑为泽之泽地萃" },
  { name: "子孙发动·占疾病", type: "六亲发动", yaoWei: "子孙爻", dongBian: "动来克官鬼", guiZe: "子孙动克官鬼，病愈药效好", jiXiong: "大吉", duanYu: "药到病除，病情好转，医药有效", detailed: "子孙为医药/福德星，动克官鬼（病星）主病愈。占疾病最喜子孙发动，药到病除。", source: "《黄金策·六亲发动章》", guaExample: "水火既济之雷火丰" },
  { name: "子孙发动·占官运", type: "六亲发动", yaoWei: "子孙爻", dongBian: "动来克官鬼", guiZe: "子孙动克官鬼，不利功名官职", jiXiong: "凶", duanYu: "官职受制，升迁受阻，小人挡道", detailed: "子孙为官鬼之仇神。占功名最忌子孙发动，主小人挡道/劝退/削职。但若已退休则无忧。", source: "《黄金策·六亲发动章》", guaExample: "雷天大壮之风天小畜" },
  { name: "兄弟发动·占求财", type: "六亲发动", yaoWei: "兄弟爻", dongBian: "动来克妻财", guiZe: "兄弟动克妻财，破财竞争失利", jiXiong: "大凶", duanYu: "破财亏本，竞争激烈，收入锐减", detailed: "兄弟为财之仇神。占求财最忌兄弟发动，主竞争激烈/破财/亏本。物价看跌，生意亏损。", source: "《黄金策·六亲发动章》", guaExample: "火雷噬嗑之离为火" },
  { name: "兄弟发动·占物价", type: "六亲发动", yaoWei: "兄弟爻", dongBian: "兄弟旺动", guiZe: "兄弟动主物价下跌行情走低", jiXiong: "平", duanYu: "物价下跌，行情走低，买方市场", detailed: "兄弟动在商情占中有特殊意义——物价看跌。买方可等更低价格，卖方则需尽快出手。", source: "《增删卜易·六亲章》", guaExample: "水天需之天地否" },
  // ═══════════ 六神发动 (48条) ═══════════
  { name: "青龙发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "青龙临官鬼动", guiZe: "青龙临官鬼发动，喜庆中藏祸（酒色之疾）", jiXiong: "平", duanYu: "酒色之疾，喜中带忧，宴乐过度伤身", detailed: "青龙主喜庆但临官鬼（病星）动，主因酒色宴乐过度致病。占病则肝病/酒色过度，需节制。", source: "《黄金策·六神章》", guaExample: "雷火丰之泽火革" },
  { name: "青龙发动·临妻财", type: "六神发动", yaoWei: "妻财爻", dongBian: "青龙临财动", guiZe: "青龙临妻财发动，正财喜事临门", jiXiong: "大吉", duanYu: "正财临门，婚嫁之喜，喜庆得财", detailed: "青龙+妻财为最佳正财格局。占求财则正道之财丰厚，占婚姻则喜结良缘，占家宅则喜庆临门。", source: "《黄金策·六神章》", guaExample: "天雷无妄之泽雷随" },
  { name: "青龙发动·临子孙", type: "六神发动", yaoWei: "子孙爻", dongBian: "青龙临子孙动", guiZe: "青龙临子孙发动，喜得贵子添丁进口", jiXiong: "大吉", duanYu: "喜得贵子，添丁进口，家业兴旺", detailed: "青龙+子孙为生子添丁之喜。占怀孕必生贵子，占家运则子孙兴旺。企业占则人才济济。", source: "《卜筮正宗·六神篇》", guaExample: "风地观之水地比" },
  { name: "朱雀发动·临父母", type: "六神发动", yaoWei: "父母爻", dongBian: "朱雀临父母动", guiZe: "朱雀临父母发动，文书消息口舌", jiXiong: "平", duanYu: "文书消息或口舌是非，看所处宫位", detailed: "朱雀主文书/口舌/消息。临父母动：得位则好消息/文书利，失位则口舌是非/文书纠纷。", source: "《黄金策·六神章》", guaExample: "风火家人之水火既济" },
  { name: "朱雀发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "朱雀临官鬼动", guiZe: "朱雀临官鬼发动，官非口舌激化", jiXiong: "大凶", duanYu: "官非口舌升级，诉讼激化，言语惹祸", detailed: "朱雀（口舌）+官鬼（官非）为口舌升级为法律纠纷。需谨言慎行，防因言语引起的官司。", source: "《黄金策·六神章》", guaExample: "离为火之火雷噬嗑" },
  { name: "朱雀发动·临兄弟", type: "六神发动", yaoWei: "兄弟爻", dongBian: "朱雀临兄弟动", guiZe: "朱雀临兄弟发动，口舌因竞争而起", jiXiong: "凶", duanYu: "因竞争引发口舌纷争，同行相争", detailed: "朱雀+兄弟主因竞争/同事/同行引起的口舌是非。商场如战场，需防同行恶意中伤。", source: "《卜筮正宗·六神篇》", guaExample: "天山遁之泽山咸" },
  { name: "勾陈发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "勾陈临官鬼动", guiZe: "勾陈临官鬼发动，旧疾复发拖延难愈", jiXiong: "凶", duanYu: "旧疾复发，慢性病拖延，长期纠纷", detailed: "勾陈主陈旧/拖延/土地。临官鬼动主慢性病/陈年旧案/土地纠纷。", source: "《黄金策·六神章》", guaExample: "地泽临之风泽中孚" },
  { name: "勾陈发动·临兄弟", type: "六神发动", yaoWei: "兄弟爻", dongBian: "勾陈临兄弟动", guiZe: "勾陈临兄弟发动，老对手死灰复燃", jiXiong: "凶", duanYu: "老对手重来，旧竞争关系重现", detailed: "勾陈+兄弟主旧日竞争对手卷土重来。商场旧敌重现，职场上旧人回来争位。", source: "《卜筮正宗·六神篇》", guaExample: "山风蛊之山火贲" },
  { name: "勾陈发动·临子孙", type: "六神发动", yaoWei: "子孙爻", dongBian: "勾陈临子孙动", guiZe: "勾陈临子孙发动，旧药有效但需长期", jiXiong: "吉", duanYu: "旧方有效，但需长期调理，非一日之功", detailed: "勾陈+子孙主需长期服药/调理。占疾病则旧方有效但疗程长，占事业则稳步增长不应急进。", source: "《卜筮正宗·六神篇》", guaExample: "水泽节之山泽损" },
  { name: "螣蛇发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "螣蛇临官鬼动", guiZe: "螣蛇临官鬼发动，虚惊怪异噩梦", jiXiong: "凶", duanYu: "虚惊一场，怪异之事，噩梦连连", detailed: "螣蛇主虚惊/怪异/缠绕。临官鬼动主无中生有的恐惧、做噩梦、神经衰弱。", source: "《黄金策·六神章》", guaExample: "火地晋之雷地豫" },
  { name: "螣蛇发动·临妻财", type: "六神发动", yaoWei: "妻财爻", dongBian: "螣蛇临财动", guiZe: "螣蛇临妻财发动，财来财去纠缠不清", jiXiong: "平", duanYu: "钱财纠缠不清，账目混乱，收支混杂", detailed: "螣蛇+妻财主财务缠绕不清。账目混乱需清理，有人的钱和你的钱混在一起。投资宜清账。", source: "《卜筮正宗·六神篇》", guaExample: "风天小畜之风火家人" },
  { name: "螣蛇发动·临兄弟", type: "六神发动", yaoWei: "兄弟爻", dongBian: "螣蛇临兄弟动", guiZe: "螣蛇临兄弟发动，纠缠不休的竞争", jiXiong: "凶", duanYu: "纠缠不休的竞争，难以摆脱的对手", detailed: "螣蛇+兄弟主竞争者死缠烂打。如同黏在身上的对手，短期难以摆脱。需耐心周旋。", source: "《卜筮正宗·六神篇》", guaExample: "泽雷随之泽火革" },
  { name: "白虎发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "白虎临官鬼动", guiZe: "白虎临官鬼发动，血光之灾急症", jiXiong: "大凶", duanYu: "血光之灾，急症突发，意外伤害", detailed: "白虎为六神中最凶之神。临官鬼动主血光/手术/急症/车祸/暴力伤害。须格外小心出行及身体。", source: "《黄金策·六神章》", guaExample: "震为雷之火雷噬嗑" },
  { name: "白虎发动·临兄弟", type: "六神发动", yaoWei: "兄弟爻", dongBian: "白虎临兄弟动", guiZe: "白虎临兄弟发动，暴力竞争流血冲突", jiXiong: "大凶", duanYu: "暴力竞争，肢体冲突，同行火并", detailed: "白虎+兄弟主竞争升级为暴力。商场对手用非常手段，需合法维权并加强安保。", source: "《卜筮正宗·六神篇》", guaExample: "雷天大壮之泽天夬" },
  { name: "白虎发动·临子孙", type: "六神发动", yaoWei: "子孙爻", dongBian: "白虎临子孙动", guiZe: "白虎临子孙发动，手术刀圭药力猛烈", jiXiong: "平", duanYu: "药力猛烈，手术可成，但过程惊险", detailed: "白虎临子孙有双重含义：药物/治疗力量强大但过程惊险。占病则需手术但能成功，占求财则风险大利润高。", source: "《卜筮正宗·六神篇》", guaExample: "天地否之天水讼" },
  { name: "玄武发动·临官鬼", type: "六神发动", yaoWei: "官鬼爻", dongBian: "玄武临官鬼动", guiZe: "玄武临官鬼发动，暗中祸患盗贼之事", jiXiong: "凶", duanYu: "暗中祸患，盗贼隐患，阴私暴露", detailed: "玄武主暗昧/盗贼/阴私。临官鬼动主暗中有祸患，盗窃/隐私泄露/背后阴招。", source: "《黄金策·六神章》", guaExample: "水地比之水雷屯" },
  { name: "玄武发动·临妻财", type: "六神发动", yaoWei: "妻财爻", dongBian: "玄武临财动", guiZe: "玄武临妻财发动，暗财/横财/灰色收入", jiXiong: "平", duanYu: "暗财/横财/灰色收入/不明来源之财", detailed: "玄武+妻财主暗财。有意外之财但来路不明需谨慎。占生意则有灰色操作，提醒合规经营。", source: "《黄金策·六神章》", guaExample: "风泽中孚之山泽损" },
  { name: "玄武发动·临兄弟", type: "六神发动", yaoWei: "兄弟爻", dongBian: "玄武临兄弟动", guiZe: "玄武临兄弟发动，暗中的竞争对手搞鬼", jiXiong: "凶", duanYu: "背后黑手，暗中竞争对手使用不正当手段", detailed: "玄武+兄弟主竞争对手在暗中使坏。可能是商业间谍/暗中挖角/地下手段。需加强信息保密。", source: "《卜筮正宗·六神篇》", guaExample: "地风升之山风蛊" },
  // 伏吟 & 反吟
  { name: "卦遇伏吟", type: "伏吟", yaoWei: "全卦", dongBian: "卦变伏吟", guiZe: "卦变伏吟（内卦或外卦不动），诸事停滞", jiXiong: "凶", duanYu: "诸事停滞，左右为难，进退不得", detailed: "伏吟即卦变之后内卦或外卦与本宫相同。主事事原地踏步，如陷泥潭。占出行则不宜，占事业则停滞期。", source: "《黄金策·伏吟反吟章》", guaExample: "乾为天变乾为天" },
  { name: "卦遇反吟", type: "反吟", yaoWei: "全卦", dongBian: "卦变反吟", guiZe: "卦变反吟（内卦或外卦冲），诸事反复", jiXiong: "凶", duanYu: "事情反复无常，变来变去，祸福不定", detailed: "反吟即变卦与本卦相冲（如乾变巽、坎变离）。主事情反复无常，好坏来回变。占婚姻则感情反复，占事业则多变。", source: "《黄金策·伏吟反吟章》", guaExample: "乾为天变巽为风" },
  { name: "爻遇伏吟", type: "伏吟", yaoWei: "动爻", dongBian: "爻动化出同地支", guiZe: "动爻变出与自身同地支者为爻伏吟，该爻事停滞", jiXiong: "凶", duanYu: "该爻所代表的人或事停滞不前", detailed: "单爻伏吟如寅木动化寅木，该爻代表的人/事卡住不动。子孙伏吟则子女发展停滞，妻财伏吟则财运卡顿。", source: "《增删卜易·伏吟章》", guaExample: "雷风恒变雷天大壮" },
  { name: "爻遇反吟", type: "反吟", yaoWei: "动爻", dongBian: "爻动化回头冲", guiZe: "动爻变出回头冲本爻者，该爻事反复", jiXiong: "凶", duanYu: "该爻所主之事反复无常，时好时坏", detailed: "单爻反吟如子水动化午火回头冲。该爻之事好坏循环，不可掉以轻心。常反复几次才有结果。", source: "《增删卜易·反吟章》", guaExample: "坎为水变离为火" },
]

export function calculateLiuYaoShenDong(input: {
  guaName?: string; type?: string
}): LiuYaoShenDongResult {
  let result = ITEMS
  if (input.type && input.type !== "全部") {
    result = result.filter(i => i.type === input.type)
  }
  if (input.guaName) {
    const kw = input.guaName
    result = result.filter(i => i.name.includes(kw) || i.guiZe.includes(kw) || i.guaExample.includes(kw))
  }
  // ── box-drawing 结构化总结 ──
  const isFiltered = !!(input.type && input.type !== "全部") || !!input.guaName;
  const jinShenCount = ITEMS.filter(i => i.type === "进神").length;
  const tuiShenCount = ITEMS.filter(i => i.type === "退神").length;
  const anDongCount = ITEMS.filter(i => i.type === "暗动").length;
  const yuePoCount = ITEMS.filter(i => i.type === "月破").length;
  const liuQinCount = ITEMS.filter(i => i.type === "六亲发动").length;
  const liuShenCount = ITEMS.filter(i => i.type === "六神发动").length;
  const fuFanCount = ITEMS.filter(i => i.type === "伏吟" || i.type === "反吟").length;
  const jiCount = result.filter(i => i.jiXiong.includes("吉") && !i.jiXiong.includes("凶")).length;
  const xiongCount = result.filter(i => i.jiXiong.includes("凶")).length;
  const pingCount = result.length - jiCount - xiongCount;

  const lines = [
    `┌─ 六爻身动大全 ─────────────────`,
    `│ ${isFiltered ? `筛选：${result.length}条${input.type || ""}规则` : `完整收录${ITEMS.length}条六爻神动规则`}`,
    `│ 吉${jiCount} · 凶${xiongCount} · 平${pingCount}`,
    `│`,
    `├─ 分类统计 ──────────────────`,
    `│ 进神${jinShenCount}条 · 退神${tuiShenCount}条 · 暗动${anDongCount}条`,
    `│ 月破${yuePoCount}条 · 六亲发动${liuQinCount}条 · 六神发动${liuShenCount}条`,
    `│ 伏吟反吟${fuFanCount}条`,
    `│`,
    `├─ ${isFiltered ? "筛选条目" : "代表性条目"} ──────────────`,
  ];

  const displayItems = result.slice(0, 8);
  for (const item of displayItems) {
    const icon = item.jiXiong.includes("大吉") ? "★★" : item.jiXiong.includes("吉") ? "★" : item.jiXiong.includes("大凶") ? "▽▽" : item.jiXiong.includes("凶") ? "▼" : "◆";
    lines.push(`│ ${icon} ${item.name.padEnd(10, " ")} ${item.yaoWei.padEnd(4, " ")} → ${item.guiZe.substring(0, 28)}`);
  }
  if (result.length > 8) {
    lines.push(`│ ... 共${result.length}条，仅展示前8条`);
  }

  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《黄金策》明·刘基，卜筮经典，进神退神暗动月破`);
  lines.push(`│ 《增删卜易》清·李文辉，六爻实战案例大成`);
  lines.push(`│ 《卜筮正宗》清·王洪绪，六爻身动系统整理`);
  lines.push(`│ 《火珠林》唐·麻衣道者，六爻纳甲之祖`);
  lines.push(`│ 「动为机之先见者也」——黄金策`);

  lines.push(`│`);
  lines.push(`└─ 实用提示 ──────────────────`);
  lines.push(`   六爻身动以动爻为核心，一爻动则万事起。`);
  lines.push(`   进神→趋势向好，退神→趋势回落，暗动→暗中变化，月破→当月无力。`);
  lines.push(`   六亲发动看用神，六神发动看吉凶，伏吟反吟看迟速。`);
  lines.push(`   ${isFiltered ? `当前筛选${result.length}条，${input.type ? "类型：" + input.type : ""}` : "可依类型(进神/退神/暗动/月破/六亲/六神)筛选查询。"}`);

  const summary = lines.join("\n");

  return { items: result, total: result.length, summary }
}

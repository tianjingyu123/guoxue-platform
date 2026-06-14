// ── 奇门山向计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
import type { QiMenShanGongResult, ShanGongItem } from "@guoxue/shared"

const SHAN_GONG_DATA: ShanGongItem[] = [
  // ═══════════ 坎宫·壬子癸 ═══════════
  { shan: "壬山", guaWei: "坎", diPanGan: "壬", tianPanGan: "天蓬", baMen: "休门", jiuXing: "天蓬", baShen: "值符", jiXiong: "吉", keYing: "壬为阳水，休门主休息养生，宜办公室/书房", detailed: "壬山丙向，坎宫阳水。休门配天蓬，水势浩大，利文职/学术/休养。忌火性行业。", suitable: ["办公室", "书房", "养生场所", "茶室"], avoid: ["厨房", "火性工厂"] },
  { shan: "子山", guaWei: "坎", diPanGan: "癸", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "九天", jiXiong: "凶", keYing: "子为阴水，死门不宜居住，需化解", detailed: "子山午向，死门临子，阴气偏重。不宜做卧室/正门，适合仓库/储藏。若为住宅需以阳木化解。", suitable: ["仓库", "储藏室", "地下室"], avoid: ["卧室", "客厅", "正门"] },
  { shan: "癸山", guaWei: "坎", diPanGan: "癸", tianPanGan: "天柱", baMen: "惊门", jiuXing: "天柱", baShen: "九地", jiXiong: "凶", keYing: "癸为阴水化气，惊门主口舌，宜静不宜动", detailed: "癸山丁向，惊门配天柱，主口舌是非。不宜做商业门面，适合安静私密空间如书房/冥想室。", suitable: ["书房", "冥想室", "档案室"], avoid: ["商铺", "餐厅", "会议室"] },
  // ═══════════ 坤宫·未坤申 ═══════════
  { shan: "未山", guaWei: "坤", diPanGan: "己", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "值符", jiXiong: "吉", keYing: "景门主名声/文化，宜文化教育场所", detailed: "未山丑向，景门配天英，火土相生。利文化/教育/艺术行业，主名声远扬。火旺需配水调和。", suitable: ["学校", "画廊", "文化中心", "广告公司"], avoid: ["水产商铺", "浴室"] },
  { shan: "坤山", guaWei: "坤", diPanGan: "戊", tianPanGan: "天禽", baMen: "中门", jiuXing: "天禽", baShen: "螣蛇", jiXiong: "平", keYing: "中门居中，坤为地母，宜稳重保守", detailed: "坤山艮向，中门配天禽，居中守正。坤为大地厚重，宜做住宅基础或祖宅。螣蛇加临需防虚诈。", suitable: ["住宅", "祖宅", "农庄", "大地产业"], avoid: ["高投机行业"] },
  { shan: "申山", guaWei: "坤", diPanGan: "庚", tianPanGan: "天辅", baMen: "杜门", jiuXing: "天辅", baShen: "太阴", jiXiong: "平", keYing: "杜门主隐藏/技术，宜研发/保密场所", detailed: "申山寅向，杜门配天辅，金木相克。杜门技术星，利研发/实验室/保密场所。太阴加临宜暗中筹划。", suitable: ["实验室", "研发中心", "保密室", "策划室"], avoid: ["开放式办公", "公共区域"] },
  // ═══════════ 震宫·甲卯乙 ═══════════
  { shan: "甲山", guaWei: "震", diPanGan: "甲", tianPanGan: "天冲", baMen: "伤门", jiuXing: "天冲", baShen: "白虎", jiXiong: "大凶", keYing: "伤门+白虎，大凶，不可用", detailed: "甲山庚向，伤门配天冲+白虎，至凶之格。不宜任何阳宅用途。若不得已，需以水泄金气、木生火解。", suitable: [], avoid: ["所有住宅和商业用途"] },
  { shan: "卯山", guaWei: "震", diPanGan: "乙", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "玄武", jiXiong: "大凶", keYing: "死门+玄武，盗贼阴私，凶", detailed: "卯山酉向，死门临卯，玄武加临主盗贼阴私。正东虽为震宫吉位但被死门煞占。不宜选此坐向。", suitable: [], avoid: ["所有住宅和商业用途"] },
  { shan: "乙山", guaWei: "震", diPanGan: "乙", tianPanGan: "天心", baMen: "开门", jiuXing: "天心", baShen: "太阴", jiXiong: "大吉", keYing: "开门+天心，大吉，宜一切用事", detailed: "乙山辛向，开门配天心，震宫花木向阳。开门大吉，利开业/求财/求官/婚姻。太阴加临利暗中发展。", suitable: ["住宅大门", "公司", "商铺", "婚房", "官衙"], avoid: [] },
  // ═══════════ 巽宫·辰巽巳 ═══════════
  { shan: "辰山", guaWei: "巽", diPanGan: "戊", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "九天", jiXiong: "吉", keYing: "景门利文化创意，巽为文昌", detailed: "辰山戌向，景门配天英+九天，巽宫文昌利文化创意。利教育机构/设计公司/新媒体。九天主动态发展。", suitable: ["学校", "设计公司", "新媒体", "出版社"], avoid: ["重工业"] },
  { shan: "巽山", guaWei: "巽", diPanGan: "壬", tianPanGan: "天辅", baMen: "杜门", jiuXing: "天辅", baShen: "九地", jiXiong: "平", keYing: "杜门+天辅，利学术研究/修身养性", detailed: "巽山乾向，杜门配天辅，巽为风为入，天辅文昌星。利学术/研究/修行/园林。九地主长久稳健。", suitable: ["书院", "研究所", "修行场所", "园林"], avoid: ["喧闹商业"] },
  { shan: "巳山", guaWei: "巽", diPanGan: "癸", tianPanGan: "天柱", baMen: "惊门", jiuXing: "天柱", baShen: "值符", jiXiong: "平", keYing: "惊门临巳，火金相战，宜律师/诉讼", detailed: "巳山亥向，惊门配天柱，巳火克柱金。惊门利于律师/诉讼/辩论行业。值符加临主有一定的权威性。", suitable: ["律师事务所", "辩论培训", "仲裁机构"], avoid: ["需要安静的场所"] },
  // ═══════════ 乾宫·戌乾亥 ═══════════
  { shan: "戌山", guaWei: "乾", diPanGan: "丙", tianPanGan: "天禽", baMen: "死门", jiuXing: "天禽", baShen: "白虎", jiXiong: "凶", keYing: "死门+白虎加戌，火库被焚，凶", detailed: "戌山辰向，死门临戌地网，戌为火库。死门加白虎凶上加凶。不宜居住。若为阴宅需远择吉日重葬。", suitable: [], avoid: ["阳宅住宅", "商铺"] },
  { shan: "乾山", guaWei: "乾", diPanGan: "庚", tianPanGan: "天心", baMen: "开门", jiuXing: "天心", baShen: "螣蛇", jiXiong: "吉", keYing: "开门+天心，乾宫本位大吉", detailed: "乾山巽向，开门配天心为乾宫本位吉格。利仕途/官运/领导办公室。螣蛇加临需防虚诈小人。", suitable: ["官衙", "CEO办公室", "行政中心", "银行"], avoid: ["娱乐场所"] },
  { shan: "亥山", guaWei: "乾", diPanGan: "辛", tianPanGan: "天英", baMen: "伤门", jiuXing: "天英", baShen: "玄武", jiXiong: "凶", keYing: "伤门+玄武，亥为天门被伤破", detailed: "亥山巳向，伤门临亥天门，亥水克天英火。伤门主外伤/手术/车祸。玄武主暗昧不明。大凶不宜用。", suitable: [], avoid: ["住宅", "商业", "一切阳宅"] },
  // ═══════════ 兑宫·庚酉辛 ═══════════
  { shan: "庚山", guaWei: "兑", diPanGan: "丁", tianPanGan: "天任", baMen: "生门", jiuXing: "天任", baShen: "太阴", jiXiong: "大吉", keYing: "生门+天任，兑宫大利财运", detailed: "庚山甲向，生门配天任，丁火锻庚金成器。生门大吉主财源滚滚。太阴加临利稳健理财。", suitable: ["商铺", "公司", "金融机构", "投资公司"], avoid: ["殡葬业"] },
  { shan: "酉山", guaWei: "兑", diPanGan: "己", tianPanGan: "天蓬", baMen: "休门", jiuXing: "天蓬", baShen: "螣蛇", jiXiong: "平", keYing: "休门+天蓬，酉为桃花，宜娱乐", detailed: "酉山卯向，休门配天蓬，酉为桃花位。利娱乐/美容/社交行业。螣蛇加临易有感情纠纷。", suitable: ["娱乐场所", "美容院", "社交俱乐部", "酒吧"], avoid: ["严肃办公"] },
  { shan: "辛山", guaWei: "兑", diPanGan: "壬", tianPanGan: "天辅", baMen: "杜门", jiuXing: "天辅", baShen: "九天", jiXiong: "平", keYing: "杜门+天辅，金水相生，宜技术研发", detailed: "辛山乙向，杜门配天辅，辛金生壬水流通。利技术研发/精密制造/工程设计。九天主高远志向。", suitable: ["研发中心", "工程部", "精密制造", "IT公司"], avoid: ["零售商铺"] },
  // ═══════════ 艮宫·丑艮寅 ═══════════
  { shan: "丑山", guaWei: "艮", diPanGan: "乙", tianPanGan: "天蓬", baMen: "惊门", jiuXing: "天蓬", baShen: "玄武", jiXiong: "凶", keYing: "惊门+玄武，艮为鬼门，多阴私", detailed: "丑山未向，惊门临丑，丑为艮宫金库。玄武加临主阴私暗昧。不宜居住或商业用途。", suitable: ["道观", "寺庙", "安葬地"], avoid: ["住宅", "商业"] },
  { shan: "艮山", guaWei: "艮", diPanGan: "丙", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "值符", jiXiong: "吉", keYing: "景门+天英，艮为山得火明", detailed: "艮山坤向，景门配天英，高山得火光照。利教育/文旅/风景区开发。值符加临主权威机构场所。", suitable: ["学校", "风景区", "观景台", "展览馆"], avoid: ["地下场所"] },
  { shan: "寅山", guaWei: "艮", diPanGan: "戊", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "九地", jiXiong: "凶", keYing: "死门+天芮，寅为鬼户，凶", detailed: "寅山申向，死门临寅鬼户，天芮病星。不宜阳宅。若为阴宅需避正午安葬。", suitable: [], avoid: ["阳宅住宅", "商业"] },
  // ═══════════ 离宫·丙午丁 ═══════════
  { shan: "丙山", guaWei: "离", diPanGan: "辛", tianPanGan: "天冲", baMen: "生门", jiuXing: "天冲", baShen: "螣蛇", jiXiong: "吉", keYing: "生门临离，火土旺财，宜商业", detailed: "丙山壬向，生门配天冲临离宫，火光冲天。生门大利财运，离宫火旺宜餐饮/能源/文娱行业。螣蛇需防虚假。", suitable: ["餐饮", "能源公司", "娱乐场所", "灯具店"], avoid: ["水产", "冷库"] },
  { shan: "午山", guaWei: "离", diPanGan: "甲", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "白虎", jiXiong: "平", keYing: "景门+天英午宫，光旺过盛", detailed: "午山子向，景门配天英为离宫正位，但白虎加临。光耀太盛需水调和。宜展示/文化但需防口舌纠纷。", suitable: ["展览馆", "博物馆", "舞台", "影棚"], avoid: ["需要低调的场所"] },
  { shan: "丁山", guaWei: "离", diPanGan: "乙", tianPanGan: "天心", baMen: "开门", jiuXing: "天心", baShen: "太阴", jiXiong: "大吉", keYing: "开门+天心丁山，大吉大利", detailed: "丁山癸向，开门配天心临离宫，丁火文明配开门通达。大吉之格，宜住宅/商业/官衙一切用事。", suitable: ["住宅", "公司总部", "商铺", "官署"], avoid: [] },
  // ═══════════ 二十四山特殊格局 ═══════════
  { shan: "甲山（替卦）", guaWei: "震", diPanGan: "甲", tianPanGan: "天辅", baMen: "杜门", jiuXing: "天辅", baShen: "六合", jiXiong: "平", keYing: "替卦甲山以杜门替伤门，化凶为平", detailed: "甲山庚向若用替卦，杜门代伤门。虽不及正格但仍可用。利技术/合作行业。六合主合作共赢。", suitable: ["合作办公", "技术研发", "联合创业"], avoid: ["独立经营"] },
  { shan: "卯山（替卦）", guaWei: "震", diPanGan: "乙", tianPanGan: "天任", baMen: "生门", jiuXing: "天任", baShen: "九天", jiXiong: "吉", keYing: "替卦卯山以生门替死门，化凶为吉", detailed: "卯山酉向用替卦，生门代死门。天任加临主步步高升。利住宅/商业/投资。为卯山最佳化解方案。", suitable: ["住宅", "商业", "投资", "创业"], avoid: [] },
  // ═══════════ 山向组合格局 ═══════════
  { shan: "子午兼壬丙", guaWei: "坎离", diPanGan: "戊癸", tianPanGan: "天禽天英", baMen: "中门景门", jiuXing: "天禽天英", baShen: "值符", jiXiong: "吉", keYing: "子午立向，水火既济", detailed: "子山午向兼壬丙三分，坎离相交水火既济。天禽中正天英文明。大利文化教育/高端住宅。", suitable: ["高端住宅", "文化机构", "学校", "图书馆"], avoid: ["化工厂"] },
  { shan: "乾巽兼亥巳", guaWei: "乾巽", diPanGan: "庚癸", tianPanGan: "天心天辅", baMen: "开门杜门", jiuXing: "天心天辅", baShen: "六合", jiXiong: "吉", keYing: "乾巽立向，天地交泰", detailed: "乾山巽向兼亥巳三分，天地交泰。开门+杜门，官商结合。利政府机构/大型企业/跨国贸易。", suitable: ["政府大楼", "企业总部", "银行", "贸易公司"], avoid: ["小商铺"] },
  { shan: "丙午兼巳", guaWei: "离", diPanGan: "丙乙", tianPanGan: "天英天心", baMen: "景门开门", jiuXing: "天英天心", baShen: "九天", jiXiong: "大吉", keYing: "景门+开门，光耀通达，大吉", detailed: "丙山午向兼巳三分，景门+开门双吉。离宫火旺配乾金开门，光明通达。利一切用事，尤利文化传播。", suitable: ["电视台", "传媒公司", "文化中心", "礼堂"], avoid: [] },
  // ═══════════ 七十二龙坐山 ═══════════
  { shan: "甲子龙", guaWei: "坎", diPanGan: "戊", tianPanGan: "天蓬", baMen: "休门", jiuXing: "天蓬", baShen: "太阴", jiXiong: "吉", keYing: "六十甲子龙首，休门吉", detailed: "六十甲子之首甲子龙，坐坎宫休门正位。甲子为六十甲子循环之始，此处坐山为龙脉初生之象，主生生不息。", suitable: ["住宅", "祖宅", "祠堂", "农业"], avoid: ["火性行业"] },
  { shan: "丙子龙", guaWei: "坎", diPanGan: "壬", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "螣蛇", jiXiong: "凶", keYing: "丙子龙死门临，水土混杂", detailed: "丙子龙坐坎，死门临子，丙火入水乡。水土混杂不通。不宜阳宅。", suitable: [], avoid: ["所有阳宅用途"] },
  { shan: "戊子龙", guaWei: "坎", diPanGan: "甲", tianPanGan: "天辅", baMen: "杜门", jiuXing: "天辅", baShen: "六合", jiXiong: "平", keYing: "戊子龙杜门，适合修炼场所", detailed: "戊子龙坐坎，杜门临，戊土止水。适合清修、道观、禅修场所。六合加临利于团体修行。", suitable: ["道观", "禅修中心", "静修所"], avoid: ["商业", "住宅"] },
  { shan: "庚子龙", guaWei: "坎", diPanGan: "丙", tianPanGan: "天柱", baMen: "惊门", jiuXing: "天柱", baShen: "九地", jiXiong: "凶", keYing: "庚子龙惊门，金寒水冷，凶", detailed: "庚子龙坐坎，惊门临，庚金生癸水过寒。主口舌是非不断。不宜阳宅。", suitable: [], avoid: ["住宅", "商业", "办公"] },
  { shan: "壬子龙", guaWei: "坎", diPanGan: "戊", tianPanGan: "天禽", baMen: "中门", jiuXing: "天禽", baShen: "值符", jiXiong: "吉", keYing: "壬子龙中门，子中藏癸居正位", detailed: "壬子龙坐坎正位子中，中门配天禽居中守正。值符加临最为尊贵。大利住宅/官衙/祖堂。", suitable: ["住宅", "官衙", "祖堂", "银行"], avoid: [] },
  { shan: "乙丑龙", guaWei: "艮", diPanGan: "己", tianPanGan: "天任", baMen: "生门", jiuXing: "天任", baShen: "九天", jiXiong: "大吉", keYing: "乙丑龙生门，艮土生金，大吉", detailed: "乙丑龙坐艮，生门配天任，丑为金库得生门萌发。大利财运/置业/实业。九天主步步高升。", suitable: ["住宅", "商铺", "工厂", "仓库"], avoid: ["火葬场"] },
  { shan: "丁丑龙", guaWei: "艮", diPanGan: "癸", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "太阴", jiXiong: "平", keYing: "丁丑龙景门，火土相生", detailed: "丁丑龙坐艮，景门配天英，丁火生艮土。利文化/教育/创意产业。太阴加临宜暗中策划。", suitable: ["设计公司", "艺术工作室", "学校"], avoid: ["重工业"] },
  { shan: "己丑龙", guaWei: "艮", diPanGan: "丁", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "玄武", jiXiong: "凶", keYing: "己丑龙死门，艮入墓库，凶", detailed: "己丑龙坐艮死门，己土遇丑入墓。死门凶格不宜阳宅。", suitable: ["墓地", "陵园"], avoid: ["住宅", "商业"] },
  { shan: "辛丑龙", guaWei: "艮", diPanGan: "乙", tianPanGan: "天蓬", baMen: "休门", jiuXing: "天蓬", baShen: "螣蛇", jiXiong: "平", keYing: "辛丑龙休门，金入库得休养生息", detailed: "辛丑龙坐艮休门，辛金入丑库得休养。适合疗养院/度假村/退休社区。螣蛇需防管理混乱。", suitable: ["疗养院", "度假村", "养老社区"], avoid: ["快节奏商业"] },
  { shan: "癸丑龙", guaWei: "艮", diPanGan: "辛", tianPanGan: "天冲", baMen: "伤门", jiuXing: "天冲", baShen: "白虎", jiXiong: "大凶", keYing: "癸丑龙伤门+白虎，至凶不可用", detailed: "癸丑龙坐艮伤门+白虎，至凶之格。癸水入丑库又被伤门冲破，白虎加临主血光。严禁使用。", suitable: [], avoid: ["所有用途"] },
  // ═══════════ 天星行度吉凶 ═══════════
  { shan: "太阳到山", guaWei: "全山", diPanGan: "—", tianPanGan: "—", baMen: "—", jiuXing: "太阳", baShen: "—", jiXiong: "大吉", keYing: "太阳星到山，光辉普照，万事大吉", detailed: "太阳星到山为奇门风水第一吉格。太阳照临之山向，百煞潜藏，诸事顺遂。利开业/动土/嫁娶/入宅。", suitable: ["开业", "动土", "嫁娶", "入宅", "一切用事"], avoid: [] },
  { shan: "太阴到山", guaWei: "全山", diPanGan: "—", tianPanGan: "—", baMen: "—", jiuXing: "太阴", baShen: "—", jiXiong: "吉", keYing: "太阴星到山，阴德护佑，宜安葬祈福", detailed: "太阴星到山利于阴事。安葬/祭祀/祈福/求子为佳。太阴主女性贵人，利女性主导的场所。", suitable: ["安葬", "祭祀", "祈福", "求子", "女性会所"], avoid: ["武职场所"] },
  { shan: "天乙到山", guaWei: "全山", diPanGan: "—", tianPanGan: "—", baMen: "—", jiuXing: "天乙贵人", baShen: "—", jiXiong: "大吉", keYing: "天乙贵人到山，贵人扶持，官运亨通", detailed: "天乙贵人到山主贵人扶持。利官衙/政府机构/律师事务所。主遇难成祥得贵人相助。", suitable: ["官衙", "律师楼", "顾问公司", "政府机构"], avoid: [] },
  { shan: "三煞到山", guaWei: "全山", diPanGan: "—", tianPanGan: "—", baMen: "—", jiuXing: "劫煞/灾煞/岁煞", baShen: "—", jiXiong: "大凶", keYing: "三煞到山，百事不宜，绝不可用", detailed: "三煞（劫煞/灾煞/岁煞）汇聚到山，为至凶之格。主血光/破坏/灾难。严禁在此山向动土修造。", suitable: [], avoid: ["所有用途，严禁动土修造"] },
  { shan: "五黄到山", guaWei: "全山", diPanGan: "—", tianPanGan: "—", baMen: "—", jiuXing: "五黄煞", baShen: "—", jiXiong: "大凶", keYing: "五黄大煞到山，灾祸百出，不可用", detailed: "五黄煞为风水第一凶星，到山为极凶。主重病/死亡/破大财/意外。严禁修造动土。", suitable: [], avoid: ["所有用途，严禁修造动土"] },
  // ═══════════ 二十四山兼向格局 ═══════════
  { shan: "丑山兼艮", guaWei: "艮", diPanGan: "丙", tianPanGan: "天禽", baMen: "中门", jiuXing: "天禽", baShen: "六合", jiXiong: "吉", keYing: "丑山兼艮，丑为金库艮为山，金土相生", detailed: "丑山未向兼艮坤三分，丑金库得艮山稳固，中门守正。利仓库/实业/矿业类场所。六合加临主合作共赢。", suitable: ["仓库", "矿业公司", "实业厂房", "合作办公"], avoid: ["娱乐场所"] },
  { shan: "卯山兼甲", guaWei: "震", diPanGan: "甲", tianPanGan: "天柱", baMen: "惊门", jiuXing: "天柱", baShen: "玄武", jiXiong: "平", keYing: "卯山兼甲，卯木得甲木相助，但惊门耗气", detailed: "卯山酉向兼甲庚三分，卯得甲助木气更旺，但惊门金来克木。宜园林/苗圃/农场。玄武主暗中经营。", suitable: ["园林", "苗圃", "农场", "生态园区"], avoid: ["金属加工"] },
  { shan: "午山兼丙", guaWei: "离", diPanGan: "戊", tianPanGan: "天芮", baMen: "死门", jiuXing: "天芮", baShen: "九地", jiXiong: "凶", keYing: "午山兼丙，午火极盛，死门大凶", detailed: "午山子向兼丙壬三分，午火极盛遇死门，火炎土燥。不宜阳宅。若为宗庙/火葬场/冶炼厂可用。", suitable: ["宗庙", "火葬场", "冶炼厂"], avoid: ["住宅", "学校", "医院"] },
  { shan: "未山兼坤", guaWei: "坤", diPanGan: "癸", tianPanGan: "天蓬", baMen: "休门", jiuXing: "天蓬", baShen: "太阴", jiXiong: "吉", keYing: "未山兼坤，休门临坤，土水相涵", detailed: "未山丑向兼坤艮三分，休门配天蓬，未土得癸水滋润。利农业/养殖/水资源相关产业。太阴主平稳发展。", suitable: ["农业公司", "养殖场", "水处理", "环保公司"], avoid: ["火性行业"] },
  { shan: "酉山兼庚", guaWei: "兑", diPanGan: "丙", tianPanGan: "天英", baMen: "景门", jiuXing: "天英", baShen: "值符", jiXiong: "吉", keYing: "酉山兼庚，金得火炼成大器", detailed: "酉山卯向兼庚甲三分，酉金得丙火锻造成器。景门利文化/首饰/珠宝行业。值符加临主权威品牌。", suitable: ["珠宝公司", "首饰工坊", "拍卖行", "奢侈品店"], avoid: ["木器加工"] },
  { shan: "辰山兼乙", guaWei: "巽", diPanGan: "丁", tianPanGan: "天任", baMen: "生门", jiuXing: "天任", baShen: "九天", jiXiong: "大吉", keYing: "辰山兼乙，生门临辰水库，龙入大海", detailed: "辰山戌向兼乙辛三分，辰为水库得生门灌溉，龙入大海之象。大利贸易/物流/进出口。九天主志向高远。", suitable: ["贸易公司", "物流中心", "港口企业", "跨国贸易"], avoid: [] },
  { shan: "戌山兼乾", guaWei: "乾", diPanGan: "甲", tianPanGan: "天冲", baMen: "伤门", jiuXing: "天冲", baShen: "白虎", jiXiong: "大凶", keYing: "戌山兼乾，伤门+白虎，地网逢凶", detailed: "戌山辰向兼乾巽三分，戌为地网逢伤门白虎双凶。严禁阳宅修造。唯有军事/公安设施可考虑。", suitable: ["军事设施", "公安训练场"], avoid: ["住宅", "商业", "学校", "医院"] },
  { shan: "亥山兼壬", guaWei: "乾", diPanGan: "戊", tianPanGan: "天心", baMen: "开门", jiuXing: "天心", baShen: "螣蛇", jiXiong: "吉", keYing: "亥山兼壬，开门临天门，水天一色", detailed: "亥山巳向兼壬丙三分，亥为天门得开门+天心，水天一色气象万千。利政府/旅游/航天/高端服务业。螣蛇需防内部虚耗。", suitable: ["政府设施", "旅游公司", "高端酒店", "航天企业"], avoid: ["重污染行业"] },
]

export function calculateQiMenShanGong(input: {
  zuoShan?: string
  chaoXiang?: string
}): QiMenShanGongResult {
  let result = SHAN_GONG_DATA

  if (input.zuoShan) {
    result = result.filter(s => s.shan.includes(input.zuoShan!))
  }
  if (input.chaoXiang) {
    result = result.filter(s => s.keYing.includes(input.chaoXiang!) || s.detailed.includes(input.chaoXiang!))
  }

  const summary = result.length >= SHAN_GONG_DATA.length
    ? `共收录${SHAN_GONG_DATA.length}条山向奇门数据，涵盖二十四山坐向、七十二龙坐山、天星行度吉凶三层次，用于奇门风水山向选择`
    : `筛选出${result.length}条${input.zuoShan ? input.zuoShan + " " : ""}山向奇门数据`

  return { shanGong: result, summary }
}

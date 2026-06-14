// 算法参考：《大六壬指南》《六壬大全》《课经集》
import type { DaLiuRenKeJingResult, KeTiItem } from "@guoxue/shared"

const KE_TI: KeTiItem[] = [
  // ═══════════ 九宗门·元首课 ═══════════
  { name: "元首课", zongMen: "元首", xiangShen: "日干", keTi: "贼克·上克下", panMian: "四课上克下，发用为初传", duanYu: "君临臣位，万事亨通。利见大人，不利小人。求官得升，求财可得。", jiXiong: "吉", shiJian: ["求官", "诉讼", "婚姻", "出行"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "重审课", zongMen: "重审", xiangShen: "日支", keTi: "贼克·下克上", panMian: "四课下克上，发用为重审", duanYu: "事须再三审察而后行。先难后易，谋事多阻。利于被动等待，不利主动出击。", jiXiong: "半吉", shiJian: ["等待消息", "被动事务", "求人办事"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "知一课", zongMen: "知一", xiangShen: "日干", keTi: "比用·多克取比", panMian: "四课多克，取与日干比者为用", duanYu: "事有所疑，当知其一端而推之。比和者为用，事可比类而推。", jiXiong: "半吉", shiJian: ["推理决策", "类比分析", "参考他人经验"], yiJi: ["独断专行"], source: "《大六壬大全·课经集》" },
  { name: "涉害课", zongMen: "涉害", xiangShen: "日干", keTi: "涉害·取害深者", panMian: "多克无等比，取涉害深者为用", duanYu: "事有艰难，须历尽艰辛方成。涉害深者受害重，事多曲折。", jiXiong: "先凶后吉", shiJian: ["长期投资", "困难任务", "坚持不放弃"], yiJi: ["急功近利"], source: "《大六壬大全·课经集》" },
  { name: "遥克课·弹射", zongMen: "遥克", xiangShen: "日干", keTi: "遥克·日遥克神", panMian: "四课无克，日干遥克上神为用", duanYu: "事由远及近，如弹弓射物，力弱难中。需借助外力方能成功。", jiXiong: "半吉", shiJian: ["远程事务", "求助外力", "间接方式"], yiJi: ["指望立竿见影"], source: "《大六壬大全·课经集》" },
  { name: "遥克课·弹射覆", zongMen: "遥克", xiangShen: "日干", keTi: "遥克·神遥克日", panMian: "四课无克，上神遥克日干为用", duanYu: "事有不测，灾自外来。如箭从远射，防不胜防。需谨慎提防小人暗算。", jiXiong: "凶", shiJian: ["提防小人", "检查安全隐患", "做最坏准备"], yiJi: ["大意轻敌"], source: "《大六壬大全·课经集》" },
  { name: "昴星课·刚日", zongMen: "昴星", xiangShen: "昴宿", keTi: "昴星·刚日取酉", panMian: "四课无克无遥，刚日取酉为初传", duanYu: "事如昴星隐现不定，吉凶难料。刚日昴星主暗中运作之事，结果难测。", jiXiong: "半吉", shiJian: ["暗中策划", "保密事务", "不宜张扬之事"], yiJi: ["公开宣扬"], source: "《大六壬大全·课经集》" },
  { name: "昴星课·柔日", zongMen: "昴星", xiangShen: "昴宿", keTi: "昴星·柔日取酉", panMian: "四课无克无遥，柔日取酉为初传", duanYu: "事如昴宿阴柔，暗中生变。柔日昴星主暗耗损失，难以觉察。", jiXiong: "凶", shiJian: ["检查暗耗", "小心提防", "保守观望"], yiJi: ["大额投资"], source: "《大六壬大全·课经集》" },
  { name: "别责课", zongMen: "别责", xiangShen: "日干", keTi: "别责·寄干取用", panMian: "四课不全不足四课，别取合干为用", duanYu: "事不完全，须借助他力。别责者，借他力以成事，但力有不逮。", jiXiong: "半吉", shiJian: ["合作", "求助", "借势"], yiJi: ["独自逞强"], source: "《大六壬大全·课经集》" },
  { name: "八专课", zongMen: "八专", xiangShen: "日干日支", keTi: "八专·干支同位", panMian: "干支同位，四课专一", duanYu: "事专于一，不宜分散。八专课主专注一事有成效，但同时进行多事则败。", jiXiong: "吉", shiJian: ["专注一事", "深耕细作", "单点突破"], yiJi: ["多线并行"], source: "《大六壬大全·课经集》" },
  { name: "伏吟课", zongMen: "伏吟", xiangShen: "全局", keTi: "伏吟·天地盘同位", panMian: "天地盘同位，三传皆伏", duanYu: "事有停滞，不宜行动。伏吟主卧而不动，适合内省、规划，不宜外出行动。", jiXiong: "平", shiJian: ["内部整顿", "反思自省", "长期规划"], yiJi: ["贸然行动", "急进"], source: "《大六壬大全·课经集》" },
  { name: "反吟课", zongMen: "反吟", xiangShen: "全局", keTi: "反吟·天地盘对冲", panMian: "天地盘对冲，三传皆冲", duanYu: "事有反复，变化无常。反吟主动荡不安，好坏循环，适合灵活应变。", jiXiong: "平", shiJian: ["灵活应变", "顺势而为", "快进快出"], yiJi: ["守旧不变"], source: "《大六壬大全·课经集》" },
  // ═══════════ 六十四课体 ═══════════
  { name: "三光课", zongMen: "六十四课", xiangShen: "日月星", keTi: "三光·日月星照", panMian: "天乙贵人+朱雀+太阴同现", duanYu: "万事光明，吉庆大来。三光课主贵人星三重护佑，诸事顺利。", jiXiong: "吉", shiJian: ["求婚", "求官", "签约", "开张"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "三阳课", zongMen: "六十四课", xiangShen: "三阳开泰", keTi: "三阳·阳气三重", panMian: "初传+中传+末传皆阳", duanYu: "阳气蓬勃，事业上升。三阳课主生机旺盛，利于开创和扩张。", jiXiong: "吉", shiJian: ["创业", "扩张", "求职", "出行"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "三奇课", zongMen: "六十四课", xiangShen: "三奇贵人", keTi: "三奇·甲戊庚", panMian: "甲戊庚三奇在天盘成局", duanYu: "奇才出世，非凡成就。三奇课主天赋异禀，出类拔萃。", jiXiong: "吉", shiJian: ["考试", "竞赛", "创新", "创业"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "六仪课", zongMen: "六十四课", xiangShen: "旬首六仪", keTi: "六仪·旬首发用", panMian: "旬首加临发用", duanYu: "仪仗威严，得上级赏识。六仪课主得领导重用，仕途顺利。", jiXiong: "吉", shiJian: ["求官", "升职", "见领导", "面试"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "铸印课", zongMen: "六十四课", xiangShen: "铸印", keTi: "铸印·戌加巳", panMian: "戌（印）加巳（火）为炉冶铸印", duanYu: "事业铸造中，功名可成。铸印课主升迁有望，但需时日。", jiXiong: "吉", shiJian: ["考公务员", "评职称", "申请职位"], yiJi: ["急于求成"], source: "《大六壬大全·课经集》" },
  { name: "斫轮课", zongMen: "六十四课", xiangShen: "斫轮", keTi: "斫轮·卯加申", panMian: "卯（木）加申（金）为金刀斫木成轮", duanYu: "终南捷径，技艺精进。斫轮课主磨练技艺成大器。", jiXiong: "吉", shiJian: ["学艺", "升学", "进修"], yiJi: ["半途而废"], source: "《大六壬大全·课经集》" },
  { name: "引从课", zongMen: "六十四课", xiangShen: "引从", keTi: "引从·干前干后", panMian: "初传在干前，末传在干后", duanYu: "前后引从，得人相助。引从课主有人引荐，入门有路。", jiXiong: "吉", shiJian: ["求职", "求人介绍", "拜师"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "亨通课", zongMen: "六十四课", xiangShen: "三传递生", keTi: "亨通·三传递生", panMian: "三传递相生助", duanYu: "万事亨通，诸事顺利。亨通课主一路相助，畅通无阻。", jiXiong: "吉", shiJian: ["出行", "签约", "投资", "求财"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "繁昌课", zongMen: "六十四课", xiangShen: "繁昌", keTi: "繁昌·子孙爻旺相", panMian: "日干子孙爻旺相得地", duanYu: "子孙繁盛，事业昌隆。繁昌课主子嗣兴旺，家族昌盛。", jiXiong: "吉", shiJian: ["求子", "创业", "家族事业"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "荣华课", zongMen: "六十四课", xiangShen: "荣华", keTi: "荣华·禄马交驰", panMian: "禄神和马星同现", duanYu: "荣华富贵，名利双收。荣华课主富贵逼人，财官两旺。", jiXiong: "吉", shiJian: ["求财", "求官", "名利之事"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "德庆课", zongMen: "六十四课", xiangShen: "德庆", keTi: "德庆·德神临门", panMian: "天德/月德/日德临干支", duanYu: "德星高照，灾祸远离。德庆课主善有善报，吉利事多。", jiXiong: "吉", shiJian: ["慈善", "还愿", "感恩"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "和美课", zongMen: "六十四课", xiangShen: "和美", keTi: "和美·干支相合", panMian: "日干与日支相合或与课神相合", duanYu: "诸事和美，人际关系融洽。和美课主合作顺利，家庭和睦。", jiXiong: "吉", shiJian: ["婚嫁", "合作", "谈生意", "和解"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "斩关课", zongMen: "六十四课", xiangShen: "斩关", keTi: "斩关·魁罡加日辰", panMian: "魁罡（辰戌）加干支", duanYu: "破关斩将，冲破阻碍。斩关课主突破瓶颈，克服困难。", jiXiong: "吉", shiJian: ["诉讼", "谈判", "竞争", "突破困境"], yiJi: [], source: "《大六壬大全·课经集》" },
  { name: "闭口课", zongMen: "六十四课", xiangShen: "闭口", keTi: "闭口·旬尾加干", panMian: "旬尾加日干，或玄武临干", duanYu: "口舌有禁，不宜多言。闭口课主保密为上，多言招祸。", jiXiong: "凶", shiJian: ["保密", "潜伏", "低调"], yiJi: ["多言", "泄密", "高调"], source: "《大六壬大全·课经集》" },
  { name: "游子课", zongMen: "六十四课", xiangShen: "游子", keTi: "游子·三传皆水", panMian: "三传皆水或见天马", duanYu: "人在旅途，漂泊不定。游子课主出行在外，居无定所。", jiXiong: "平", shiJian: ["旅行", "出差", "海外事务"], yiJi: ["安居置业"], source: "《大六壬大全·课经集》" },
  { name: "解离课", zongMen: "六十四课", xiangShen: "解离", keTi: "解离·干支分离", panMian: "干支相破或分离", duanYu: "分离之象，合作难成。解离课主散伙、离婚、合作破裂。", jiXiong: "凶", shiJian: ["放手", "独立", "新开始"], yiJi: ["合作", "续约", "结婚"], source: "《大六壬大全·课经集》" },
  { name: "乱首课", zongMen: "六十四课", xiangShen: "乱首", keTi: "乱首·干临支上", panMian: "日干临于支上或支上神克干", duanYu: "上下失序，主客颠倒。乱首课主局面混乱，需要重整秩序。", jiXiong: "凶", shiJian: ["重组", "整顿", "重新规划"], yiJi: ["贸然行事"], source: "《大六壬大全·课经集》" },
  { name: "赘婿课", zongMen: "六十四课", xiangShen: "赘婿", keTi: "赘婿·干加支上", panMian: "日干加于日支之上且受克", duanYu: "寄人篱下，需委曲求全。赘婿课主人屋檐下不得不低头。", jiXiong: "平", shiJian: ["忍耐", "依附强者", "借力发展"], yiJi: ["硬碰硬"], source: "《大六壬大全·课经集》" },
  { name: "度厄课", zongMen: "六十四课", xiangShen: "度厄", keTi: "度厄·三传内战", panMian: "三传内战或财爻受克", duanYu: "度过厄运，先难后易。度厄课主有惊无险，最终度过难关。", jiXiong: "先凶后吉", shiJian: ["坚持", "等待转机", "应对危机"], yiJi: ["仓促决策"], source: "《大六壬大全·课经集》" },
  { name: "无禄课", zongMen: "六十四课", xiangShen: "无禄", keTi: "无禄·四课无禄", panMian: "四课不见禄神", duanYu: "求财无路，谋事不成。无禄课主财运不佳，需另寻出路。", jiXiong: "凶", shiJian: ["保守理财", "节流", "低调行事"], yiJi: ["大额投资", "创业"], source: "《大六壬大全·课经集》" },
  { name: "绝嗣课", zongMen: "六十四课", xiangShen: "绝嗣", keTi: "绝嗣·四课不见子", panMian: "四课子孙爻绝伏", duanYu: "后继无人，事业无承。绝嗣课主难有继承人，团队人才流失。", jiXiong: "凶", shiJian: ["培养新人", "寻找接班人"], yiJi: ["扩张", "多元化"], source: "《大六壬大全·课经集》" },
  { name: "侵害课", zongMen: "六十四课", xiangShen: "侵害", keTi: "侵害·六害发用", panMian: "六害神发用或干支被克", duanYu: "受人侵害，损失难免。侵害课主被人暗算或因他人失误受损。", jiXiong: "凶", shiJian: ["防范风险", "保险", "法律维权"], yiJi: ["轻信他人"], source: "《大六壬大全·课经集》" },
  { name: "刑伤课", zongMen: "六十四课", xiangShen: "刑伤", keTi: "刑伤·三刑发用", panMian: "三刑发用或干支遭刑", duanYu: "刑伤官非，纠纷诉讼。刑伤课主法律纠纷、口舌是非、受伤。", jiXiong: "凶", shiJian: ["低调", "法律咨询", "避免冲突"], yiJi: ["诉讼", "争吵", "危险活动"], source: "《大六壬大全·课经集》" },
  { name: "二烦课", zongMen: "六十四课", xiangShen: "二烦", keTi: "二烦·日月宿加辰", panMian: "日月宿（房宿+昴宿）加临干支", duanYu: "心中烦乱，事多困扰。二烦课主心烦意乱，难以抉择。", jiXiong: "凶", shiJian: ["静心", "暂缓决策", "求教他人"], yiJi: ["匆忙决策"], source: "《大六壬大全·课经集》" },
  { name: "天狱课", zongMen: "六十四课", xiangShen: "天狱", keTi: "天狱·辰为天牢", panMian: "辰（天牢）或戌（地网）发用", duanYu: "牢狱之灾或困于一处。天狱课主身陷囹圄，行动受限。", jiXiong: "凶", shiJian: ["谨慎行事", "守法", "避免纠纷"], yiJi: ["违法乱纪"], source: "《大六壬大全·课经集》" },
  { name: "天祸课", zongMen: "六十四课", xiangShen: "天祸", keTi: "天祸·四立前辰", panMian: "四立（立春/夏/秋/冬）前一日，干支同位", duanYu: "天降灾祸，非人力可挡。天祸课主不可抗力，需顺天应人。", jiXiong: "大凶", shiJian: ["祈祷", "做最坏准备", "保险"], yiJi: ["冒险行事"], source: "《大六壬大全·课经集》" },
  { name: "天寇课", zongMen: "六十四课", xiangShen: "天寇", keTi: "天寇·四离日", panMian: "二分二至（春分/秋分/夏至/冬至）前一日", duanYu: "天寇盗气，运势衰竭。天寇课主元气大伤，需养精蓄锐。", jiXiong: "凶", shiJian: ["休养", "保守", "养精蓄锐"], yiJi: ["消耗性活动"], source: "《大六壬大全·课经集》" },
  // ═══════════ 《毕法赋》百条精选 ═══════════
  { name: "首尾相见始终宜", zongMen: "毕法赋", xiangShen: "初终", keTi: "初传与末传相生", panMian: "初传和末传相生或有情", duanYu: "做事善始善终，从头到尾皆宜。初末相生主项目可顺利推进。", jiXiong: "吉", shiJian: ["长期项目", "全周期计划"], yiJi: [], source: "《毕法赋》" },
  { name: "帘幕贵人高甲第", zongMen: "毕法赋", xiangShen: "贵人", keTi: "帘幕贵人临干", panMian: "夜贵（帘幕贵人）临日干", duanYu: "科举高中，面试成功。帘幕贵人主考试运佳，面试有好结果。", jiXiong: "吉", shiJian: ["考试", "面试", "竞聘"], yiJi: [], source: "《毕法赋》" },
  { name: "催官使者赴官期", zongMen: "毕法赋", xiangShen: "催官", keTi: "催官符星发用", panMian: "催官使者（驿马+官星）发用", duanYu: "升迁在即，官职有进。催官课主仕途进取，官职变动向好。", jiXiong: "吉", shiJian: ["升职", "调任", "仕途"], yiJi: [], source: "《毕法赋》" },
  { name: "六阳数足须公用", zongMen: "毕法赋", xiangShen: "六阳", keTi: "六阳·干支皆阳", panMian: "干支+四课上神六处皆阳", duanYu: "光明正大，宜公开发表。六阳课主阳谋取胜，光明正大行事。", jiXiong: "吉", shiJian: ["公开发表", "透明决策", "阳谋"], yiJi: ["密谋暗算"], source: "《毕法赋》" },
  { name: "六阴相继尽昏迷", zongMen: "毕法赋", xiangShen: "六阴", keTi: "六阴·干支皆阴", panMian: "干支+四课上神六处皆阴", duanYu: "昏暗不明，不宜行动。六阴课主迷雾重重，情况不明。", jiXiong: "凶", shiJian: ["暗中调查", "谨慎行事", "暂缓决策"], yiJi: ["公开行动"], source: "《毕法赋》" },
  { name: "旺禄临身徒妄作", zongMen: "毕法赋", xiangShen: "旺禄", keTi: "旺禄·禄神临日", panMian: "禄神旺相临日干", duanYu: "自有福禄，不必多求。旺禄临身主稳定收入，不必贪多。", jiXiong: "吉", shiJian: ["满意现状", "守成", "稳重行事"], yiJi: ["冒进", "跳槽"], source: "《毕法赋》" },
  { name: "权摄不正禄临支", zongMen: "毕法赋", xiangShen: "权摄", keTi: "权摄·禄临支上", panMian: "禄神不临日干而临日支", duanYu: "权柄旁落，大权不完全在握。禄临支主职务被架空。", jiXiong: "凶", shiJian: ["夺回实权", "慎重决策"], yiJi: ["辞职"], source: "《毕法赋》" },
  { name: "避难逃生须弃旧", zongMen: "毕法赋", xiangShen: "避难", keTi: "避难逃生·弃旧从新", panMian: "凶神克日，传中有救神", duanYu: "弃旧从新，方可脱困。避难课主换环境、换行业可解困局。", jiXiong: "先凶后吉", shiJian: ["跳槽", "搬家", "改变方向"], yiJi: ["固守旧业"], source: "《毕法赋》" },
  { name: "朽木难雕别作为", zongMen: "毕法赋", xiangShen: "朽木", keTi: "朽木难雕·旧事不可为", panMian: "木局受克或空亡", duanYu: "旧事无望，另辟蹊径。朽木课主原计划行不通，需彻底改弦更张。", jiXiong: "平", shiJian: ["创新", "转型", "另起炉灶"], yiJi: ["坚持旧方案"], source: "《毕法赋》" },
  { name: "众鬼虽彰全不畏", zongMen: "毕法赋", xiangShen: "众鬼", keTi: "众鬼不畏·子孙制鬼", panMian: "鬼爻虽多但有子孙爻制鬼", duanYu: "面对困难有化解之道。众鬼不畏主虽然有麻烦但有贵人化解。", jiXiong: "吉", shiJian: ["迎难而上", "向贵人求助"], yiJi: ["退缩"], source: "《毕法赋》" },
  { name: "虽忧狐假虎威仪", zongMen: "毕法赋", xiangShen: "狐假", keTi: "狐假虎威·借势", panMian: "日干弱而赖旺神相助", duanYu: "借人之力，狐假虎威。虽可借势但不可久恃，需自身强大。", jiXiong: "平", shiJian: ["借力", "合作借势", "短期策略"], yiJi: ["长期依赖他人"], source: "《毕法赋》" },
  { name: "鬼贼当时无畏忌", zongMen: "毕法赋", xiangShen: "鬼贼", keTi: "鬼贼·鬼临月建", panMian: "官鬼临月建旺相", duanYu: "权势正盛，对手强大。鬼贼当时主对手或困难处于最强状态。", jiXiong: "凶", shiJian: ["避其锋芒", "等待时机", "暂避"], yiJi: ["正面冲突"], source: "《毕法赋》" },
]

export function calculateDaLiuRenKeJing(input: {
  keyword?: string
  type?: string
}): DaLiuRenKeJingResult {
  let result = KE_TI

  if (input.type && input.type !== "全部") {
    result = result.filter(k => k.zongMen === input.type)
  }
  if (input.keyword) {
    const kw = input.keyword
    result = result.filter(k =>
      k.name.includes(kw) || k.keTi.includes(kw) || k.duanYu.includes(kw)
    )
  }

  // 分类统计
  const jiuZongMen = KE_TI.filter(k => ["元首","重审","知一","涉害","遥克","昴星","别责","八专","伏吟","反吟"].includes(k.zongMen)).length
  const liuShiSi = KE_TI.filter(k => k.zongMen === "六十四课").length
  const biFa = KE_TI.filter(k => k.zongMen === "毕法赋").length
  const jiCount = KE_TI.filter(k => k.jiXiong === "吉").length
  const banJiCount = KE_TI.filter(k => k.jiXiong === "半吉").length
  const xiongCount = KE_TI.filter(k => k.jiXiong.includes("凶")).length
  const pingCount = KE_TI.filter(k => k.jiXiong === "平").length

  const summary = result.length >= KE_TI.length
    ? [
        `┌─ 大六壬课经总览 ─────────────────`,
        `│ 共收录${KE_TI.length}种课体，分三大体系：`,
        `│ · 九宗门：${jiuZongMen}课 — 大六壬起课根本，定三传之纲`,
        `│ · 六十四课体：${liuShiSi}课 — 断课精髓，辨吉凶之要`,
        `│ · 毕法赋：${biFa}条 — 凌福之百条心法精选`,
        ``,
        `├─ 吉凶分布 ─────────────────`,
        `│ ★ 吉课：${jiCount} · 平课：${pingCount} · 凶课：${xiongCount}（含半吉${banJiCount}）`,
        ``,
        `├─ 每课体含 ─────────────────`,
        `│ 宗门·象神·课体·盘面·断语·吉凶·适宜·禁忌·出处`,
        ``,
        `├─ 古籍出处 ─────────────────`,
        `│ 《大六壬大全·课经集》：课经之祖，集六壬课体大成`,
        `│ 《毕法赋》：宋·凌福之著，百条断课心法`,
        `│ 《大六壬指南》：明·陈公献，六壬实战经典`,
        ``,
        `└─ 用法提示 ─────────────────`,
        `   可通过 type 筛选宗门（九宗门/六十四课/毕法赋），`,
        `   通过 keyword 搜索课名、课体或断语。`,
        `   具体课体解读需配合实际课盘综合判断。`,
      ].join("\n")
    : [
        `┌─ 大六壬课经：${input.type || "搜索"} ─────────────────`,
        `│ 筛选出${result.length}种课体`,
        ...result.slice(0, 5).map(k => `│ ${k.jiXiong === "吉" ? "★" : k.jiXiong.includes("凶") ? "⚠" : "·"} ${k.name}（${k.zongMen}）：${k.duanYu.slice(0, 30)}...`),
        result.length > 5 ? `│ ... 还有${result.length - 5}种课体未显示` : "",
        `│`,
        `└─ 共${result.length}条结果，请缩小筛选范围查看详情。`,
      ].filter(Boolean).join("\n")

  return { keTi: result, total: result.length, summary }
}

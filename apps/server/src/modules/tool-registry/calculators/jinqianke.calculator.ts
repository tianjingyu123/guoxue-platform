// ── 金钱课计算引擎 ──
// 铜钱摇卦 + 六十四卦完整爻辞

import type { JinQianKeResult, JinQianYao } from "@guoxue/shared";

// 六十四卦完整数据（含卦辞爻辞，参考周易原文）
type JiXiongStr = "大吉" | "吉" | "半吉" | "凶";
interface GuaFull {
  name: string; symbol: string; key: string; guaCi: string;
  shangGua: string; xiaGua: string; yaoCi: string[];
  jiXiong: JiXiongStr; shiYe: string; caiYun: string; ganQing: string;
}

// 阴阳爻编码：7=少阳(—), 8=少阴(--), 9=老阳(○动), 6=老阴(×动)
// key格式：6位数字，从初爻到上爻
const ALL_GUA_FULL: GuaFull[] = [
  {name:"乾为天",symbol:"䷀",key:"777777",shangGua:"乾",xiaGua:"乾",guaCi:"元亨利贞。",jiXiong:"大吉",shiYe:"事业蒸蒸日上，宜主动进取。",caiYun:"财运亨通，利于投资创业。",ganQing:"感情和谐，婚姻美满。",yaoCi:["潜龙勿用。","见龙在田，利见大人。","君子终日乾乾，夕惕若厉无咎。","或跃在渊，无咎。","飞龙在天，利见大人。","亢龙有悔。"]},
  {name:"坤为地",symbol:"䷁",key:"888888",shangGua:"坤",xiaGua:"坤",guaCi:"元亨，利牝马之贞。君子有攸往，先迷后得主。",jiXiong:"吉",shiYe:"稳步发展，宜守不宜攻。",caiYun:"财运平稳，积少成多。",ganQing:"温柔以待，家和万事兴。",yaoCi:["履霜坚冰至。","直方大，不习无不利。","含章可贞，或从王事无成有终。","括囊，无咎无誉。","黄裳元吉。","龙战于野，其血玄黄。"]},
  {name:"水雷屯",symbol:"䷂",key:"788878",shangGua:"坎",xiaGua:"震",guaCi:"元亨利贞，勿用有攸往，利建侯。",jiXiong:"半吉",shiYe:"起步困难，需耐心经营。",caiYun:"财运不显，勿急求成。",ganQing:"好事多磨，需坚守初心。",yaoCi:["磐桓，利居贞，利建侯。","屯如邅如，乘马班如。匪寇婚媾。","即鹿无虞，惟入于林中，君子几不如舍。","乘马班如，求婚媾，往吉无不利。","屯其膏，小贞吉，大贞凶。","乘马班如，泣血涟如。"]},
  {name:"山水蒙",symbol:"䷃",key:"877788",shangGua:"艮",xiaGua:"坎",guaCi:"亨，匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。",jiXiong:"半吉",shiYe:"适合学习进修，积累知识。",caiYun:"财运未开，宜投资自我。",ganQing:"感情懵懂，需真诚沟通。",yaoCi:["发蒙，利用刑人，用说桎梏。","包蒙吉，纳妇吉，子克家。","勿用取女，见金夫不有躬。","困蒙，吝。","童蒙，吉。","击蒙，不利为寇，利御寇。"]},
  {name:"水天需",symbol:"䷄",key:"787777",shangGua:"坎",xiaGua:"乾",guaCi:"有孚，光亨，贞吉，利涉大川。",jiXiong:"吉",shiYe:"需等待时机，不可强求。",caiYun:"财运将到未到，耐心等候。",ganQing:"好事需等待，莫急。",yaoCi:["需于郊，利用恒，无咎。","需于沙，小有言，终吉。","需于泥，致寇至。","需于血，出自穴。","需于酒食，贞吉。","入于穴，有不速之客三人来，敬之终吉。"]},
  {name:"天水讼",symbol:"䷅",key:"777878",shangGua:"乾",xiaGua:"坎",guaCi:"有孚窒惕，中吉，终凶。利见大人，不利涉大川。",jiXiong:"凶",shiYe:"易有纠纷，需谨慎行事。",caiYun:"财运受阻，防破财。",ganQing:"易有口角争执，需忍让。",yaoCi:["不永所事，小有言终吉。","不克讼，归而逋。","食旧德，贞厉终吉。","不克讼，复即命渝安贞吉。","讼，元吉。","或锡之鞶带，终朝三褫之。"]},
  {name:"地水师",symbol:"䷆",key:"888878",shangGua:"坤",xiaGua:"坎",guaCi:"贞，丈人吉，无咎。",jiXiong:"半吉",shiYe:"适合团队协作，统一行动。",caiYun:"财运需团队共创。",ganQing:"感情中需明确角色。",yaoCi:["师出以律，否臧凶。","在师中吉，无咎，王三锡命。","师或舆尸，凶。","师左次，无咎。","田有禽，利执言无咎。长子帅师。","大君有命，开国承家，小人勿用。"]},
  {name:"水地比",symbol:"䷇",key:"878888",shangGua:"坎",xiaGua:"坤",guaCi:"吉。原筮，元永贞，无咎。不宁方来，后夫凶。",jiXiong:"吉",shiYe:"得贵人相助，合作有利。",caiYun:"合作生财，互利共赢。",ganQing:"感情亲密，关系和睦。",yaoCi:["有孚比之，无咎。有孚盈缶，终来有它吉。","比之自内，贞吉。","比之匪人。","外比之，贞吉。","显比，王用三驱失前禽，邑人不诫吉。","比之无首，凶。"]},
  {name:"风天小畜",symbol:"䷈",key:"778777",shangGua:"巽",xiaGua:"乾",guaCi:"亨，密云不雨，自我西郊。",jiXiong:"半吉",shiYe:"积蓄力量，等待突破。",caiYun:"小有积蓄，不宜大投资。",ganQing:"感情需培养，勿急于求成。",yaoCi:["复自道，何其咎，吉。","牵复，吉。","舆说辐，夫妻反目。","有孚，血去惕出，无咎。","有孚挛如，富以其邻。","既雨既处，尚德载。妇贞厉。"]},
  {name:"天泽履",symbol:"䷉",key:"777887",shangGua:"乾",xiaGua:"兑",guaCi:"履虎尾，不咥人，亨。",jiXiong:"半吉",shiYe:"谨言慎行，循规蹈矩。",caiYun:"财运平平，稳守为上。",ganQing:"需知分寸，守礼而行。",yaoCi:["素履往，无咎。","履道坦坦，幽人贞吉。","眇能视，跛能履，履虎尾咥人凶。","履虎尾，愬愬终吉。","夬履，贞厉。","视履考祥，其旋元吉。"]},
  {name:"地天泰",symbol:"䷊",key:"888777",shangGua:"坤",xiaGua:"乾",guaCi:"小往大来，吉，亨。",jiXiong:"大吉",shiYe:"事业通达，上下同心。",caiYun:"财运亨通，利市三倍。",ganQing:"感情和谐，阴阳交融。",yaoCi:["拔茅茹，以其汇，征吉。","包荒，用冯河，不遐遗。","无平不陂，无往不复。艰贞无咎。","翩翩，不富以其邻。","帝乙归妹，以祉元吉。","城复于隍，勿用师。"]},
  {name:"天地否",symbol:"䷋",key:"777888",shangGua:"乾",xiaGua:"坤",guaCi:"否之匪人，不利君子贞，大往小来。",jiXiong:"凶",shiYe:"事业受阻，宜守不宜攻。",caiYun:"财运不济，防损失破耗。",ganQing:"沟通不畅，感情隔阂。",yaoCi:["拔茅茹，以其汇，贞吉亨。","包承，小人吉，大人否亨。","包羞。","有命无咎，畴离祉。","休否，大人吉。其亡其亡，系于苞桑。","倾否，先否后喜。"]},
  {name:"天火同人",symbol:"䷌",key:"777787",shangGua:"乾",xiaGua:"离",guaCi:"同人于野，亨。利涉大川，利君子贞。",jiXiong:"吉",shiYe:"合作顺利，团队和谐。",caiYun:"合伙生财，利益均沾。",ganQing:"志趣相投，感情融洽。",yaoCi:["同人于门，无咎。","同人于宗，吝。","伏戎于莽，升其高陵，三岁不兴。","乘其墉，弗克攻，吉。","同人先号啕而后笑。","同人于郊，无悔。"]},
  {name:"火天大有",symbol:"䷍",key:"787777",shangGua:"离",xiaGua:"乾",guaCi:"元亨。",jiXiong:"大吉",shiYe:"事业丰收，大有作为。",caiYun:"财运极佳，收获丰厚。",ganQing:"感情圆满，幸福美满。",yaoCi:["无交害，匪咎，艰则无咎。","大车以载，有攸往无咎。","公用亨于天子，小人弗克。","匪其彭，无咎。","厥孚交如，威如吉。","自天祐之，吉无不利。"]},
  {name:"地山谦",symbol:"䷎",key:"888788",shangGua:"坤",xiaGua:"艮",guaCi:"亨，君子有终。",jiXiong:"大吉",shiYe:"谦和处世，事业有成。",caiYun:"财运平稳，知足常乐。",ganQing:"谦虚礼让，感情和谐。",yaoCi:["谦谦君子，用涉大川吉。","鸣谦，贞吉。","劳谦君子，有终吉。","无不利，撝谦。","不富以其邻，利用侵伐。","鸣谦，利用行师征邑国。"]},
  {name:"雷地豫",symbol:"䷏",key:"788888",shangGua:"震",xiaGua:"坤",guaCi:"利建侯行师。",jiXiong:"吉",shiYe:"顺势而为，开拓进取。",caiYun:"财运顺遂，可大胆投资。",ganQing:"欢乐和谐，喜事临门。",yaoCi:["鸣豫，凶。","介于石，不终日，贞吉。","盱豫悔，迟有悔。","由豫，大有得，勿疑朋盍簪。","贞疾，恒不死。","冥豫，成有渝无咎。"]},
  {name:"泽雷随",symbol:"䷐",key:"887788",shangGua:"兑",xiaGua:"震",guaCi:"元亨利贞，无咎。",jiXiong:"吉",shiYe:"随机应变，灵活处世。",caiYun:"财运随缘，不强求而自得。",ganQing:"随缘而行，感情自然。",yaoCi:["官有渝，贞吉。出门交有功。","系小子，失丈夫。","系丈夫，失小子。随有求得。","随有获，贞凶。有孚在道以明。","孚于嘉，吉。","拘系之，乃从维之，王用亨于西山。"]},
  {name:"山风蛊",symbol:"䷑",key:"788778",shangGua:"艮",xiaGua:"巽",guaCi:"元亨，利涉大川。先甲三日，后甲三日。",jiXiong:"半吉",shiYe:"整顿内部，革除弊病。",caiYun:"财运需重整，清理旧账。",ganQing:"感情有隐患需面对。",yaoCi:["干父之蛊，有子考无咎。厉终吉。","干母之蛊，不可贞。","干父之蛊，小有悔无大咎。","裕父之蛊，往见吝。","干父之蛊，用誉。","不事王侯，高尚其事。"]},
  {name:"地泽临",symbol:"䷒",key:"888887",shangGua:"坤",xiaGua:"兑",guaCi:"元亨利贞，至于八月有凶。",jiXiong:"半吉",shiYe:"亲临一线，深入了解。",caiYun:"财运渐进，需把握时机。",ganQing:"感情亲密，但需防变。",yaoCi:["咸临，贞吉。","咸临，吉无不利。","甘临，无攸利。既忧之无咎。","至临，无咎。","知临，大君之宜吉。","敦临，吉无咎。"]},
  {name:"风地观",symbol:"䷓",key:"778888",shangGua:"巽",xiaGua:"坤",guaCi:"盥而不荐，有孚颙若。",jiXiong:"半吉",shiYe:"观察形势，谋定后动。",caiYun:"财运观望为宜。",ganQing:"感情需互相观察了解。",yaoCi:["童观，小人无咎君子吝。","窥观，利女贞。","观我生进退。","观国之光，利用宾于王。","观我生，君子无咎。","观其生，君子无咎。"]},
  {name:"火雷噬嗑",symbol:"䷔",key:"787788",shangGua:"离",xiaGua:"震",guaCi:"亨，利用狱。",jiXiong:"半吉",shiYe:"果断决策，排除障碍。",caiYun:"财运待破而后立。",ganQing:"感情需排除误解和障碍。",yaoCi:["屦校灭趾，无咎。","噬肤灭鼻，无咎。","噬腊肉遇毒，小吝无咎。","噬干胏得金矢，利艰贞吉。","噬干肉得黄金，贞厉无咎。","何校灭耳，凶。"]},
  {name:"山火贲",symbol:"䷕",key:"788787",shangGua:"艮",xiaGua:"离",guaCi:"亨，小利有攸往。",jiXiong:"半吉",shiYe:"注重外在形象包装。",caiYun:"小利可图，大利难求。",ganQing:"感情需用心经营。",yaoCi:["贲其趾，舍车而徒。","贲其须。","贲如濡如，永贞吉。","贲如皤如，白马翰如。匪寇婚媾。","贲于丘园，束帛戋戋。吝终吉。","白贲，无咎。"]},
  {name:"山地剥",symbol:"䷖",key:"788888",shangGua:"艮",xiaGua:"坤",guaCi:"不利有攸往。",jiXiong:"凶",shiYe:"事业滑坡，需稳住阵脚。",caiYun:"财运剥落，慎防损失。",ganQing:"感情可能出现裂痕。",yaoCi:["剥床以足，蔑贞凶。","剥床以辨，蔑贞凶。","剥之无咎。","剥床以肤，凶。","贯鱼以宫人宠，无不利。","硕果不食，君子得舆，小人剥庐。"]},
  {name:"地雷复",symbol:"䷗",key:"888788",shangGua:"坤",xiaGua:"震",guaCi:"亨，出入无疾，朋来无咎。反复其道，七日来复。",jiXiong:"吉",shiYe:"事业复苏，转机出现。",caiYun:"财运好转，渐入佳境。",ganQing:"感情回暖，破镜可圆。",yaoCi:["不远复，无祗悔，元吉。","休复，吉。","频复，厉无咎。","中行独复。","敦复，无悔。","迷复，凶有灾眚。用行师终有大败。"]},
  {name:"天雷无妄",symbol:"䷘",key:"777788",shangGua:"乾",xiaGua:"震",guaCi:"元亨利贞。其匪正有眚，不利有攸往。",jiXiong:"半吉",shiYe:"脚踏实地，不投机取巧。",caiYun:"财运真实可靠。",ganQing:"真心相待，不虚情假意。",yaoCi:["无妄往，吉。","不耕获不菑畲，则利有攸往。","无妄之灾，或系之牛。","可贞无咎。","无妄之疾，勿药有喜。","无妄行，有眚无攸利。"]},
  {name:"山天大畜",symbol:"䷙",key:"788777",shangGua:"艮",xiaGua:"乾",guaCi:"利贞。不家食吉，利涉大川。",jiXiong:"吉",shiYe:"积蓄实力，厚积薄发。",caiYun:"财源广进，蓄积有方。",ganQing:"感情深厚，稳重可靠。",yaoCi:["有厉利已。","舆说輹。","良马逐，利艰贞。","童牛之牿，元吉。","豮豕之牙，吉。","何天之衢，亨。"]},
  {name:"山雷颐",symbol:"䷚",key:"788788",shangGua:"艮",xiaGua:"震",guaCi:"贞吉。观颐，自求口实。",jiXiong:"半吉",shiYe:"养精蓄锐，积蓄能量。",caiYun:"财运稳定，自食其力。",ganQing:"感情需用心滋养。",yaoCi:["舍尔灵龟，观我朵颐凶。","颠颐拂经，征凶。","拂颐，贞凶。十年勿用。","颠颐吉。虎视眈眈，其欲逐逐。","拂经，居贞吉。不可涉大川。","由颐，厉吉，利涉大川。"]},
  {name:"泽风大过",symbol:"䷛",key:"887778",shangGua:"兑",xiaGua:"巽",guaCi:"栋桡，利有攸往，亨。",jiXiong:"凶",shiYe:"独立担当，力挽狂澜。",caiYun:"财运大起大落，需独立判断。",ganQing:"感情独立自强。",yaoCi:["藉用白茅，无咎。","枯杨生稊，老夫得其女妻无不利。","栋桡，凶。","栋隆，吉。有它吝。","枯杨生华，老妇得其士夫。","过涉灭顶，凶无咎。"]},
  {name:"坎为水",symbol:"䷜",key:"878878",shangGua:"坎",xiaGua:"坎",guaCi:"习坎，有孚，维心亨，行有尚。",jiXiong:"凶",shiYe:"面临困难，需保持信心。",caiYun:"财运险中有机，谨慎把握。",ganQing:"感情经历考验，真心不改。",yaoCi:["习坎，入于坎窞凶。","坎有险，求小得。","来之坎坎，险且枕，入于坎窞勿用。","樽酒簋贰，用缶纳约自牖，终无咎。","坎不盈，祗既平无咎。","系用徽纆，置于丛棘，三岁不得凶。"]},
  {name:"离为火",symbol:"䷝",key:"787787",shangGua:"离",xiaGua:"离",guaCi:"利贞，亨。畜牝牛吉。",jiXiong:"吉",shiYe:"依附明主，借力发展。",caiYun:"财运光明，前景看好。",ganQing:"感情热烈真挚，相互依恋。",yaoCi:["履错然，敬之无咎。","黄离，元吉。","日昃之离，不鼓缶而歌则大耋之嗟凶。","突如其来如，焚如死如弃如。","出涕沱若，戚嗟若吉。","王用出征，有嘉折首。"]},
  {name:"泽山咸",symbol:"䷞",key:"887788",shangGua:"兑",xiaGua:"艮",guaCi:"亨利贞，取女吉。",jiXiong:"吉",shiYe:"感应市场需求，灵活调整。",caiYun:"财运随感而应，灵活机动。",ganQing:"心灵感应，情投意合。",yaoCi:["咸其拇。","咸其腓，凶居吉。","咸其股，执其随往吝。","贞吉悔亡。憧憧往来，朋从尔思。","咸其脢，无悔。","咸其辅颊舌。"]},
  {name:"雷风恒",symbol:"䷟",key:"788778",shangGua:"震",xiaGua:"巽",guaCi:"亨，无咎，利贞，利有攸往。",jiXiong:"吉",shiYe:"持之以恒，稳定发展。",caiYun:"财运稳定增长。",ganQing:"感情长久，白头偕老。",yaoCi:["浚恒，贞凶无攸利。","悔亡。","不恒其德，或承之羞贞吝。","田无禽。","恒其德贞，妇人吉夫子凶。","振恒，凶。"]},
  {name:"天山遁",symbol:"䷠",key:"777788",shangGua:"乾",xiaGua:"艮",guaCi:"亨，小利贞。",jiXiong:"半吉",shiYe:"暂时退让，以退为进。",caiYun:"财运宜保守，不必强求。",ganQing:"保持距离，给彼此空间。",yaoCi:["遁尾厉，勿用有攸往。","执之用黄牛之革。","系遁，有疾厉，畜臣妾吉。","好遁，君子吉小人否。","嘉遁，贞吉。","肥遁，无不利。"]},
  {name:"雷天大壮",symbol:"䷡",key:"788777",shangGua:"震",xiaGua:"乾",guaCi:"利贞。",jiXiong:"半吉",shiYe:"事业壮大，强势推进。",caiYun:"财运旺盛，但需守正道。",ganQing:"感情热烈，避免过刚。",yaoCi:["壮于趾，征凶有孚。","贞吉。","小人用壮，君子用罔。贞厉。","贞吉悔亡。藩决不羸。","丧羊于易，无悔。","羝羊触藩，不能退不能遂。"]},
  {name:"火地晋",symbol:"䷢",key:"787888",shangGua:"离",xiaGua:"坤",guaCi:"康侯用锡马蕃庶，昼日三接。",jiXiong:"吉",shiYe:"事业进步，晋升有望。",caiYun:"财运上升，日进斗金。",ganQing:"感情升温，关系进展。",yaoCi:["晋如摧如，贞吉。罔孚裕无咎。","晋如愁如，贞吉。受兹介福于其王母。","众允，悔亡。","晋如鼫鼠，贞厉。","悔亡，失得勿恤。往吉无不利。","晋其角，维用伐邑。厉吉无咎。"]},
  {name:"地火明夷",symbol:"䷣",key:"888787",shangGua:"坤",xiaGua:"离",guaCi:"利艰贞。",jiXiong:"凶",shiYe:"事业黑暗期，需隐忍待机。",caiYun:"财运暗昧，防暗中损失。",ganQing:"感情蒙上阴影。",yaoCi:["明夷于飞，垂其翼。君子于行，三日不食。","明夷夷于左股，用拯马壮吉。","明夷于南狩，得其大首。","入于左腹，获明夷之心。","箕子之明夷，利贞。","不明晦，初登于天后入于地。"]},
  {name:"风火家人",symbol:"䷤",key:"778787",shangGua:"巽",xiaGua:"离",guaCi:"利女贞。",jiXiong:"吉",shiYe:"适合家族事业，内部管理。",caiYun:"财运稳定，家用有余。",ganQing:"家庭和睦，夫妻情深。",yaoCi:["闲有家，悔亡。","无攸遂，在中馈贞吉。","家人嗃嗃，悔厉吉。妇子嘻嘻终吝。","富家，大吉。","王假有家，勿恤吉。","有孚威如，终吉。"]},
  {name:"火泽睽",symbol:"䷥",key:"787887",shangGua:"离",xiaGua:"兑",guaCi:"小事吉。",jiXiong:"凶",shiYe:"意见分歧，需求同存异。",caiYun:"财运分歧，需协调各方。",ganQing:"感情出现分歧。",yaoCi:["悔亡。丧马勿逐自复。见恶人无咎。","遇主于巷，无咎。","见舆曳其牛掣，其人天且劓。","睽孤，遇元夫。交孚厉无咎。","悔亡。厥宗噬肤，往何咎。","睽孤，见豕负涂载鬼一车。往遇雨则吉。"]},
  {name:"水山蹇",symbol:"䷦",key:"878788",shangGua:"坎",xiaGua:"艮",guaCi:"利西南，不利东北。利见大人，贞吉。",jiXiong:"凶",shiYe:"前进困难，需调整方向。",caiYun:"财运艰难，需克服困难。",ganQing:"感情面临阻碍。",yaoCi:["往蹇来誉。","王臣蹇蹇，匪躬之故。","往蹇来反。","往蹇来连。","大蹇朋来。","往蹇来硕，吉。利见大人。"]},
  {name:"雷水解",symbol:"䷧",key:"788878",shangGua:"震",xiaGua:"坎",guaCi:"利西南。无所往，其来复吉。有攸往夙吉。",jiXiong:"吉",shiYe:"困难解除，柳暗花明。",caiYun:"财运解冻，资金回笼。",ganQing:"误会解除，感情回温。",yaoCi:["无咎。","田获三狐，得黄矢贞吉。","负且乘，致寇至贞吝。","解而拇，朋至斯孚。","君子维有解，吉。有孚于小人。","公用射隼于高墉之上，获之无不利。"]},
  {name:"山泽损",symbol:"䷨",key:"788887",shangGua:"艮",xiaGua:"兑",guaCi:"有孚，元吉，无咎，可贞，利有攸往。",jiXiong:"半吉",shiYe:"适当减损，去芜存菁。",caiYun:"财运有损，需节制开支。",ganQing:"感情需适当妥协让步。",yaoCi:["已事遄往，无咎。酌损之。","利贞，征凶。弗损益之。","三人行则损一人。","损其疾，使遄有喜无咎。","或益之十朋之龟，弗克违元吉。","弗损益之，无咎。贞吉。"]},
  {name:"风雷益",symbol:"䷩",key:"778788",shangGua:"巽",xiaGua:"震",guaCi:"利有攸往，利涉大川。",jiXiong:"吉",shiYe:"事业得益，蒸蒸日上。",caiYun:"财运增益，收入增加。",ganQing:"感情增进，关系加深。",yaoCi:["利用为大作，元吉无咎。","或益之十朋之龟，弗克违。","益之用凶事，无咎。有孚中行。","中行告公从，利用为依迁国。","有孚惠心，勿问元吉。","莫益之，或击之。立心勿恒凶。"]},
  {name:"泽天夬",symbol:"䷪",key:"887777",shangGua:"兑",xiaGua:"乾",guaCi:"扬于王庭，孚号有厉。告自邑，不利即戎。",jiXiong:"凶",shiYe:"果断决策，当断则断。",caiYun:"财运需果断，犹豫则失。",ganQing:"感情需做出决断。",yaoCi:["壮于前趾，往不胜为咎。","惕号，莫夜有戎勿恤。","壮于頄有凶。君子夬夬独行遇雨。","臀无肤，其行次且。牵羊悔亡。","苋陆夬夬，中行无咎。","无号，终有凶。"]},
  {name:"天风姤",symbol:"䷫",key:"777778",shangGua:"乾",xiaGua:"巽",guaCi:"女壮，勿用取女。",jiXiong:"凶",shiYe:"意外机遇，需谨慎把握。",caiYun:"财运偶遇，但需防风险。",ganQing:"偶遇缘分，但勿用取女。",yaoCi:["系于金柅，贞吉。有攸往见凶。","包有鱼，无咎。不利宾。","臀无肤，其行次且。厉无大咎。","包无鱼，起凶。","以杞包瓜，含章有陨自天。","姤其角，吝无咎。"]},
  {name:"泽地萃",symbol:"䷬",key:"887888",shangGua:"兑",xiaGua:"坤",guaCi:"亨，王假有庙。利见大人，亨利贞。",jiXiong:"吉",shiYe:"人才聚集，事业兴旺。",caiYun:"财源聚集，八方来财。",ganQing:"感情凝聚，心心相印。",yaoCi:["有孚不终，乃乱乃萃。若号一握为笑。","引吉无咎。孚乃利用禴。","萃如嗟如，无攸利。往无咎小吝。","大吉无咎。","萃有位，无咎。匪孚元永贞悔亡。","赍咨涕洟，无咎。"]},
  {name:"地风升",symbol:"䷭",key:"888778",shangGua:"坤",xiaGua:"巽",guaCi:"元亨，用见大人，勿恤。南征吉。",jiXiong:"大吉",shiYe:"事业上升，步步高升。",caiYun:"财运上升，持续增长。",ganQing:"感情升温，关系提升。",yaoCi:["允升，大吉。","孚乃利用禴，无咎。","升虚邑。","王用亨于岐山，吉无咎。","贞吉，升阶。","冥升，利于不息之贞。"]},
  {name:"泽水困",symbol:"䷮",key:"887878",shangGua:"兑",xiaGua:"坎",guaCi:"亨，贞大人吉，无咎。有言不信。",jiXiong:"凶",shiYe:"事业困顿，需耐心坚守。",caiYun:"财运困窘，资金紧张。",ganQing:"感情陷入困境。",yaoCi:["臀困于株木，入于幽谷三岁不觌。","困于酒食，朱绂方来。","困于石，据于蒺藜。入于其宫不见其妻凶。","来徐徐，困于金车，吝有终。","劓刖，困于赤绂。乃徐有说。","困于葛藟，于臲兀。曰动悔有悔。"]},
  {name:"水风井",symbol:"䷯",key:"878778",shangGua:"坎",xiaGua:"巽",guaCi:"改邑不改井，无丧无得。往来井井。",jiXiong:"半吉",shiYe:"事业根基稳固。",caiYun:"财运稳定，细水长流。",ganQing:"感情如井水，清冽甘甜。",yaoCi:["井泥不食，旧井无禽。","井谷射鲋，瓮敝漏。","井渫不食，为我心恻。可用汲。","井甃，无咎。","井洌，寒泉食。","井收勿幕，有孚元吉。"]},
  {name:"泽火革",symbol:"䷰",key:"887787",shangGua:"兑",xiaGua:"离",guaCi:"己日乃孚，元亨利贞，悔亡。",jiXiong:"半吉",shiYe:"事业变革，除旧布新。",caiYun:"财运变中求新，革新有利。",ganQing:"感情可能出现变化。",yaoCi:["巩用黄牛之革。","己日乃革之，征吉无咎。","征凶贞厉。革言三就有孚。","悔亡，有孚改命吉。","大人虎变，未占有孚。","君子豹变，小人革面。"]},
  {name:"火风鼎",symbol:"䷱",key:"787778",shangGua:"离",xiaGua:"巽",guaCi:"元吉，亨。",jiXiong:"大吉",shiYe:"事业鼎盛，气象万千。",caiYun:"财运亨通，鼎盛之时。",ganQing:"感情稳定如鼎。",yaoCi:["鼎颠趾，利出否。得妾以其子无咎。","鼎有实，我仇有疾不我能即吉。","鼎耳革，其行塞。","鼎折足，覆公餗凶。","鼎黄耳金铉，利贞。","鼎玉铉，大吉无不利。"]},
  {name:"震为雷",symbol:"䷲",key:"788788",shangGua:"震",xiaGua:"震",guaCi:"亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。",jiXiong:"半吉",shiYe:"突发变故，需冷静应对。",caiYun:"财运震荡，需稳住阵脚。",ganQing:"感情有突发变故。",yaoCi:["震来虩虩，后笑言哑哑吉。","震来厉，亿丧贝。跻于九陵勿逐七日得。","震苏苏，震行无眚。","震遂泥。","震往来厉，亿无丧有事。","震索索，视矍矍征凶。"]},
  {name:"艮为山",symbol:"䷳",key:"788788",shangGua:"艮",xiaGua:"艮",guaCi:"艮其背，不获其身。行其庭，不见其人。无咎。",jiXiong:"半吉",shiYe:"守成时期，不宜冒进。",caiYun:"财运止步，宜保持现状。",ganQing:"感情稳定，知止不殆。",yaoCi:["艮其趾，无咎利永贞。","艮其腓，不拯其随。","艮其限，列其夤厉薰心。","艮其身，无咎。","艮其辅，言有序悔亡。","敦艮，吉。"]},
  {name:"风山渐",symbol:"䷴",key:"778788",shangGua:"巽",xiaGua:"艮",guaCi:"女归吉，利贞。",jiXiong:"吉",shiYe:"事业渐进，稳扎稳打。",caiYun:"财运渐进式增长。",ganQing:"感情循序渐进。",yaoCi:["鸿渐于干，小子厉有言无咎。","鸿渐于磐，饮食衎衎吉。","鸿渐于陆，夫征不复妇孕不育凶。","鸿渐于木，或得其桷无咎。","鸿渐于陵，妇三岁不孕终莫之胜吉。","鸿渐于逵，其羽可用为仪吉。"]},
  {name:"雷泽归妹",symbol:"䷵",key:"788887",shangGua:"震",xiaGua:"兑",guaCi:"征凶，无攸利。",jiXiong:"凶",shiYe:"合作关系需注意条款。",caiYun:"财运因合作变动。",ganQing:"婚姻感情有波折。",yaoCi:["归妹以娣，跛能履征吉。","眇能视，利幽人之贞。","归妹以须，反归以娣。","归妹愆期，迟归有时。","帝乙归妹，其君之袂不如其娣。","女承筐无实，士刲羊无血。"]},
  {name:"雷火丰",symbol:"䷶",key:"788787",shangGua:"震",xiaGua:"离",guaCi:"亨，王假之。勿忧，宜日中。",jiXiong:"吉",shiYe:"事业丰盛，如日中天。",caiYun:"财运丰厚，收益可观。",ganQing:"感情丰富多彩。",yaoCi:["遇其配主，虽旬无咎往有尚。","丰其蔀，日中见斗。往得疑疾。","丰其沛，日中见沬。折其右肱无咎。","丰其蔀，日中见斗。遇其夷主吉。","来章，有庆誉吉。","丰其屋，蔀其家。三岁不觌凶。"]},
  {name:"火山旅",symbol:"䷷",key:"787788",shangGua:"离",xiaGua:"艮",guaCi:"小亨，旅贞吉。",jiXiong:"半吉",shiYe:"事业在外，奔波劳碌。",caiYun:"财运在外，旅途获利。",ganQing:"感情如旅途，聚散有时。",yaoCi:["旅琐琐，斯其所取灾。","旅即次，怀其资得童仆贞。","旅焚其次，丧其童仆贞厉。","旅于处，得其资斧我心不快。","射雉一矢亡，终以誉命。","鸟焚其巢，旅人先笑后号啕。"]},
  {name:"巽为风",symbol:"䷸",key:"778778",shangGua:"巽",xiaGua:"巽",guaCi:"小亨，利有攸往，利见大人。",jiXiong:"半吉",shiYe:"顺势而为，服从大局。",caiYun:"财运随风而入。",ganQing:"温柔顺从，以柔克刚。",yaoCi:["进退，利武人之贞。","巽在床下，用史巫纷若吉无咎。","频巽，吝。","悔亡，田获三品。","贞吉悔亡无不利。无初有终。","巽在床下，丧其资斧贞凶。"]},
  {name:"兑为泽",symbol:"䷹",key:"887887",shangGua:"兑",xiaGua:"兑",guaCi:"亨利贞。",jiXiong:"吉",shiYe:"事业喜悦，人际和谐。",caiYun:"财运喜人，收获可喜。",ganQing:"感情喜悦，相处愉快。",yaoCi:["和兑，吉。","孚兑，吉悔亡。","来兑，凶。","商兑未宁，介疾有喜。","孚于剥，有厉。","引兑。"]},
  {name:"风水涣",symbol:"䷺",key:"778878",shangGua:"巽",xiaGua:"坎",guaCi:"亨，王假有庙。利涉大川，利贞。",jiXiong:"半吉",shiYe:"团队涣散需重新凝聚。",caiYun:"财运分散，需集中管理。",ganQing:"感情涣散需重新凝聚。",yaoCi:["用拯马壮吉。","涣奔其机，悔亡。","涣其躬，无悔。","涣其群，元吉。涣有丘匪夷所思。","涣汗其大号，涣王居无咎。","涣其血，去逖出无咎。"]},
  {name:"水泽节",symbol:"䷻",key:"878887",shangGua:"坎",xiaGua:"兑",guaCi:"亨，苦节不可贞。",jiXiong:"半吉",shiYe:"适度节制，张弛有度。",caiYun:"财运需节制，量入为出。",ganQing:"感情需适度克制。",yaoCi:["不出户庭，无咎。","不出门庭，凶。","不节若，则嗟若无咎。","安节，亨。","甘节，吉。往有尚。","苦节，贞凶悔亡。"]},
  {name:"风泽中孚",symbol:"䷼",key:"778887",shangGua:"巽",xiaGua:"兑",guaCi:"豚鱼吉，利涉大川，利贞。",jiXiong:"吉",shiYe:"诚信经营，赢得信任。",caiYun:"财运以诚信为本。",ganQing:"感情真诚，心心相印。",yaoCi:["虞吉，有它不燕。","鸣鹤在阴，其子和之。我有好爵吾与尔靡之。","得敌，或鼓或罢或泣或歌。","月几望，马匹亡无咎。","有孚挛如，无咎。","翰音登于天，贞凶。"]},
  {name:"雷山小过",symbol:"䷽",key:"788788",shangGua:"震",xiaGua:"艮",guaCi:"亨利贞。可小事，不可大事。",jiXiong:"半吉",shiYe:"小事可为，大事需谨慎。",caiYun:"财运小事可图。",ganQing:"感情有小摩擦无大碍。",yaoCi:["飞鸟以凶。","过其祖，遇其妣。不及其君遇其臣。","弗过防之，从或戕之凶。","无咎。弗过遇之，往厉必戒。","密云不雨，自我西郊。","弗遇过之，飞鸟离之凶。"]},
  {name:"水火既济",symbol:"䷾",key:"878787",shangGua:"坎",xiaGua:"离",guaCi:"亨小，利贞。初吉终乱。",jiXiong:"半吉",shiYe:"事业初成，防后续问题。",caiYun:"财运初吉，需防风险。",ganQing:"感情已定，需维系经营。",yaoCi:["曳其轮，濡其尾无咎。","妇丧其茀，勿逐七日得。","高宗伐鬼方，三年克之。","繻有衣袽，终日戒。","东邻杀牛不如西邻禴祭。","濡其首，厉。"]},
  {name:"火水未济",symbol:"䷿",key:"787878",shangGua:"离",xiaGua:"坎",guaCi:"亨，小狐汔济，濡其尾，无攸利。",jiXiong:"半吉",shiYe:"事业未成，仍需努力。",caiYun:"财运未至，继续积累。",ganQing:"感情未定，需继续发展。",yaoCi:["濡其尾，吝。","曳其轮，贞吉。","未济，征凶。利涉大川。","贞吉悔亡。震用伐鬼方三年有赏。","贞吉无悔。君子之光有孚吉。","有孚于饮酒无咎。濡其首有孚失是。"]},
];

// 铜钱与爻的转换
function coinToYao(ziCount: number): { yaoType: string; isDong: boolean; symbol: string } {
  switch (ziCount) {
    case 3: return { yaoType:"老阳", isDong:true, symbol:"⚊" };
    case 2: return { yaoType:"少阳", isDong:false, symbol:"⚊" };
    case 1: return { yaoType:"少阴", isDong:false, symbol:"⚋" };
    case 0: return { yaoType:"老阴", isDong:true, symbol:"⚋" };
    default: return { yaoType:"少阳", isDong:false, symbol:"⚊" };
  }
}

/** 根据六爻编码查找卦 */
function findGua(yangCodes: number[]): GuaFull {
  const key = yangCodes.map(c => c === 7 || c === 9 ? "7" : "8").join("");
  for (const g of ALL_GUA_FULL) {
    if (g.key === key) return g;
  }
  return ALL_GUA_FULL[0];
}

/** 主计算函数 */
export function calculateJinQianKe(input: Record<string, unknown>): JinQianKeResult {
  const method = (input.method as string) ?? "random";
  const datetime = input.datetime as string ?? new Date().toISOString();

  const yaos: JinQianYao[] = [];
  const d = new Date(datetime);
  const seed = d.getTime();

  const yangCodes: number[] = [];
  for (let i = 0; i < 6; i++) {
    let ziCount: number;
    if (method === "random") {
      ziCount = ((seed >> (i * 8)) & 3);
    } else if (method === "baoshu" && input.numbers) {
      const nums = input.numbers as [number, number];
      ziCount = ((nums[0] + nums[1] + i) % 4);
    } else {
      ziCount = Math.floor(Math.random() * 4);
    }
    const { yaoType, isDong, symbol } = coinToYao(ziCount);
    const code = isDong ? (yaoType === "老阳" ? 9 : 6) : (yaoType === "少阳" ? 7 : 8);
    yangCodes.push(code);

    yaos.push({
      position: i + 1,
      coins: ["zi","zi","zi"],
      ziCount,
      yaoType: yaoType as any,
      isDong,
      symbol: symbol as any,
      bianSymbol: isDong ? (yaoType === "老阳" ? "⚋" : "⚊") as any : undefined,
    });
  }

  const benGua = findGua(yangCodes);

  // 变卦
  let bianGua: any = undefined;
  const hasDong = yaos.some(y => y.isDong);
  if (hasDong) {
    const bianCodes = yangCodes.map((c, i) => {
      if (yaos[i].isDong) return c === 9 ? 8 : (c === 6 ? 7 : c);
      return c;
    });
    bianGua = findGua(bianCodes);
  }

  // 互卦
  const huCodes = [yangCodes[1], yangCodes[2], yangCodes[3], yangCodes[2], yangCodes[3], yangCodes[4]];
  const huGua = findGua(huCodes);

  // 动爻爻辞（取第一动爻的爻辞）
  const dongYaoCi = yaos.filter(y => y.isDong).map(y => {
    const yaoIdx = y.position - 1;
    return {
      position: y.position,
      yaoCi: (benGua.yaoCi && benGua.yaoCi[yaoIdx]) ? benGua.yaoCi[yaoIdx] : `爻位${y.position}，${y.yaoType}动。`,
    };
  });

  const dongCount = yaos.filter(y => y.isDong).length;
  const duanYu = `本卦${benGua.name}${benGua.symbol}，${dongCount > 0 ? `${dongCount}爻动${bianGua ? "变" + bianGua.name : ""}。` : "静卦，以本卦卦辞为断。"}${benGua.guaCi}`;

  return {
    input: { datetime, method: method as any },
    yaos,
    benGua: { name: benGua.name, symbol: benGua.symbol, guaCi: benGua.guaCi, shangGua: benGua.shangGua, xiaGua: benGua.xiaGua },
    bianGua,
    huGua: { name: huGua.name, symbol: huGua.symbol },
    dongYaoCi,
    duanGua: {
      tiYong: "以卦论体用",
      shiYing: dongCount > 0 ? "动变之间见吉凶" : "静观其变",
      dongJing: dongCount > 3 ? "动多变数大" : "动静相宜",
      jiXiong: (benGua.jiXiong === "大吉" ? "吉" : benGua.jiXiong === "半吉" ? "平" : benGua.jiXiong) as "吉" | "凶" | "平",
    },
    duanYu,
  };
}

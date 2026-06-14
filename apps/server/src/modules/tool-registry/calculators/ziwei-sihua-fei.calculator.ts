// ── 紫微四化飞星计算引擎 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
import type { ZiweiSihuaFeiResult, SiHuaFeiXingItem } from "@guoxue/shared"

const FEI_XING: SiHuaFeiXingItem[] = [
  // ═══════════ 命宫自化 ═══════════
  { gongWei: "命宫", xingYao: "紫微", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "命宫自化禄", detailed: "自化禄出，自身福泽旺但易散，需修心守成。紫微为帝星自化禄，主天生福气但易骄傲自满，需谦卑待人方能长久", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "紫微", huaType: "权", direction: "自化", targetGong: "命宫", meaning: "命宫自化权", detailed: "自化权出，能力强但霸道，管理能力突出但需防独断专行。紫微自化权主领导才能外显，但容易得罪人", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "紫微", huaType: "科", direction: "自化", targetGong: "命宫", meaning: "命宫自化科", detailed: "自化科出，名声在外但易虚名。紫微自化科主贵气名声，但需实际能力支撑，否则名声易损", jiXiong: "平" },
  { gongWei: "命宫", xingYao: "天机", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "天机自化禄", detailed: "智谋出众但心思不定，需定心一处方能成就。天机为智慧星自化禄主聪明外露但容易变换方向", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "天机", huaType: "忌", direction: "自化", targetGong: "命宫", meaning: "天机自化忌", detailed: "思虑过度，神经衰弱，计划多执行少。天机自化忌主智慧受阻，需简化思维减少内耗", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "太阳", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "太阳自化禄", detailed: "博爱大方人缘好，但付出多回报少。太阳自化禄主阳光普照但自身消耗大，需注意自我保护和平衡", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "武曲", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "武曲自化禄", detailed: "财运亨通但财来财去，需理财节流。武曲为财星自化禄主赚钱能力强但守财需加强", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "天同", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "天同自化禄", detailed: "福气加身但过于安逸，需主动进取。天同福星自化禄主一生福泽深厚但容易安于现状", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "廉贞", huaType: "忌", direction: "自化", targetGong: "命宫", meaning: "廉贞自化忌", detailed: "情欲纠葛、官非口舌、自制力差。廉贞为次桃花自化忌主感情纠缠不清，需自律防烂桃花", jiXiong: "凶" },
  // ═══════════ 命宫飞入 ═══════════
  { gongWei: "命宫", xingYao: "紫微", huaType: "禄", direction: "飞入", targetGong: "福德宫", meaning: "福泽深厚", detailed: "禄入福德，天生福气，乐观豁达，精神享受丰富。紫微禄照福德主晚年福泽深厚，享受人生", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "天机", huaType: "权", direction: "飞入", targetGong: "事业宫", meaning: "智掌权柄", detailed: "权入事业，以智谋获取事业成就，适合策划、咨询、科技行业。天机权入事业主脑力劳动成就", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "太阳", huaType: "科", direction: "飞入", targetGong: "父母宫", meaning: "名声显亲", detailed: "科入父母，学业有成光宗耀祖，与长辈关系融洽。太阳科照父母主以光明磊落赢得名声", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "武曲", huaType: "禄", direction: "飞入", targetGong: "财帛宫", meaning: "财源旺盛", detailed: "禄入财帛，正财运极旺，适合金融、经商、实业。武曲财星禄入财帛为最佳财运配置", jiXiong: "大吉" },
  { gongWei: "命宫", xingYao: "廉贞", huaType: "忌", direction: "飞入", targetGong: "夫妻宫", meaning: "情路坎坷", detailed: "忌入夫妻，感情不顺多挫折，配偶健康需关注。廉贞忌入夫妻主桃花劫难，需谨慎择偶", jiXiong: "凶" },
  // ═══════════ 事业宫 ═══════════
  { gongWei: "事业宫", xingYao: "紫微", huaType: "权", direction: "自化", targetGong: "事业宫", meaning: "事业自化权", detailed: "事业心极强但容易大起大落，巅峰时需防滑落。紫微权在事业自化主领导才能突出但不持久", jiXiong: "平" },
  { gongWei: "事业宫", xingYao: "七杀", huaType: "权", direction: "自化", targetGong: "事业宫", meaning: "七杀自化权", detailed: "创业能力强但风险大，成功前多磨难。七杀为将星自化权主敢闯敢拼但需稳扎稳打", jiXiong: "平" },
  { gongWei: "事业宫", xingYao: "天相", huaType: "科", direction: "自化", targetGong: "事业宫", meaning: "天相自化科", detailed: "职场名声好但晋升慢，需耐心积累。天相为印星自化科主专业能力强但机遇需等", jiXiong: "吉" },
  // ═══════════ 财帛宫 ═══════════
  { gongWei: "财帛宫", xingYao: "太阴", huaType: "禄", direction: "飞入", targetGong: "田宅宫", meaning: "置产致富", detailed: "禄入田宅，通过房产/土地致富，不动产运极佳。太阴为田宅主，禄入田宅为最佳置产配置", jiXiong: "大吉" },
  { gongWei: "财帛宫", xingYao: "贪狼", huaType: "忌", direction: "飞入", targetGong: "疾厄宫", meaning: "财损身伤", detailed: "忌入疾厄，为财伤身，劳碌致病。贪狼忌入疾厄主因酒色财气损健康，需节制欲望", jiXiong: "凶" },
  { gongWei: "财帛宫", xingYao: "破军", huaType: "禄", direction: "自化", targetGong: "财帛宫", meaning: "破军自化禄", detailed: "横发横破，钱财大进大出。破军自化禄主一夜暴富的可能但守财极难，需快速置业固化", jiXiong: "平" },
  // ═══════════ 夫妻宫 ═══════════
  { gongWei: "夫妻宫", xingYao: "天府", huaType: "禄", direction: "飞入", targetGong: "命宫", meaning: "因婚得福", detailed: "禄入命宫，婚姻带来好运提升，配偶是贵人。天府禄入命主婚后运势明显上升", jiXiong: "大吉" },
  { gongWei: "夫妻宫", xingYao: "巨门", huaType: "忌", direction: "飞入", targetGong: "命宫", meaning: "婚姻拖累", detailed: "忌入命宫，婚姻带来压力和困扰，配偶多病或性格不合。巨门忌入命主口舌之争不断", jiXiong: "凶" },
  { gongWei: "夫妻宫", xingYao: "天同", huaType: "禄", direction: "自化", targetGong: "夫妻宫", meaning: "婚姻和睦", detailed: "自化禄，夫妻感情和谐但需防因安逸丧失激情。天同自化禄主婚姻平淡但稳定长久", jiXiong: "吉" },
  // ═══════════ 福德宫 ═══════════
  { gongWei: "福德宫", xingYao: "天梁", huaType: "科", direction: "飞入", targetGong: "命宫", meaning: "福慧双修", detailed: "科入命宫，智慧慈悲，晚年有福。天梁为寿星科入命主一生有贵人扶持平安顺遂", jiXiong: "吉" },
  { gongWei: "福德宫", xingYao: "贪狼", huaType: "忌", direction: "自化", targetGong: "福德宫", meaning: "欲望难平", detailed: "自化忌，欲望多不满足，精神空虚。贪狼忌在福德主贪得无厌需修心养性知足常乐", jiXiong: "凶" },
  // ═══════════ 田宅宫 ═══════════
  { gongWei: "田宅宫", xingYao: "太阴", huaType: "权", direction: "飞入", targetGong: "财帛宫", meaning: "房产增值", detailed: "权入财帛，房产投资获利丰厚，家产日益壮大。太阴权入财帛为不动产投资最佳配置", jiXiong: "大吉" },
  { gongWei: "田宅宫", xingYao: "巨门", huaType: "忌", direction: "自化", targetGong: "田宅宫", meaning: "家宅不宁", detailed: "自化忌，家庭纷争多，房产问题缠身。巨门忌在田宅主家庭不睦或房产官司", jiXiong: "凶" },
  // ═══════════ 疾厄宫 ═══════════
  { gongWei: "疾厄宫", xingYao: "天机", huaType: "忌", direction: "自化", targetGong: "疾厄宫", meaning: "神经过敏", detailed: "自化忌，神经系统弱，失眠焦虑。天机为神经之星忌在疾厄主思虑过度影响健康", jiXiong: "凶" },
  { gongWei: "疾厄宫", xingYao: "太阳", huaType: "忌", direction: "飞入", targetGong: "命宫", meaning: "健康拖累", detailed: "忌入命宫，身体影响整体运势，需格外注重养生。太阳忌入命主阳气不足精力衰退", jiXiong: "凶" },
  // ═══════════ 迁移宫 ═══════════
  { gongWei: "迁移宫", xingYao: "廉贞", huaType: "禄", direction: "飞入", targetGong: "命宫", meaning: "外出得利", detailed: "禄入命宫，出门遇贵人，外地发展有利。廉贞禄入命主通过社交应酬得利", jiXiong: "吉" },
  { gongWei: "迁移宫", xingYao: "七杀", huaType: "权", direction: "飞入", targetGong: "事业宫", meaning: "外出创业", detailed: "权入事业，在外创业有成就，适合远赴他乡发展。七杀权入事业主异地拼搏有成", jiXiong: "吉" },
  // ═══════════ 交友宫 ═══════════
  { gongWei: "交友宫", xingYao: "天相", huaType: "禄", direction: "飞入", targetGong: "命宫", meaning: "贵人相助", detailed: "禄入命宫，朋友中多贵人，人缘极好。天相禄入命主因助人而得助，人际关系和谐", jiXiong: "吉" },
  { gongWei: "交友宫", xingYao: "破军", huaType: "忌", direction: "飞入", targetGong: "财帛宫", meaning: "因友破财", detailed: "忌入财帛，交友不慎损财，需谨慎社交圈。破军忌入财帛主被朋友拖累经济损失", jiXiong: "凶" },
  // ═══════════ 子女宫 ═══════════
  { gongWei: "子女宫", xingYao: "武曲", huaType: "禄", direction: "飞入", targetGong: "财帛宫", meaning: "子女有财", detailed: "禄入财帛，子女财运好，可助家庭经济。武曲禄入财帛主子嗣能赚钱或带来财运", jiXiong: "吉" },
  { gongWei: "子女宫", xingYao: "天梁", huaType: "科", direction: "飞入", targetGong: "命宫", meaning: "子女有德", detailed: "科入命宫，子女品德好学业佳，光耀门楣。天梁科入命主子贵有德晚年有依靠", jiXiong: "吉" },
  // ═══════════ 父母宫 ═══════════
  { gongWei: "父母宫", xingYao: "太阳", huaType: "禄", direction: "自化", targetGong: "父母宫", meaning: "父母福泽", detailed: "自化禄，父母福泽深厚家世好，但自身也需努力。太阳自化禄主阳刚长辈庇佑", jiXiong: "吉" },
  { gongWei: "父母宫", xingYao: "太阴", huaType: "科", direction: "自化", targetGong: "父母宫", meaning: "母亲德荫", detailed: "自化科，母亲温柔慈爱教养良好。太阴自化科主母亲知书达理家中文化氛围好", jiXiong: "吉" },
  // ═══════════ 兄弟宫 ═══════════
  { gongWei: "兄弟宫", xingYao: "天同", huaType: "禄", direction: "飞入", targetGong: "命宫", meaning: "手足情深", detailed: "禄入命宫，兄弟姐妹感情好互帮互助。天同禄入命主兄弟姐妹是贵人助力", jiXiong: "吉" },
  { gongWei: "兄弟宫", xingYao: "巨门", huaType: "忌", direction: "飞入", targetGong: "命宫", meaning: "手足不和", detailed: "忌入命宫，与兄弟姐妹关系紧张多争执。巨门忌入命主因财产或利益与手足反目", jiXiong: "凶" },
  // ═══════════ 射出关系 ═══════════
  { gongWei: "命宫", xingYao: "贪狼", huaType: "禄", direction: "射出", targetGong: "迁移宫", meaning: "外出发迹", detailed: "禄射迁移，外出发展大吉，适合外地谋生或出国。贪狼禄射迁移主到远方能大展拳脚", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "巨门", huaType: "忌", direction: "射出", targetGong: "父母宫", meaning: "口舌伤亲", detailed: "忌射父母，口舌是非影响与长辈关系。巨门忌射入父母主因言语伤害与父母的感情", jiXiong: "凶" },
  { gongWei: "夫妻宫", xingYao: "破军", huaType: "禄", direction: "射出", targetGong: "事业宫", meaning: "夫妻共创", detailed: "禄射事业，夫妻共同创业发展事业。破军禄射事业主配偶助力事业突破", jiXiong: "吉" },
  { gongWei: "财帛宫", xingYao: "天机", huaType: "忌", direction: "射出", targetGong: "命宫", meaning: "财困身心", detailed: "忌射回命，财务压力直接困扰身心。天机忌射回命主因钱烦恼伤神", jiXiong: "凶" },
  { gongWei: "事业宫", xingYao: "紫微", huaType: "权", direction: "射出", targetGong: "财帛宫", meaning: "事业生财", detailed: "权射财帛，事业发展推动财富增长。紫微权射财帛主权威地位带来收入提升", jiXiong: "大吉" },
  // ═══════════ 十八飞星 ═══════════
  { gongWei: "命宫", xingYao: "文昌", huaType: "科", direction: "飞入", targetGong: "事业宫", meaning: "文途功名", detailed: "科入事业，学历/证书助事业高升，文职最宜。文昌科入事业主靠学识获得社会地位", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "文曲", huaType: "科", direction: "飞入", targetGong: "福德宫", meaning: "才艺养性", detailed: "科入福德，才艺带来精神满足。文曲科入福德主艺术修养丰富精神世界", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "左辅", huaType: "禄", direction: "飞入", targetGong: "交友宫", meaning: "左辅右弼", detailed: "禄入交友，人脉资源丰富，得众人相助。左辅禄入交友主社交圈广泛有贵人扶持", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "右弼", huaType: "禄", direction: "飞入", targetGong: "迁移宫", meaning: "外援得力", detailed: "禄入迁移，在外有人帮，异地发展顺利。右弼禄入迁移主远行有贵人或朋友相助", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "天魁", huaType: "科", direction: "飞入", targetGong: "事业宫", meaning: "贵人提携", detailed: "科入事业，贵人提携事业有进。天魁为天钺之首科入事业主男性贵人助力升迁", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "天钺", huaType: "科", direction: "飞入", targetGong: "夫妻宫", meaning: "妻贤夫贵", detailed: "科入夫妻，配偶有才貌贤惠。天钺科入夫妻主妻子或女性伴侣带来好运", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "禄存", huaType: "禄", direction: "自化", targetGong: "命宫", meaning: "天生富命", detailed: "自化禄，一生财源不断但需防吝啬。禄存自化禄主天生带有财富但需大方分享", jiXiong: "吉" },
  { gongWei: "命宫", xingYao: "擎羊", huaType: "忌", direction: "飞入", targetGong: "疾厄宫", meaning: "外伤体质", detailed: "忌入疾厄，外伤手术概率高，需小心意外。擎羊为刑星忌入疾厄主刀伤血光", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "陀罗", huaType: "忌", direction: "自化", targetGong: "命宫", meaning: "拖延困顿", detailed: "自化忌，做事拖延事业难成。陀罗为暗星自化忌主暗中阻碍需加倍努力", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "火星", huaType: "忌", direction: "飞入", targetGong: "福德宫", meaning: "暴躁损福", detailed: "忌入福德，脾气暴躁消耗福气。火星为火铃之星忌入福德主情绪急躁损人损己", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "铃星", huaType: "忌", direction: "飞入", targetGong: "夫妻宫", meaning: "阴火伤婚", detailed: "忌入夫妻，婚姻暗中不和冷战多。铃星为阴火忌入夫妻主夫妻间暗中较劲冷战", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "地空", huaType: "忌", direction: "自化", targetGong: "命宫", meaning: "空想难成", detailed: "自化忌，想法多落地少，需重视执行。地空自化忌主理想主义不切实际需脚踏实地", jiXiong: "凶" },
  { gongWei: "命宫", xingYao: "地劫", huaType: "忌", direction: "自化", targetGong: "命宫", meaning: "劫难重重", detailed: "自化忌，一生波折多有意外变故。地劫自化忌主突如其来的变故需未雨绸缪", jiXiong: "凶" },
]

export function calculateZiweiSihuaFei(input: {
  gongWei?: string
  xingYao?: string
  huaType?: "禄" | "权" | "科" | "忌"
}): ZiweiSihuaFeiResult {
  let result = FEI_XING

  if (input.gongWei) {
    result = result.filter(f => f.gongWei.includes(input.gongWei!))
  }
  if (input.xingYao) {
    result = result.filter(f => f.xingYao.includes(input.xingYao!))
  }
  if (input.huaType) {
    result = result.filter(f => f.huaType === input.huaType)
  }

  const summary = result.length >= FEI_XING.length
    ? `共收录${FEI_XING.length}种四化飞星配置，涵盖十四主星+十八飞星的禄权科忌自化、飞入、射出三种方向，源自钦天门飞星派《斗数四化原理》`
    : `筛选出${result.length}种${input.gongWei || ""}${input.xingYao || ""}${input.huaType || ""}四化飞星配置`

  return { feiXing: result, summary }
}

// ── 奇门针灸计算引擎 ──
// 基于阴盘奇门排盘结果，九宫→人体→穴位映射
// 参考：《王凤麟道家奇门》、奇门遁甲针灸应用体系

import type {
  QiMenAcupunctureResult,
  QiMenAcupunctureInput,
  GongDiagnosis,
  AcuPoint,
  BodyPart,
  SymptomType,
} from "@guoxue/shared";
import { calculateQimenYin } from "./qimen-yin.calculator";
import { calcRiZhu } from "@guoxue/bazi-engine";

// ── 九宫→人体部位映射 ──
const GONG_BODY_PARTS: Record<string, BodyPart[]> = {
  "坎": ["肾脏","膀胱","泌尿","生殖","子宫","卵巢","耳部","血液","骨骼"],
  "坤": ["腹部","脾胃","肠道","肌肉","女性生殖","右肩","右手"],
  "震": ["肝脏","胆囊","脚部","毛发","咽喉","声带","左肋","神经"],
  "巽": ["肝胆","呼吸","食道","肠道","神经","血管","右肩","腹部"],
  "中": ["脊椎","背部","骨髓","中枢神经"],
  "乾": ["头部","颈部","面部","肺部","大肠","骨骼","男性生殖","右腿"],
  "兑": ["口舌","牙齿","气管","咽喉","肺部","右肋","大肠"],
  "艮": ["背部","腰部","鼻部","手部","关节","左腿","脾胃"],
  "离": ["眼部","乳房","头部","心脏","小肠","血液","神经"],
};

// ── 十天干落宫断病 ──
const GAN_PATHOGENESIS: Record<string, Record<string, string>> = {
  "甲": {
    "坎":"肾气不足，腰膝酸软，耳鸣耳聋",
    "坤":"脾虚湿困，肌肉萎缩，消化不良",
    "震":"肝阳上亢，头痛目赤，易怒失眠",
    "巽":"肝风内动，四肢麻木，血管硬化",
    "中":"督脉空虚，脊背疼痛，元气不足",
    "乾":"头风头痛，肺气虚弱，皮肤干燥",
    "兑":"肺阴虚损，咽喉肿痛，气短痰多",
    "艮":"脾胃虚寒，关节酸痛，手足不温",
    "离":"心火亢盛，眼目胀痛，面红口疮",
  },
  "乙": {
    "坎":"肾阴亏虚，遗精早泄，腰酸腿软",
    "坤":"脾精不足，面色萎黄，食欲不振",
    "震":"肝血不足，手足拘挛，视物昏花",
    "巽":"肝气郁结，胸胁胀痛，经前乳胀",
    "中":"冲任不调，腰骶酸胀，精力不济",
    "乾":"肝风挟痰，眩晕头痛，肢体麻木",
    "兑":"肝木侮金，干咳无痰，胸胁刺痛",
    "艮":"肝木克土，胃脘胀痛，嗳气吞酸",
    "离":"肝郁化火，目赤肿痛，烦躁易怒",
  },
  "丙": {
    "坎":"小肠虚寒，下元不温，小便清长",
    "坤":"心火移热小肠，腹胀便秘，口舌生疮",
    "震":"心火上炎，口苦咽干，心悸不宁",
    "巽":"热极生风，高热抽搐，角弓反张",
    "中":"心阳不振，脊背发凉，手足冰冷",
    "乾":"心火上攻，面赤头痛，口舌溃烂",
    "兑":"心肺火旺，咳血鼻衄，喉咙肿痛",
    "艮":"心脾积热，唇干口裂，目赤多眵",
    "离":"心火亢盛，狂躁不安，目赤面红",
  },
  "丁": {
    "坎":"心肾不交，失眠健忘，潮热盗汗",
    "坤":"心血不足，面色无华，心悸怔忡",
    "震":"心肝血虚，筋脉失养，肢体抽搐",
    "巽":"心风内扰，神昏谵语，言语不利",
    "中":"心气虚损，少气懒言，动则汗出",
    "乾":"心脉瘀阻，胸痹心痛，唇甲紫暗",
    "兑":"心肺阴虚，干咳少痰，五心烦热",
    "艮":"心脾两虚，失眠多梦，食欲不振",
    "离":"心阴不足，怔忡多梦，手心发热",
  },
  "戊": {
    "坎":"胃湿停滞，脘腹胀满，小便不利",
    "坤":"脾虚胀满，四肢浮肿，大便溏薄",
    "震":"胃气上逆，恶心呕吐，嗳腐吞酸",
    "巽":"脾虚生风，眩晕欲仆，肢体颤动",
    "中":"脾胃壅滞，中焦痞满，口气酸腐",
    "乾":"胃火熏蒸，前额头痛，牙龈肿痛",
    "兑":"胃火灼肺，咳痰黄稠，咽喉干燥",
    "艮":"脾胃虚寒，腹中冷痛，喜温喜按",
    "离":"胃火亢盛，消谷善饥，口渴引饮",
  },
  "己": {
    "坎":"脾不制水，水肿尿少，腰以下肿",
    "坤":"脾阳虚损，腹胀便溏，四肢不温",
    "震":"脾虚肝乘，腹痛作泻，痛则欲便",
    "巽":"土虚木摇，眩晕跌仆，四肢无力",
    "中":"中气下陷，内脏下垂，少腹坠胀",
    "乾":"脾不生肺，气短自汗，易于外感",
    "兑":"脾湿浸肺，咳嗽痰多，胸闷纳呆",
    "艮":"脾虚湿盛，关节重着，身体困倦",
    "离":"脾火上升，口唇生疮，牙龈出血",
  },
  "庚": {
    "坎":"寒凝肾经，寒疝腹痛，畏寒肢冷",
    "坤":"寒伤脾阳，腹中冷痛，呕吐清涎",
    "震":"肺金克木，筋脉拘急，关节疼痛",
    "巽":"风邪挟金，咳逆上气，喘息抬肩",
    "中":"督脉寒凝，脊背冷痛，屈伸不利",
    "乾":"寒束肌表，项背强痛，鼻塞流涕",
    "兑":"寒客肺经，咳嗽痰稀，胸背冷痛",
    "艮":"风寒湿痹，关节冷痛，遇寒加重",
    "离":"寒气客心，心痛彻背，四肢厥冷",
  },
  "辛": {
    "坎":"肺寒入肾，呼吸短促，畏寒怕冷",
    "坤":"肺虚脾弱，食少纳呆，气短乏力",
    "震":"金胜木伤，筋脉拘挛，爪甲不荣",
    "巽":"风痰入络，半身不遂，口眼歪斜",
    "中":"肺气虚陷，脊背酸软，声低气怯",
    "乾":"风寒束肺，头痛鼻塞，无汗恶寒",
    "兑":"肺气郁闭，咳喘胸闷，喉中痰鸣",
    "艮":"寒湿阻络，关节肿胀，屈伸不利",
    "离":"肺火刑金，咽喉疼痛，声音嘶哑",
  },
  "壬": {
    "坎":"寒水过盛，小便频数，腰膝冷痛",
    "坤":"水湿困脾，浮肿腹胀，大便溏泄",
    "震":"水不涵木，头晕目眩，筋脉失养",
    "巽":"水气凌心，心悸气短，不能平卧",
    "中":"水湿浸渍，脊背酸重，身重如裹",
    "乾":"水寒射肺，咳喘痰稀，面色苍白",
    "兑":"水气上逆，咳而呕利，胸满胁痛",
    "艮":"水湿流注，关节积液，下肢沉重",
    "离":"水气凌心，心慌心悸，恍惚不宁",
  },
  "癸": {
    "坎":"肾经湿热，尿频尿急，腰酸沉重",
    "坤":"湿热困脾，脘痞纳呆，身重嗜卧",
    "震":"湿热下注，筋脉弛缓，下肢痿软",
    "巽":"湿浊蒙窍，头重昏沉，神识不清",
    "中":"湿浊阻络，腰背酸胀，转侧不利",
    "乾":"湿热上扰，头重鼻塞，耳内流脓",
    "兑":"湿热蕴肺，咳痰黄腻，胸闷不舒",
    "艮":"湿浊留注，关节肿胀，屈伸困难",
    "离":"湿热壅上，两目黄染，心烦不寐",
  },
};

// ── 九星对疾病的影响 ──
const STAR_INFLUENCE: Record<string, { nature: SymptomType; desc: string; severity: number }> = {
  "天蓬": { nature:"寒症", desc:"天蓬水星，主寒湿内盛，病势缠绵，多为肾系与泌尿之疾。", severity:7 },
  "天芮": { nature:"痰湿", desc:"天芮土星，主痰湿积聚，慢性顽疾，多脾胃消化系统问题。", severity:8 },
  "天冲": { nature:"实症", desc:"天冲木星，主突发实症，病势急骤，多肝胆神经系统急症。", severity:6 },
  "天辅": { nature:"气滞", desc:"天辅木星，主气机不畅，经络阻滞，多肝胆气郁之症。", severity:4 },
  "天禽": { nature:"虚症", desc:"天禽土星居中，主元气虚弱，脏腑功能衰退，多慢性劳损。", severity:5 },
  "天心": { nature:"实症", desc:"天心金星，主突发外感，寒热交作，多心肺系统急症。", severity:6 },
  "天柱": { nature:"实症", desc:"天柱金星，主气逆上冲，咽喉阻塞，多口舌喉肺急症。", severity:5 },
  "天任": { nature:"虚症", desc:"天任土星，主中气不足，运化无力，多胃肠虚损慢性症。", severity:4 },
  "天英": { nature:"热症", desc:"天英火星，主火热炎上，目赤面红，多心脑血管热症。", severity:7 },
};

// ── 八门对疾病的影响 ──
const MEN_INFLUENCE: Record<string, string> = {
  "休": "休门休养，病多因劳累过度，宜静养调理，预后较好。",
  "生": "生门生机，病虽重亦有生机，积极治疗可得康复。",
  "伤": "伤门外伤，易有跌打损伤、手术血光，须防意外。",
  "杜": "杜门阻塞，气血不通，经络壅滞，治疗难度较大。",
  "景": "景门血证，易有出血、炎症、发热等热性病症。",
  "死": "死门重症，病势危重，须全力抢救，不可轻忽。",
  "惊": "惊门惊恐，病多由惊吓导致，心神不宁，失眠多梦。",
  "开": "开门通达，气血流畅，治疗顺利，恢复较快。",
};

// ── 经络穴位表 ──
const ACUPOINT_DB: Record<string, AcuPoint[]> = {
  "头部": [
    { name:"百会", meridian:"督脉", location:"头顶正中线与两耳尖连线交点", method:"毫针斜刺", depth:"0.5-1寸", retention:"20-30分钟" },
    { name:"风池", meridian:"胆经", location:"项后枕骨下，两侧凹陷处", method:"毫针直刺", depth:"0.8-1.2寸", retention:"15-20分钟" },
  ],
  "眼部": [
    { name:"睛明", meridian:"膀胱经", location:"目内眦角稍上方凹陷", method:"毫针直刺", depth:"0.3-0.5寸", retention:"10-15分钟" },
    { name:"太阳", meridian:"经外奇穴", location:"眉梢与目外眦中点后方1寸", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "口舌": [
    { name:"地仓", meridian:"胃经", location:"口角外侧旁开0.4寸", method:"毫针斜刺", depth:"0.3-0.5寸", retention:"15分钟" },
    { name:"颊车", meridian:"胃经", location:"下颌角前上方1横指", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "咽喉": [
    { name:"天突", meridian:"任脉", location:"胸骨上窝正中", method:"毫针斜刺", depth:"0.5-1寸", retention:"15分钟" },
    { name:"廉泉", meridian:"任脉", location:"喉结上方舌骨上缘凹陷", method:"毫针直刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
  "肺部": [
    { name:"肺俞", meridian:"膀胱经", location:"第3胸椎棘突下旁开1.5寸", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"20分钟" },
    { name:"太渊", meridian:"肺经", location:"腕横纹桡侧端动脉搏动处", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "心脏": [
    { name:"内关", meridian:"心包经", location:"腕横纹上2寸两筋之间", method:"毫针直刺", depth:"0.5-1寸", retention:"20分钟" },
    { name:"神门", meridian:"心经", location:"腕横纹尺侧端凹陷处", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "乳房": [
    { name:"膻中", meridian:"任脉", location:"前正中线平第4肋间", method:"毫针平刺", depth:"0.3-0.5寸", retention:"15分钟" },
    { name:"乳根", meridian:"胃经", location:"乳头直下第5肋间", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
  "肝胆": [
    { name:"太冲", meridian:"肝经", location:"足背第1、2跖骨结合部前方", method:"毫针直刺", depth:"0.5-0.8寸", retention:"20分钟" },
    { name:"阳陵泉", meridian:"胆经", location:"腓骨小头前下方凹陷", method:"毫针直刺", depth:"1-1.5寸", retention:"20分钟" },
  ],
  "脾胃": [
    { name:"足三里", meridian:"胃经", location:"犊鼻下3寸胫骨前嵴外1横指", method:"毫针直刺", depth:"1-1.5寸", retention:"20-30分钟" },
    { name:"中脘", meridian:"任脉", location:"脐上4寸前正中线上", method:"毫针直刺", depth:"1-1.5寸", retention:"20分钟" },
  ],
  "肠道": [
    { name:"天枢", meridian:"胃经", location:"脐中旁开2寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"上巨虚", meridian:"胃经", location:"足三里下3寸", method:"毫针直刺", depth:"1-1.5寸", retention:"20分钟" },
  ],
  "肾脏": [
    { name:"肾俞", meridian:"膀胱经", location:"第2腰椎棘突下旁开1.5寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20-30分钟" },
    { name:"太溪", meridian:"肾经", location:"内踝高点与跟腱之间凹陷", method:"毫针直刺", depth:"0.5-0.8寸", retention:"15-20分钟" },
  ],
  "膀胱": [
    { name:"膀胱俞", meridian:"膀胱经", location:"第2骶后孔旁开1.5寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"中极", meridian:"任脉", location:"脐下4寸前正中线上", method:"毫针直刺", depth:"0.8-1.2寸", retention:"15-20分钟" },
  ],
  "生殖": [
    { name:"关元", meridian:"任脉", location:"脐下3寸前正中线上", method:"艾灸", depth:"艾条温灸", retention:"15-30分钟" },
    { name:"三阴交", meridian:"脾经", location:"内踝尖上3寸胫骨内缘后", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
  ],
  "子宫": [
    { name:"子宫穴", meridian:"经外奇穴", location:"脐下4寸旁开3寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"气海", meridian:"任脉", location:"脐下1.5寸前正中线上", method:"艾灸", depth:"艾条温灸", retention:"20-30分钟" },
  ],
  "卵巢": [
    { name:"归来", meridian:"胃经", location:"脐下4寸旁开2寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"血海", meridian:"脾经", location:"髌底内侧端上2寸", method:"毫针直刺", depth:"1-1.5寸", retention:"20分钟" },
  ],
  "脊椎": [
    { name:"大椎", meridian:"督脉", location:"第7颈椎棘突下", method:"毫针斜刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"命门", meridian:"督脉", location:"第2腰椎棘突下", method:"艾灸", depth:"艾条温灸", retention:"20-30分钟" },
  ],
  "背部": [
    { name:"膏肓", meridian:"膀胱经", location:"第4胸椎棘突下旁开3寸", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"20分钟" },
    { name:"身柱", meridian:"督脉", location:"第3胸椎棘突下", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
  "腰部": [
    { name:"腰阳关", meridian:"督脉", location:"第4腰椎棘突下", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"大肠俞", meridian:"膀胱经", location:"第4腰椎棘突下旁开1.5寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
  ],
  "关节": [
    { name:"膝眼", meridian:"经外奇穴", location:"髌韧带两侧凹陷", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
    { name:"曲池", meridian:"大肠经", location:"肘横纹桡侧端凹陷", method:"毫针直刺", depth:"1-1.5寸", retention:"15-20分钟" },
  ],
  "皮肤": [
    { name:"曲池", meridian:"大肠经", location:"肘横纹桡侧端凹陷", method:"毫针直刺", depth:"1-1.5寸", retention:"15分钟" },
    { name:"血海", meridian:"脾经", location:"髌底内侧端上2寸", method:"毫针直刺", depth:"1-1.2寸", retention:"20分钟" },
  ],
  "血液": [
    { name:"膈俞", meridian:"膀胱经", location:"第7胸椎棘突下旁开1.5寸", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
    { name:"血海", meridian:"脾经", location:"髌底内侧端上2寸", method:"毫针直刺", depth:"1-1.2寸", retention:"20分钟" },
  ],
  "神经": [
    { name:"神门", meridian:"心经", location:"腕横纹尺侧端凹陷", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
    { name:"百会", meridian:"督脉", location:"头顶正中", method:"毫针平刺", depth:"0.5-1寸", retention:"20分钟" },
  ],
  "腿部": [
    { name:"承山", meridian:"膀胱经", location:"腓肠肌两肌腹间凹陷", method:"毫针直刺", depth:"1-1.5寸", retention:"15分钟" },
    { name:"环跳", meridian:"胆经", location:"股骨大转子与骶管裂孔连线外1/3", method:"毫针直刺", depth:"2-3寸", retention:"20分钟" },
  ],
  "脚部": [
    { name:"涌泉", meridian:"肾经", location:"足底前1/3凹陷", method:"毫针直刺", depth:"0.5-0.8寸", retention:"15分钟" },
    { name:"太冲", meridian:"肝经", location:"足背第1、2跖骨结合部前方", method:"毫针直刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
  "手部": [
    { name:"合谷", meridian:"大肠经", location:"手背第1、2掌骨间第2掌骨中点", method:"毫针直刺", depth:"0.5-1寸", retention:"15分钟" },
    { name:"劳宫", meridian:"心包经", location:"掌心第2、3掌骨间握拳中指尖处", method:"毫针直刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "腹部": [
    { name:"中脘", meridian:"任脉", location:"脐上4寸前正中线上", method:"毫针直刺", depth:"1-1.5寸", retention:"20分钟" },
    { name:"天枢", meridian:"胃经", location:"脐中旁开2寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
  ],
  "肋骨": [
    { name:"期门", meridian:"肝经", location:"乳头直下第6肋间隙", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
    { name:"章门", meridian:"肝经", location:"第11肋游离端下方", method:"毫针直刺", depth:"0.8-1寸", retention:"15分钟" },
  ],
  "颈部": [
    { name:"风池", meridian:"胆经", location:"项后枕骨下两侧凹陷", method:"毫针直刺", depth:"0.8-1.2寸", retention:"15-20分钟" },
    { name:"天柱", meridian:"膀胱经", location:"后发际正中旁开1.3寸", method:"毫针直刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
  "耳部": [
    { name:"听宫", meridian:"小肠经", location:"耳屏前下颌骨髁状突后方", method:"毫针直刺", depth:"0.5-1寸", retention:"15分钟" },
    { name:"翳风", meridian:"三焦经", location:"耳垂后方乳突与下颌角间", method:"毫针直刺", depth:"0.8-1.2寸", retention:"15分钟" },
  ],
  "鼻部": [
    { name:"迎香", meridian:"大肠经", location:"鼻翼外缘中点旁开0.5寸", method:"毫针斜刺", depth:"0.3-0.5寸", retention:"10分钟" },
    { name:"印堂", meridian:"经外奇穴", location:"两眉头连线中点", method:"毫针平刺", depth:"0.3-0.5寸", retention:"15分钟" },
  ],
  "毛发": [
    { name:"百会", meridian:"督脉", location:"头顶正中", method:"毫针平刺", depth:"0.5-1寸", retention:"20分钟" },
    { name:"风池", meridian:"胆经", location:"项后枕骨下两侧凹陷", method:"毫针直刺", depth:"0.8-1.2寸", retention:"15分钟" },
  ],
  "骨骼": [
    { name:"大杼", meridian:"膀胱经", location:"第1胸椎棘突下旁开1.5寸", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
    { name:"绝骨", meridian:"胆经", location:"外踝尖上3寸腓骨前缘", method:"毫针直刺", depth:"0.8-1寸", retention:"15分钟" },
  ],
  "血管": [
    { name:"血海", meridian:"脾经", location:"髌底内侧端上2寸", method:"毫针直刺", depth:"1-1.2寸", retention:"20分钟" },
    { name:"膈俞", meridian:"膀胱经", location:"第7胸椎棘突下旁开1.5寸", method:"毫针斜刺", depth:"0.5-0.8寸", retention:"15分钟" },
  ],
};

// ── 默认穴位（通用调理） ──
const DEFAULT_ACUPOINTS: AcuPoint[] = [
  { name:"足三里", meridian:"胃经", location:"犊鼻下3寸", method:"毫针直刺", depth:"1-1.5寸", retention:"20-30分钟" },
  { name:"三阴交", meridian:"脾经", location:"内踝尖上3寸", method:"毫针直刺", depth:"0.8-1.2寸", retention:"20分钟" },
];

function getAcuPoints(bodyParts: BodyPart[]): AcuPoint[] {
  const seen = new Set<string>();
  const points: AcuPoint[] = [];
  for (const bp of bodyParts) {
    const list = ACUPOINT_DB[bp] ?? [];
    for (const p of list) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        points.push(p);
      }
    }
  }
  return points.length >= 2 ? points.slice(0, 4) : [...points, ...DEFAULT_ACUPOINTS];
}

/** 主计算函数 */
export function calculateQiMenAcupuncture(input: Record<string, unknown>): QiMenAcupunctureResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const chiefComplaint = input.chiefComplaint as string | undefined;
  const targetBodyPart = input.targetBodyPart as BodyPart | undefined;

  // 先排阴盘奇门
  const qimenResult = calculateQimenYin({ datetime });

  const d = new Date(datetime);
  const riZhu = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const riGan = riZhu.gan;

  // ── 诊断各宫 ──
  const diagnoses: GongDiagnosis[] = [];

  for (const gong of qimenResult.gongs) {
    if (gong.name === "中") continue; // 中宫不直接诊断

    const bodyParts = GONG_BODY_PARTS[gong.name] ?? [];
    const tianGan = gong.tianPan;
    const ganDiag = GAN_PATHOGENESIS[tianGan]?.[gong.name] ?? "暂无特定病机";
    const starInfo = STAR_INFLUENCE[gong.star] ?? { nature:"综合" as SymptomType, desc:"一般影响", severity:3 };
    const menInfo = MEN_INFLUENCE[gong.men] ?? "暂无特定影响";

    // 判断是否目标部位相关
    const isTargetRelated = targetBodyPart ? bodyParts.includes(targetBodyPart) : false;

    // 是否用神宫（日干落宫）
    const isYongShen = gong.tianPan === riGan || gong.diPan === riGan;

    // 病症列表
    const mainSymptoms = ganDiag.split("，").map(s => s.trim()).filter(Boolean);

    // 严重程度
    let severity = starInfo.severity;
    if (isYongShen) severity += 2;
    if (gong.isRuMu) severity += 1;
    if (gong.kongWang) severity -= 1; // 空亡反而减轻
    severity = Math.min(10, Math.max(1, severity));

    // 穴位
    const acuPoints = getAcuPoints(bodyParts);

    diagnoses.push({
      gongIndex: gong.index,
      gongName: gong.name,
      bodyParts,
      mainSymptoms,
      severity,
      nature: starInfo.nature,
      ganPathogenesis: ganDiag,
      starInfluence: starInfo.desc,
      menInfluence: menInfo,
      acuPoints,
    });
  }

  // ── 确定主病宫位 ──
  let primary = diagnoses[0];
  for (const dg of diagnoses) {
    const dgIsTarget = targetBodyPart ? dg.bodyParts.includes(targetBodyPart) : false;
    const priIsTarget = targetBodyPart ? primary.bodyParts.includes(targetBodyPart) : false;
    if (dgIsTarget && !priIsTarget) { primary = dg; }
    else if (dgIsTarget === priIsTarget && dg.severity > primary.severity) { primary = dg; }
  }

  // ── 综合方案 ──
  const allPoints = new Map<string, AcuPoint>();
  for (const dg of [...diagnoses].sort((a, b) => b.severity - a.severity).slice(0, 3)) {
    for (const p of dg.acuPoints) {
      if (!allPoints.has(p.name)) allPoints.set(p.name, p);
    }
  }
  const allPointsArr = [...allPoints.values()];
  const mainPoints = allPointsArr.slice(0, 4);
  const auxiliaryPoints = allPointsArr.slice(4, 8);

  // 禁忌
  const contraindications: string[] = [];
  const tabooGongs = diagnoses.filter(d => d.gongName === "坎" || d.gongName === "离");
  if (tabooGongs.length) contraindications.push("施针前须确认患者无出血性疾病");
  if (diagnoses.some(d => d.nature === "热症" && d.severity >= 7)) contraindications.push("高热不退者慎用灸法");
  if (diagnoses.some(d => d.nature === "寒症" && d.severity >= 7)) contraindications.push("体质极度虚寒者宜先用灸法温补");
  contraindications.push("孕妇腹部及腰骶部穴位慎针", "饭后1小时内不宜针刺");

  const duanYu = `奇门针灸诊断：时值${qimenResult.dunType === "yang" ? "阳" : "阴"}遁${qimenResult.juNumber}局，${qimenResult.jieQi}节气。${primary.gongName}宫为${primary.menInfluence.includes("重") ? "重病" : "主要"}宫位（${primary.ganPathogenesis.split("，")[0]}）。${primary.starInfluence}。建议取${mainPoints.map(p => p.name).join("、")}为主穴，${auxiliaryPoints.length ? auxiliaryPoints.map(p => p.name).join("、") + "为配穴" : "配合局部取穴"}。${primary.severity >= 7 ? "病势较重，建议配合药物治疗。" : "预后良好，按疗程针灸可愈。"}`;

  return {
    input: { datetime, chiefComplaint, targetBodyPart },
    panInfo: {
      juNumber: qimenResult.juNumber,
      dunType: qimenResult.dunType,
      yongShi: qimenResult.yongShi,
      ziFu: qimenResult.zhiFu,
      zhiShiMen: qimenResult.zhiShiMen,
    },
    diagnoses,
    primaryDiagnosis: primary,
    treatmentPlan: {
      mainPoints,
      auxiliaryPoints: auxiliaryPoints.length ? auxiliaryPoints : [DEFAULT_ACUPOINTS[0]],
      courseSuggestion: `建议每日或隔日施针1次，${primary.severity >= 7 ? "10" : "5"}-7次为1疗程。隔2-3日再行第2疗程。`,
      contraindications,
    },
    duanYu,
  };
}

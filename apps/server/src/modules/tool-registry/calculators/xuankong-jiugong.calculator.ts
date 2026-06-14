// ── 玄空九宫飞星计算引擎 ──
// 算法参考：《青囊奥语》《天玉经》《玄空秘旨》
import type {
  XuanKongJiuGongInput,
  XuanKongJiuGongResult,
  FeiXingGong,
  ShouShanChuSha,
} from "@guoxue/shared";

const GONG_WEI_MAP: Record<number, { gongWei: string; fangWei: string; baGua: string }> = {
  1: { gongWei: "坎宫", fangWei: "正北", baGua: "坎☵" },
  2: { gongWei: "坤宫", fangWei: "西南", baGua: "坤☷" },
  3: { gongWei: "震宫", fangWei: "正东", baGua: "震☳" },
  4: { gongWei: "巽宫", fangWei: "东南", baGua: "巽☴" },
  5: { gongWei: "中宫", fangWei: "中央", baGua: "中" },
  6: { gongWei: "乾宫", fangWei: "西北", baGua: "乾☰" },
  7: { gongWei: "兑宫", fangWei: "正西", baGua: "兑☱" },
  8: { gongWei: "艮宫", fangWei: "东北", baGua: "艮☶" },
  9: { gongWei: "离宫", fangWei: "正南", baGua: "离☲" },
};

const GE_JU_JI_XIONG: Record<string, { geJu: string; jiXiong: string; yingShi: string; huaJie: string; shengKe: string }> = {
  "11": { geJu: "一白相会", jiXiong: "吉", shengKe: "水水比和", yingShi: "文昌大旺，科甲连绵，利求学业功名", huaJie: "无需化解，此为文昌大吉之格。可置书桌于此位以催旺文昌。" },
  "12": { geJu: "二黑土克一白水", jiXiong: "凶", shengKe: "土克水", yingShi: "腹疾肾病、肠胃不适，男主有血光之灾", huaJie: "此方忌动土。宜放铜葫芦或金属摆件化二黑土气。" },
  "13": { geJu: "三碧木泄一白水", jiXiong: "平", shengKe: "水生木(泄)", yingShi: "口舌是非、官非纠纷，但亦主文才显露", huaJie: "宜放红色物品（火泄木生土通关）。保持此位安静整洁。" },
  "14": { geJu: "四绿木泄一白水", jiXiong: "平", shengKe: "水生木(泄)", yingShi: "文思敏捷但有桃花劫，女主人需留意", huaJie: "宜放红色饰品或用红色窗帘以火泄木气。" },
  "15": { geJu: "五黄大煞克一白", jiXiong: "大凶", shengKe: "土克水", yingShi: "大凶之格，主横祸官非血光之灾", huaJie: "忌动土！宜放铜铃铜钟六帝钱化解五黄煞气。此方位宜静不宜动。" },
  "16": { geJu: "六白金生一白水", jiXiong: "吉", shengKe: "金生水", yingShi: "文武双全，富贵双收，名利皆有", huaJie: "吉位。宜放水晶或鱼缸催旺水势，增强文贵之气。" },
  "17": { geJu: "七赤金生一白水", jiXiong: "吉", shengKe: "金生水", yingShi: "偏财大旺，意外之财，但防酒色之祸", huaJie: "吉位但防过旺。宜放绿植以木泄水气，保持平衡。" },
  "18": { geJu: "八白土克一白水", jiXiong: "平", shengKe: "土克水", yingShi: "财运尚可但有阻碍，少年运受到影响", huaJie: "宜放金属物品（金泄土生水）以通关化解土克水之势。" },
  "19": { geJu: "九紫火被一白水克", jiXiong: "平", shengKe: "水克火", yingShi: "水火既济之象，但需调和方能得吉", huaJie: "宜放绿色植物以木通关（水生木，木生火）。此方位可旺人缘桃花。" },
  "22": { geJu: "二黑重逢", jiXiong: "大凶", shengKe: "土土比和", yingShi: "病符重叠，健康大凶。女主尤其不利，防肿瘤恶疾", huaJie: "大凶之位！忌动土。宜放六帝钱、铜葫芦、或金属风铃以金泄土气。不宜久居此位。" },
  "23": { geJu: "三碧木克二黑土", jiXiong: "凶", shengKe: "木克土", yingShi: "斗牛煞——口舌官非不断，家庭不睦", huaJie: "宜放红色物品（火泄木生土）调和木土之争。忌在此位争吵发怒。" },
  "24": { geJu: "四绿木克二黑土", jiXiong: "凶", shengKe: "木克土", yingShi: "主女性疾病、婆媳不和、肠胃疾病", huaJie: "宜放红色物品或紫水晶以火通关。此位宜用暖色调。" },
  "25": { geJu: "二五交加", jiXiong: "大凶", shengKe: "土土比和", yingShi: "二黑病符加五黄大煞，祸不单行，伤亡之兆", huaJie: "必化解之煞！宜大量金属摆件（铜钟铜铃铜钱）重金泄土。忌一切火红之色。" },
  "26": { geJu: "六白金泄二黑土", jiXiong: "平", shengKe: "土生金(泄)", yingShi: "病符被泄为有利，但虚弱之人仍需注意", huaJie: "宜保持此位通风明亮。适当金属摆件助金气泄土。" },
  "27": { geJu: "七赤金泄二黑土", jiXiong: "平", shengKe: "土生金(泄)", yingShi: "病气减轻但有口舌是非，防小人暗算", huaJie: "宜放黑色或蓝色物品以水泄金生木平衡气场。" },
  "28": { geJu: "二八相会土气过重", jiXiong: "平", shengKe: "土土比和", yingShi: "财运有但健康受损，旺财不旺丁", huaJie: "宜金属物品大量放置以金泄土。取财舍健康则为用。" },
  "29": { geJu: "九紫火生二黑土", jiXiong: "凶", shengKe: "火生土(增凶)", yingShi: "火生土增病符之力，急性炎症发热之疾", huaJie: "忌红色、忌炉灶在此位。宜放金属物品以金泄土。不可用火来化解。" },
  "33": { geJu: "三碧重逢", jiXiong: "凶", shengKe: "木木比和", yingShi: "官非口舌不断，兄弟不睦，家宅不宁", huaJie: "宜放红色或紫色物品以火泄木气。忌在此位放绿植增加木气。" },
  "34": { geJu: "三四相会木气大旺", jiXiong: "平", shengKe: "木木比和", yingShi: "文昌大利但口舌亦多，须拿捏分寸", huaJie: "宜放红色物品泄木。文职工作者可放置书桌于此以取文昌之利。" },
  "35": { geJu: "三碧木克五黄土", jiXiong: "大凶", shengKe: "木克土(犯煞)", yingShi: "犯五黄大煞——横祸破财、意外伤害", huaJie: "忌动土！宜金属物品（金泄土克木）重金化解。不可用红色物品。" },
  "36": { geJu: "三碧木被六金克", jiXiong: "平", shengKe: "金克木", yingShi: "官非可被贵人化解，但仍有争斗摩擦", huaJie: "宜放水养植物（水泄金生木）以通关。此位宜柔不宜刚。" },
  "37": { geJu: "三碧木被七金克", jiXiong: "凶", shengKe: "金克木", yingShi: "穿心煞——官司败诉、被人陷害、手足受伤", huaJie: "宜放黑色或蓝色物品以水泄金生木通关化解穿心之煞。" },
  "38": { geJu: "三八相会木土交战", jiXiong: "平", shengKe: "木克土", yingShi: "财运受阻、小口多病、家庭经济纠纷", huaJie: "宜放红色物品以火泄木生土。保持此位整洁有序。" },
  "39": { geJu: "三碧木生九紫火", jiXiong: "吉", shengKe: "木生火", yingShi: "木火通明——文才出众、喜事临门、贵人得助", huaJie: "吉位。宜保持明亮，勿置杂物遮挡木火通明之吉气。" },
  "44": { geJu: "四绿重逢", jiXiong: "平", shengKe: "木木比和", yingShi: "文昌双至但桃花泛滥，需拿捏分寸", huaJie: "宜放红色物品泄木。书房在此位大利文昌。已婚者需平衡桃花之气。" },
  "45": { geJu: "四绿木克五黄土", jiXiong: "大凶", shengKe: "木克土(犯煞)", yingShi: "犯五黄——因色招灾、因文惹祸", huaJie: "忌动土忌绿色。宜金属摆件重金化解。书生文人需格外注意言行。" },
  "46": { geJu: "四绿木被六金克", jiXiong: "平", shengKe: "金克木", yingShi: "文昌有阻但终有成，需贵人相助", huaJie: "宜放水培植物以水泄金生木通关。考生可在此位温书。" },
  "47": { geJu: "四绿木被七金克", jiXiong: "凶", shengKe: "金克木", yingShi: "桃花劫、感情受伤、名誉受损", huaJie: "宜放黑色物品以水通关化解金木之争。此位忌粉色红色。" },
  "48": { geJu: "四八木土相克", jiXiong: "平", shengKe: "木克土", yingShi: "学业有经济压力，考试发挥受阻", huaJie: "宜放红色物品以火泄木生土通关。此位宜明亮温暖。" },
  "49": { geJu: "四绿木生九紫火", jiXiong: "吉", shengKe: "木生火", yingShi: "木火通明——文采飞扬、才华受赏识、喜结良缘", huaJie: "大吉之位。宜保持明亮通风。置书桌或画案于此大利文艺创作。" },
  "55": { geJu: "五黄重逢", jiXiong: "大凶", shengKe: "土土比和(煞重)", yingShi: "五黄双煞——伤亡之兆、瘟疫恶疾、灭门之祸", huaJie: "大凶之首！忌一切活动、忌动土。宜大量金属化煞（铜钟铜铃六帝钱）。此方位最好空置不用。" },
  "56": { geJu: "六白金泄五黄土", jiXiong: "平", shengKe: "土生金(泄煞)", yingShi: "大煞被泄转危为安，但年长者仍需注意", huaJie: "宜多放金属物品以金泄土煞。保持通风光线充足。" },
  "57": { geJu: "七赤金泄五黄土", jiXiong: "平", shengKe: "土生金(泄煞)", yingShi: "煞气减轻但有刀光之灾，防金属锐器所伤", huaJie: "宜放黑色蓝色物品以水泄金气。此位忌放刀剑锐器。" },
  "58": { geJu: "八白土助五黄土", jiXiong: "大凶", shengKe: "土土比和(助煞)", yingShi: "八白助五黄——旺财变旺灾，暴富暴败", huaJie: "忌动土忌火红。宜大量金属物品以金重泄土煞。求财需谨慎。" },
  "59": { geJu: "九紫火生五黄土", jiXiong: "大凶", shengKe: "火生土(生煞)", yingShi: "火生五黄大煞——火灾爆炸、急性恶疾、飞来横祸", huaJie: "必化解！忌红色、忌炉灶、忌电器（火）。宜金属重器+黑色水物双重化解。" },
  "66": { geJu: "六白重逢", jiXiong: "吉", shengKe: "金金比和", yingShi: "武曲双至——武贵权大、军警得势、权威在握", huaJie: "吉位。宜放黄色物品以土生金增强权威之气。" },
  "67": { geJu: "六七交剑煞", jiXiong: "凶", shengKe: "金金比和(过旺)", yingShi: "交剑煞——刀光剑影、肢体冲突、手术血光", huaJie: "宜放黑色物品以水泄金气。忌放金属锐器刀剑装饰。此位宜柔和圆润。" },
  "68": { geJu: "六白金生八白土", jiXiong: "吉", shengKe: "土生金(我生)", yingShi: "武曲生财——武贵带财、官职加薪", huaJie: "吉位。宜保持整洁。适合放置办公桌或财位。" },
  "69": { geJu: "六白金被九火克", jiXiong: "凶", shengKe: "火克金", yingShi: "火照天门——当权者受制、上级打压、权威受损", huaJie: "宜放黄色土性物品以土泄火生金通关化解。此位忌红色。" },
  "77": { geJu: "七赤重逢", jiXiong: "凶", shengKe: "金金比和(过旺)", yingShi: "双七破军——口舌是非、血光手术、偷盗抢劫", huaJie: "宜放黑色蓝色物品以水泄金气。此位忌金属过多。宜静不宜动。" },
  "78": { geJu: "七赤金生八白土", jiXiong: "吉", shengKe: "土生金(泄)", yingShi: "偏财转正财之象，意外之财到手", huaJie: "宜保持明亮。偏财旺位可放置收银台或保险柜。" },
  "79": { geJu: "七赤金被九火克", jiXiong: "凶", shengKe: "火克金", yingShi: "火熔金——投资亏损、被骗破财、因色招灾", huaJie: "宜放黄色土性物品以土泄火生金通关。投资理财需分外谨慎。" },
  "88": { geJu: "八白重逢", jiXiong: "大吉", shengKe: "土土比和", yingShi: "财星双至——正财大旺、置产置业、富甲一方", huaJie: "大吉之位，主财旺。宜放红色物品以火生土催旺。适合放置财位。" },
  "89": { geJu: "八白土被九火生", jiXiong: "大吉", shengKe: "火生土", yingShi: "火土相生——财源滚滚、喜事连连、置业兴旺", huaJie: "大吉之位。宜保持明亮，红色装饰催旺火生土之势。" },
  "99": { geJu: "九紫重逢", jiXiong: "吉", shengKe: "火火比和", yingShi: "双喜临门——婚庆添丁、名誉大振、喜庆洋洋", huaJie: "吉位但防火过旺。宜放绿色植物以木生火保持生生不息。忌水物压火。" },
};

function getGeJuKey(shanXing: number, xiangXing: number, _gong: number): string {
  // 山向星盘，用山星和向星的组合作为key
  return `${shanXing}${xiangXing}`;
}

function getYuanYun(yun: number): string {
  const yunMap: Record<number, string> = {
    1: "一白水运（坎）——主文昌，利文教事业",
    2: "二黑土运（坤）——主病符，宜稳健守成",
    3: "三碧木运（震）——主是非，宜行政司法",
    4: "四绿木运（巽）——主文昌桃花，利文艺创作",
    5: "五黄土运（中）——大煞当令，以凶化吉",
    6: "六白金运（乾）——主权贵，利军政管理",
    7: "七赤金运（兑）——主口舌，利演艺传媒",
    8: "八白土运（艮）——主正财，利地产置产",
    9: "九紫火运（离）——主喜庆，利文化创意",
  };
  return yunMap[yun] || `${yun}运`;
}

const SHOU_SHAN_CHU_SHA: ShouShanChuSha[] = [
  {
    method: "旺山旺向",
    yuanLi: "山星当令在山，向星当令在向，山向两旺为最吉之局。山管人丁水管财，山向俱旺丁财两发。",
    shiYong: "当令山星飞到坐山，当令向星飞到向方，且山向方无冲射破坏。",
    buZhou: ["确定住宅坐向(二十四山)", "排玄空飞星盘", "查山星是否到山、向星是否到向", "若山向俱旺则丁财两发无需调整", "若山向不旺则按后续方法调整"],
    zhuYi: ["必须用罗盘精确测量坐向度数", "山向盘排法分下卦与替卦须辨明", "旺山旺向不是每运每宅都能做到"],
  },
  {
    method: "上山下水（反局）",
    yuanLi: "山星飞到向方（上山），向星飞到坐山（下水），山向颠倒为最凶之局。主损丁破财，家宅衰败。",
    shiYong: "当令山星在向方，当令向星在坐山，即为上山下水。",
    buZhou: ["识别上山下水格局", "山星到向则向方宜高楼山体", "向星到山则坐山方宜水池道路", "颠倒阴阳以趋吉避凶", "严重时宜考虑搬迁或大改格局"],
    zhuYi: ["上山下水不可轻易断为全凶", "现代高层住宅坐向复杂需仔细分析", "可用城门诀辅助判断"],
  },
  {
    method: "收山出煞",
    yuanLi: "山方宜收（结实厚重），向方宜出（开阔流通）。收山以聚人气丁旺，出煞以散煞气财通。",
    shiYong: "任何格局皆可运用收山出煞原则调整环境。山方宜高厚实，向方宜低虚空。",
    buZhou: ["确定山向方位", "山方：宜高大家具、书柜、实墙", "向方：宜窗户、阳台、开阔空间", "煞方：宜遮挡化解或静置不用", "旺方：宜开门开窗纳旺气"],
    zhuYi: ["收山非封闭（要透气通风）", "出煞非漏财（要有所遮拦）", "前后左右需均衡协调"],
  },
  {
    method: "城门诀",
    yuanLi: "向方两旁之宫位为城门，若城门位有旺星飞临且向星为当令旺星，可开城门纳旺气。城门诀为旺山旺向之外的另一纳气之法。",
    shiYong: "当旺山旺向不成立时，可查向方左右两侧之城门位是否有旺气可纳。",
    buZhou: ["排算飞星盘", "定向方左右两个城门位", "查城门位向星是否为当令旺星或生气星", "若城门位有旺星可开侧门或侧窗纳气", "城门位不可有冲射煞气"],
    zhuYi: ["城门有正城门和副城门之分", "八运中每个向有两个城门位", "城门之旺气只进不出须有遮挡"],
  },
  {
    method: "七星打劫",
    yuanLi: "离宫、坎宫两宫打劫中宫旺气，以劫煞为用以旺制衰。此法为玄空高级技法，运用得当可化煞为权、劫中取财。",
    shiYong: "当旺星飞入中宫或山向不旺时，运用离坎两宫劫取中宫旺气以应变。",
    buZhou: ["查运星盘确定中宫旺气所在", "确认离宫与坎宫是否有可用之气", "在离坎两宫布风水局劫取中宫之气", "配合流年飞星动态调整", "此法高级复杂建议请专业风水师操作"],
    zhuYi: ["七星打劫非人人可用", "需结合具体住宅坐向和元运", "用得不当反招煞气", "不可滥用以免弄巧成拙"],
  },
  {
    method: "零正催照",
    yuanLi: "零神（当令向星之位）宜低宜水宜虚，正神（当令山星之位）宜高宜山宜实。催神在零神之两旁，照神在正神之两旁。四神配合得宜则风水自成。",
    shiYong: "任何住宅均可运用零正神理论调整内外环境布局。",
    buZhou: ["确定元运", "排玄空飞星盘定零正神位置", "零神方：宜开门开窗、放鱼缸水景", "正神方：宜高大柜橱、山石景观", "催照两神辅助增强零正之力"],
    zhuYi: ["零正神随元运变化需定期调整", "内外零正神需同步协调", "避免零正倒置（零方建山、正方开池）"],
  },
];

function buildFeiXingPan(yun: number, shanXingVal: number, xiangXingVal: number): FeiXingGong[] {
  // 标准的元旦盘轨迹：将运星、山星、向星按洛书九宫飞布
  // 运星按1-9宫位固定分布，山星和向星按入中后的飞星轨迹飞布
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const FEI_XING_TRAIL = [5, 6, 7, 8, 9, 1, 2, 3, 4]; // 从第1步到第9步的宫位（中宫起点已计入）

  // 飞星轨迹：以入中宫数字为基础，按洛书轨迹从小到大排列九宫位置
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const LUO_SHU_TRAIL = [9, 5, 7, 8, 1, 3, 4, 6, 2]; // 九宫飞星标准轨迹

  function flyStar(center: number): Record<number, number> {
    const result: Record<number, number> = {};
    // 按洛书轨迹分配，从入中宫数字开始逐一递减
    const order = [5, 6, 7, 8, 9, 1, 2, 3, 4]; // 宫位顺序
    for (let i = 0; i < 9; i++) {
      let val = center - i;
      while (val < 1) val += 9;
      result[order[i]] = val;
    }
    return result;
  }

  const yunStars = flyStar(yun);
  const shanStars = flyStar(shanXingVal);
  const xiangStars = flyStar(xiangXingVal);

  const pan: FeiXingGong[] = [];
  for (let gong = 1; gong <= 9; gong++) {
    const info = GONG_WEI_MAP[gong];
    const ys = yunStars[gong];
    const ss = shanStars[gong];
    const xs = xiangStars[gong];
    const key = getGeJuKey(ss, xs, gong);
    const gj = GE_JU_JI_XIONG[key] || { geJu: `${ss}${xs}组合`, jiXiong: "平", shengKe: "需具体分析", yingShi: "需结合元运和具体坐向综合判断", huaJie: "保持整洁，避免冲射" };

    pan.push({
      gongWei: info.gongWei,
      fangWei: info.fangWei,
      baGua: info.baGua,
      yunXing: ys,
      shanXing: ss,
      xiangXing: xs,
      zuHe: `${ss}-${xs}`,
      geJu: gj.geJu,
      jiXiong: gj.jiXiong,
      shengKe: gj.shengKe,
      yingShi: gj.yingShi,
      huaJie: gj.huaJie,
    });
  }

  return pan;
}

function buildAnalysis(yun: number, shanXing: number, xiangXing: number, wangShanWangXiang: boolean, shangShanXiaShui: boolean): string {
  if (wangShanWangXiang) {
    return `当前${yun}运山星${shanXing}到山、向星${xiangXing}到向，为旺山旺向大吉之局。`
      + `山管人丁水管财，山向俱旺则丁财两发。`
      + `此局宜在坐山方布置高大厚实之物以收山旺丁，向方保持开阔明亮以纳旺气进财。`;
  }
  if (shangShanXiaShui) {
    return `当前${yun}运山星${shanXing}到向、向星${xiangXing}到山，为上山下水反局。`
      + `宜颠倒阴阳——向方(山星所在)布置高大家具以收山，坐山方(向星所在)保持开阔以出煞。`
      + `严重时宜查城门诀看是否有旁门旺气可纳。`;
  }
  return `玄空${yun}运山星${shanXing}向星${xiangXing}九宫飞星盘。`
    + `旺山旺相为最吉之局，上山下水为最凶之局。`
    + `九宫之中各有吉凶，需结合具体宫位的山向组合、五行生克、外部峦头综合判断。`
    + `风水之道在于调和，凶位化解吉位催旺，非一成不变。`;
}

function getChengMenJue(yun: number, xiangXing: number): string {
  if (yun === 8 && xiangXing === 8) {
    return "八运八白当令，向星八白到向。城门在向方两旁，正城门与副城门若有旺星飞临可开城门纳旺气。";
  }
  return `当前${yun}运，向星${xiangXing}。城门诀需结合具体坐向和城门位飞星综合判断。城门之用在旺山旺向不成立时发挥效用。`;
}

export function calculateXuanKongJiuGong(input: Record<string, unknown>): XuanKongJiuGongResult {
  const yun = (input as XuanKongJiuGongInput).yun || 8;
  const shanXing = (input as XuanKongJiuGongInput).shanXing || 8;
  const xiangXing = (input as XuanKongJiuGongInput).xiangXing || 8;

  const feiXingPan = buildFeiXingPan(yun, shanXing, xiangXing);

  // 简化旺山旺向判断：山星和向星分别对应到坐山和朝向宫位时即为旺山旺向
  const wangShanWangXiang = shanXing === yun && xiangXing === yun;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shangShanXiaShui = shanXing === yun && xiangXing !== yun ? false : shanXing !== yun && xiangXing === yun ? false : !wangShanWangXiang;

  return {
    feiXingPan,
    yunXing: yun,
    shanXing,
    xiangXing,
    yuanYun: getYuanYun(yun),
    shouShanChuSha: SHOU_SHAN_CHU_SHA,
    wangShanWangXiang,
    shangShanXiaShui: !wangShanWangXiang,
    chengMenJue: getChengMenJue(yun, xiangXing),
    analysis: buildAnalysis(yun, shanXing, xiangXing, wangShanWangXiang, !wangShanWangXiang),
  };
}

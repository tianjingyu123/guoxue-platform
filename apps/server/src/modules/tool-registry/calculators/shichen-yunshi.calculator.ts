// ── 时辰运势计算引擎 ──
// 算法参考：《渊海子平》《三命通会》《黄帝内经·灵枢》《类经图翼》
// 十二时辰逐时推运，基于日干五行、十神、十二长生、日时合冲害关系

import type { ShiChenYunShiResult, ShiChenYun } from "@guoxue/shared";

// 时辰详解数据库
const SHICHEN_DETAIL: Record<string, {
  name: string; hours: string; wuXing: string; yinYang: string;
  shengXiao: string; jingLuo: string; nature: string;
  suitable: string[]; taboo: string[];
}> = {
  "子": { name: "夜半", hours: "23:00-01:00", wuXing: "水", yinYang: "阳",
    shengXiao: "鼠", jingLuo: "胆经当令", nature: "一阳初生，阴极阳生之时。宜静养安眠，忌熬夜劳神。子时水旺，水性润下，主智慧暗藏。",
    suitable: ["安眠养神","静坐冥想","子午觉"], taboo: ["熬夜","酗酒","剧烈运动"] },
  "丑": { name: "鸡鸣", hours: "01:00-03:00", wuXing: "土", yinYang: "阴",
    shengXiao: "牛", jingLuo: "肝经当令", nature: "阴气渐收，肝血归藏。丑时土旺，土主信实包容。宜深睡养血，忌情绪波动伤肝。",
    suitable: ["深度睡眠","养肝血"], taboo: ["情绪激动","暴饮暴食","饮酒"] },
  "寅": { name: "平旦", hours: "03:00-05:00", wuXing: "木", yinYang: "阳",
    shengXiao: "虎", jingLuo: "肺经当令", nature: "寅时为一日之春，木气生发。虎啸生风，阳气升腾。宜早起吐纳，呼吸新鲜空气。",
    suitable: ["晨练","深呼吸","阅读","规划"], taboo: ["赖床不起","吸烟","悲忧"] },
  "卯": { name: "日出", hours: "05:00-07:00", wuXing: "木", yinYang: "阴",
    shengXiao: "兔", jingLuo: "大肠经当令", nature: "日出东方，万物复苏。卯木柔顺，兔性机敏。宜排便清肠、洗漱更衣、进早餐。",
    suitable: ["起床洗漱","排便","早餐","晨读"], taboo: ["空腹劳作","憋便"] },
  "辰": { name: "食时", hours: "07:00-09:00", wuXing: "土", yinYang: "阳",
    shengXiao: "龙", jingLuo: "胃经当令", nature: "辰时龙行雨施，胃气最旺。宜进早餐养胃气，辰土湿润生万物。",
    suitable: ["早餐","学习","会客"], taboo: ["空腹工作","暴饮暴食","动怒"] },
  "巳": { name: "隅中", hours: "09:00-11:00", wuXing: "火", yinYang: "阴",
    shengXiao: "蛇", jingLuo: "脾经当令", nature: "巳时阳气正旺，蛇性灵动。脾主运化，此时工作效率最高。宜处理复杂事务。",
    suitable: ["工作","谈判","创作","锻炼"], taboo: ["久坐不动","过度思虑","贪睡"] },
  "午": { name: "日中", hours: "11:00-13:00", wuXing: "火", yinYang: "阳",
    shengXiao: "马", jingLuo: "心经当令", nature: "午时阳极阴生，火气最旺。宜午餐小憩，午时一阴生需闭目养神。马奔日行，能量巅峰。",
    suitable: ["午餐","午休","社交","决策"], taboo: ["过度劳累","暴晒","情绪亢奋"] },
  "未": { name: "日昳", hours: "13:00-15:00", wuXing: "土", yinYang: "阴",
    shengXiao: "羊", jingLuo: "小肠经当令", nature: "未时小肠分清泌浊，土气温和。宜处理精细事务，羊性温顺利于合作。",
    suitable: ["精细工作","学习","会客","下午茶"], taboo: ["空腹","熬夜后补充","争吵"] },
  "申": { name: "晡时", hours: "15:00-17:00", wuXing: "金", yinYang: "阳",
    shengXiao: "猴", jingLuo: "膀胱经当令", nature: "申时金气开始收敛，猴性灵动善变。宜总结复盘、灵活应变，为一日收束做好准备。",
    suitable: ["总结","复盘","运动","社交"], taboo: ["拖延","犹豫不决","久坐"] },
  "酉": { name: "日入", hours: "17:00-19:00", wuXing: "金", yinYang: "阴",
    shengXiao: "鸡", jingLuo: "肾经当令", nature: "酉时日落西山，金气肃杀收敛。鸡归巢栖，宜收心回家、进晚餐、修养身心。",
    suitable: ["晚餐","散步","家庭时光","养生"], taboo: ["加班过度","剧烈运动","争吵"] },
  "戌": { name: "黄昏", hours: "19:00-21:00", wuXing: "土", yinYang: "阳",
    shengXiao: "狗", jingLuo: "心包经当令", nature: "戌时华灯初上，土气厚重温养。犬守夜警觉，宜放松娱乐、陪家人、读书静思。",
    suitable: ["阅读","娱乐","家庭","冥想"], taboo: ["情绪抑郁","熬夜","暴饮暴食"] },
  "亥": { name: "人定", hours: "21:00-23:00", wuXing: "水", yinYang: "阴",
    shengXiao: "猪", jingLuo: "三焦经当令", nature: "亥时天地交合，水气归藏。猪性安闲，宜准备入睡。亥时水旺为明日积蓄能量。",
    suitable: ["洗漱","安眠","静思","阅读"], taboo: ["熬夜","兴奋","饮食"] },
};

// 五行生克关系
const WU_XING_MAP: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};
const YIN_YANG_MAP: Record<string, string> = {
  "甲":"阳","丙":"阳","戊":"阳","庚":"阳","壬":"阳",
  "乙":"阴","丁":"阴","己":"阴","辛":"阴","癸":"阴",
};

// 天干十二长生表（日干→时辰长生状态）
// 甲:亥长生 乙:午长生 丙:寅长生 丁:酉长生 戊:寅长生 己:酉长生 庚:巳长生 辛:子长生 壬:申长生 癸:卯长生
const CHANG_SHENG_START: Record<string, string> = {
  "甲":"亥","乙":"午","丙":"寅","丁":"酉","戊":"寅","己":"酉","庚":"巳","辛":"子","壬":"申","癸":"卯",
};
const ZHI_SEQ = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const CHANG_SHENG_NAMES = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];

// 时日关系
const LIU_HE: Record<string, string> = { "子":"丑","丑":"子","寅":"亥","亥":"寅","卯":"戌","戌":"卯","辰":"酉","酉":"辰","巳":"申","申":"巳","午":"未","未":"午" };
const LIU_CHONG: Record<string, string> = { "子":"午","丑":"未","寅":"申","卯":"酉","辰":"戌","巳":"亥","午":"子","未":"丑","申":"寅","酉":"卯","戌":"辰","亥":"巳" };
const LIU_HAI: Record<string, string> = { "子":"未","丑":"午","寅":"巳","亥":"申","卯":"辰","辰":"卯","巳":"寅","午":"丑","未":"子","申":"亥","酉":"戌","戌":"酉" };
const SAN_HE: Record<string, string[]> = {
  "申":["申","子","辰"],"子":["申","子","辰"],"辰":["申","子","辰"],
  "亥":["亥","卯","未"],"卯":["亥","卯","未"],"未":["亥","卯","未"],
  "寅":["寅","午","戌"],"午":["寅","午","戌"],"戌":["寅","午","戌"],
  "巳":["巳","酉","丑"],"酉":["巳","酉","丑"],"丑":["巳","酉","丑"],
};

export function calculateShiChenYunShi(input: Record<string, unknown>): ShiChenYunShiResult {
  const dayPillar = (input.dayPillar as string) || "戊辰";
  const riGan = dayPillar[0] || "戊";
  const riZhi = dayPillar[1] || "辰";

  const riWuXing = WU_XING_MAP[riGan] || "土";
  const riYinYang = YIN_YANG_MAP[riGan] || "阳";
  const changShengStart = CHANG_SHENG_START[riGan] || "寅";
  const changShengStartIdx = ZHI_SEQ.indexOf(changShengStart);

  const SHI_CHEN = ZHI_SEQ;

  const shiChenList: ShiChenYun[] = SHI_CHEN.map((sc, i) => {
    const detail = SHICHEN_DETAIL[sc];
    const scWuXing = detail?.wuXing || "土";
    const scYinYang = detail?.yinYang || "阳";

    let jiXiong = "平";
    const yunParts: string[] = [];
    const suitable: string[] = [];
    const taboo: string[] = [];

    // ── 1. 五行生克 ──
    let relation = "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mu=["甲","乙"], huo=["丙","丁"], tu=["戊","己"], jin=["庚","辛"], shui=["壬","癸"];
    const riWxIn = riWuXing;
    const scWxIn = scWuXing;

    // 生我：水→木, 木→火, 火→土, 土→金, 金→水
    const shengWo = (riWxIn === "木" && scWxIn==="水") || (riWxIn==="火" && scWxIn==="木") ||
      (riWxIn==="土" && scWxIn==="火") || (riWxIn==="金" && scWxIn==="土") || (riWxIn==="水" && scWxIn==="金");
    // 我生：木→火, 火→土, 土→金, 金→水, 水→木
    const woSheng = (riWxIn === "木" && scWxIn==="火") || (riWxIn==="火" && scWxIn==="土") ||
      (riWxIn==="土" && scWxIn==="金") || (riWxIn==="金" && scWxIn==="水") || (riWxIn==="水" && scWxIn==="木");
    // 克我：金→木, 水→火, 木→土, 火→金, 土→水
    const keWo = (riWxIn === "木" && scWxIn==="金") || (riWxIn==="火" && scWxIn==="水") ||
      (riWxIn==="土" && scWxIn==="木") || (riWxIn==="金" && scWxIn==="火") || (riWxIn==="水" && scWxIn==="土");
    // 我克：木→土, 火→金, 土→水, 金→木, 水→火
    const woKe = (riWxIn === "木" && scWxIn==="土") || (riWxIn==="火" && scWxIn==="金") ||
      (riWxIn==="土" && scWxIn==="水") || (riWxIn==="金" && scWxIn==="木") || (riWxIn==="水" && scWxIn==="火");

    if (scWuXing === riWuXing) {
      relation = "比和";
      yunParts.push("比和之辰，五行同气");
      suitable.push(...(detail?.suitable || []));
    } else if (shengWo) {
      jiXiong = "吉"; relation = "生我";
      yunParts.push("生我之辰，得气滋养，运势上升");
      suitable.push("求财","谋事","会客","签约","出行");
    } else if (woSheng) {
      relation = "我生";
      yunParts.push("我生之辰，泄气耗神");
      suitable.push("学习","思考","创作","授业");
      taboo.push("重大决策","体力劳作");
    } else if (keWo) {
      jiXiong = "凶"; relation = "克我";
      yunParts.push("克我之辰，受制受压，运势低迷");
      taboo.push("出行","签约","重要决策","动土","开业");
    } else if (woKe) {
      relation = "我克";
      yunParts.push("我克之辰，劳心费神，有得有失");
      suitable.push("交易","理财","竞争");
      taboo.push("合作","借贷");
    }

    // ── 2. 时辰十神 ──
    let shiShen = "";
    if (relation === "比和") {
      shiShen = scYinYang === riYinYang ? "比肩" : "劫财";
    } else if (relation === "生我") {
      shiShen = scYinYang === riYinYang ? "偏印" : "正印";
    } else if (relation === "我生") {
      shiShen = scYinYang === riYinYang ? "食神" : "伤官";
    } else if (relation === "克我") {
      shiShen = scYinYang === riYinYang ? "七杀" : "正官";
    } else if (relation === "我克") {
      shiShen = scYinYang === riYinYang ? "偏财" : "正财";
    }
    if (shiShen) yunParts.push(`十神：${shiShen}`);

    // ── 3. 十二长生 ──
    const csIdx = (changShengStartIdx + i) % 12;
    const csName = CHANG_SHENG_NAMES[csIdx];
    if (csName) {
      const csQuality: Record<string, string> = {
        "长生":"旺","沐浴":"平","冠带":"旺","临官":"旺","帝旺":"极旺",
        "衰":"弱","病":"弱","死":"弱","墓":"弱","绝":"极弱","胎":"平","养":"平",
      };
      if (csQuality[csName] === "旺" || csQuality[csName] === "极旺") {
        if (jiXiong === "平") jiXiong = "吉";
        yunParts.push(`十二长生：${csName}（${csQuality[csName]}）`);
      } else if (csQuality[csName] === "弱" || csQuality[csName] === "极弱") {
        if (jiXiong === "平") jiXiong = "凶";
        yunParts.push(`十二长生：${csName}（${csQuality[csName]}）`);
      } else {
        yunParts.push(`十二长生：${csName}`);
      }
    }

    // ── 4. 日时合冲害 ──
    if (LIU_HE[riZhi] === sc) {
      if (jiXiong === "凶") jiXiong = "平";
      else jiXiong = "吉";
      yunParts.push("日时六合，天地和合，大吉之象");
      suitable.push("婚嫁","合作","签约");
    }
    if (LIU_CHONG[riZhi] === sc) {
      jiXiong = "凶";
      yunParts.push("日时六冲，动荡不安，诸事不宜");
      taboo.push("婚嫁","出行","签约","动土","开业");
    }
    if (LIU_HAI[riZhi] === sc) {
      if (jiXiong !== "大凶" && jiXiong !== "凶") jiXiong = "凶";
      yunParts.push("日时六害，暗中相害，防小人暗算");
      taboo.push("合作","签约","借贷");
    }
    // 三合/半合
    const riSanHe = SAN_HE[riZhi];
    if (riSanHe && riSanHe.slice(1).includes(sc)) {
      if (jiXiong === "平") jiXiong = "吉";
      yunParts.push("日时三合局半合，得局气相助");
      suitable.push("合作","谋事","出行");
    }

    // ── 5. 时辰特性 ──
    if (detail?.nature) {
      yunParts.push(detail.nature.substring(0, 40));
    }

    // ── 6. 经络当令提示 ──
    if (detail?.jingLuo) {
      yunParts.push(detail.jingLuo);
    }

    // 合并宜忌（去重）
    const addItems = (target: string[], src: string[]) => {
      for (const s of src) { if (!target.includes(s)) target.push(s); }
    };
    addItems(suitable, detail?.suitable || []);
    addItems(taboo, detail?.taboo || []);

    // 构建yunShi
    const yunShi = yunParts.join("；");

    return {
      shiChen: `${sc}时（${detail?.name || sc}）${detail?.hours || ""}`,
      jiXiong,
      yunShi,
      suitable,
      taboo,
    };
  });

  const jiTimes = shiChenList.filter(s => s.jiXiong === "吉");
  const xiongTimes = shiChenList.filter(s => s.jiXiong === "凶");

  const summary = [
    `【十二时辰运势】日主${riGan}（${riWuXing}${riYinYang}），日支${riZhi}`,
    ``,
    `┌─ 时辰运势总览 ─────────────────`,
    `│ 吉时（${jiTimes.length}个）：${jiTimes.map(s => s.shiChen).join("、") || "无"}`,
    `│ 凶时（${xiongTimes.length}个）：${xiongTimes.map(s => s.shiChen).join("、") || "无"}`,
    ``,
    `├─ 各时辰详解 ─────────────────`,
    ...shiChenList.map(s => {
      const ar = s.jiXiong === "吉" ? "○" : s.jiXiong === "凶" ? "●" : "◎";
      return `│ ${ar} ${s.shiChen}：${s.yunShi.substring(0, 60)}`;
    }),
    ``,
    `├─ 择时要点 ─────────────────`,
    `│ 1. 首选生我之辰（正印偏印方），得贵人助运势旺`,
    `│ 2. 次选与日支六合或三合之时，天地合和大利百事`,
    `│ 3. 帝旺/临官之辰能量最强，宜行大事`,
    `│ 4. 避开日时六冲/六害之时，冲则散害则损`,
    `│ 5. 避开克我之辰（正官七杀方），受制受压难施展`,
    `│ 6. 我生之辰（食神伤官方）宜创作不宜决策`,
    ``,
    `├─ 养生时辰 ─────────────────`,
    `│ · 子丑时（23-03点）：肝胆经当令，务必安睡`,
    `│ · 寅卯时（03-07点）：肺大肠经当令，宜起床排便`,
    `│ · 辰巳时（07-11点）：脾胃经当令，宜早餐工作`,
    `│ · 午时（11-13点）：心经当令，宜午休片刻`,
    `│ · 申酉时（15-19点）：肾膀胱经当令，宜运动晚餐`,
    `│ · 亥时（21-23点）：三焦经当令，宜洗漱安眠`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《渊海子平》：「时日相合，主一生和顺；时日相冲，主一生动荡。」`,
    `   《三命通会》：「日时者，命之门户。日时和则晚景安宁。」`,
    `   《黄帝内经·灵枢》：「经脉流行不止，与天同度，合于四时五脏阴阳。」`,
    `   《类经图翼》：「子午为经，卯酉为纬，一日一夜，凡一万三千五百息。」`,
    ``,
    `时辰者，一日之节律也。顺时则气畅，逆时则气塞。择吉时行事，事半功倍；避凶时行事，趋吉避凶。`,
  ].filter(Boolean).join("\n");

  return { shiChenList, summary };
}

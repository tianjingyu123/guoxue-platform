/**
 * 案例库种子 —— 少量真实案例，供「看效果」用。
 *
 * 🔴 三条自律，违反任何一条这批数据就没有存在价值：
 *
 * 1. **四柱绝不手写**。人物只提供【公开史料的生辰】，四柱一律由排盘引擎
 *    （packages/shared/src/paipan/ganzhi.ts，被 16 套黄金测试钉死）现算。
 *    我凭记忆敲的四柱有可能错一个字，而案例库是拿来给爱好者对答案的——
 *    四柱错了，整条案例就是在教错东西。
 *
 * 2. **人生经历只取公开史料，不编**。案例的答案就是这个人的真实人生经历
 *    （董事长原话：「断语和思路只是参考」）。编一段经历配上真八字，
 *    比没有案例坏得多。
 *
 * 3. **时辰存疑就写出来**。古人生辰记到时辰的极少，命理界流传的时辰多为
 *    转录甚至推定。每条案例的 tags 里都标注时辰依据，不装作确凿。
 *
 * 因此这里只有寥寥几条：不是懒，是我只放了自己敢负责的。
 * 正式补全（互联网收集脱敏 / 用户投稿 / 古籍整理）按董事长拍板放在**正式上线之后**，
 * 以减轻数据库迁移压力。
 *
 * 用法（默认只预演、不写库）：
 *   npx tsx prisma/seeds/bazi-cases.seed.ts           # 预演：算出四柱并打印，不碰数据库
 *   npx tsx prisma/seeds/bazi-cases.seed.ts --apply   # 真正写入
 */
import { PrismaClient } from "@prisma/client";
import {
  yearGanzhi,
  monthGanzhi,
  dayGanzhi,
  hourGanzhi,
} from "@guoxue/shared/paipan";

const prisma = new PrismaClient();

interface SeedCase {
  /** 公历生辰（史学界公认的换算结果） */
  birth: { y: number; m: number; d: number; hour: number };
  /** 时辰的依据 —— 存疑就说存疑 */
  hourBasis: string;
  gender: "male" | "female";
  title: string;
  realName: string;
  era: string;
  tags: string[];
  /** 答案：真实人生经历（六维度，全部出自公开史料） */
  life: {
    career: string;
    marriage: string;
    wealth: string;
    health: string;
    family: string;
    character: string;
  };
  /** 大事年表 —— 爱好者用来验应期 */
  events: { year: number; event: string }[];
  /** 参考断语（明确不是答案） */
  commentary?: string;
  commentarySrc?: string;
}

const CASES: SeedCase[] = [
  {
    // 清圣祖玄烨。生辰：顺治十一年三月十八日巳时，公历 1654-05-04。
    birth: { y: 1654, m: 5, d: 4, hour: 10 },
    hourBasis: "巳时（《清实录》《玉牒》记于巳时；宫廷记档相对可靠）",
    gender: "male",
    title: "清圣祖 玄烨",
    realName: "爱新觉罗·玄烨",
    era: "清初",
    tags: ["帝王", "史料案例", "时辰据清宫记档"],
    life: {
      career:
        "八岁即位，十四岁亲政，十六岁智擒鳌拜收回大权。在位六十一年（1661—1722），为中国历史上在位最久的皇帝。平三藩、收台湾、亲征噶尔丹、与沙俄订《尼布楚条约》，奠定清代疆域。",
      marriage:
        "后妃众多。元后赫舍里氏于生育胤礽时难产崩逝（1674），年仅二十一；此后再未立后（孝昭、孝懿两位皇后亦相继早逝，均在位极短）。",
      wealth: "一国之富，然本人生活俭素，屡次蠲免钱粮、废止圈地。",
      health:
        "早年出过天花而得生（正因已出痘、不惧再染，才被选为嗣君），体质尚健；晚年苦于头晕、心悸、腿疾，末年精力大衰。享年六十八。",
      family:
        "父顺治帝二十四岁早崩（其时玄烨八岁），母佟佳氏在其十岁时亦逝——少年即父母双亡，由祖母孝庄太后抚育。子嗣极盛，序齿皇子二十四人，晚年为储位酿成「九子夺嫡」，两立两废太子胤礽，父子相残为其一生最痛。",
      character:
        "勤政自持，日御门听政数十年不辍；好学不倦，兼习西洋历算、几何。用人能容，亦能忍狠（擒鳌拜、废太子皆果决）。晚年趋于宽仁近于姑息，吏治因之废弛。",
    },
    events: [
      { year: 1661, event: "父顺治帝崩，八岁即位，四辅臣辅政" },
      { year: 1667, event: "十四岁亲政" },
      { year: 1669, event: "十六岁智擒鳌拜，收回大权" },
      { year: 1673, event: "撤藩，三藩之乱起（战事延八年）" },
      { year: 1674, event: "元后赫舍里氏产胤礽后崩逝" },
      { year: 1681, event: "平定三藩" },
      { year: 1683, event: "收台湾" },
      { year: 1689, event: "《尼布楚条约》定中俄东段边界" },
      { year: 1708, event: "初废太子胤礽（次年复立）" },
      { year: 1712, event: "再废太子，储位遂空，九子夺嫡" },
      { year: 1722, event: "崩，年六十八" },
    ],
    commentary:
      "命理界旧论多着眼于「少年失怙、以幼冲之年临大位」与「晚岁子息之累」。此仅为参考思路，答案以上列真实经历为准。",
    commentarySrc: "近代命理著述中的流传论断（非古籍原文）",
  },
  {
    // 曾国藩。生辰：嘉庆十六年十月十一日亥时，公历 1811-11-26。
    birth: { y: 1811, m: 11, d: 26, hour: 22 },
    hourBasis: "亥时（据其家谱与年谱流传之说；非官修档案，时辰存疑）",
    gender: "male",
    title: "曾国藩",
    realName: "曾国藩",
    era: "晚清",
    tags: ["名臣", "史料案例", "时辰存疑"],
    life: {
      career:
        "湖南乡下耕读之家出身，二十八岁中进士入翰林，十年七迁，三十七岁官至二品。1853 年丁忧在籍时奉命办团练，创湘军。屡战屡败——靖港之败、湖口之败两度投水自尽被救。终在 1864 年攻克天京，平太平天国，封一等毅勇侯，位极人臣。晚年办洋务、处理天津教案而声名大损。",
      marriage: "娶欧阳氏，白首偕老，未闻婚变。",
      wealth:
        "手握军权与厘金，然自奉极俭，不置田宅。身后家产薄，家书中屡诫子弟「勿贪为官发财」。",
      health:
        "长年苦于癣疾（终身不愈，奇痒难眠）、目疾（晚年右目失明）、失眠眩晕。1872 年卒于两江总督任上，年六十一。",
      family:
        "兄弟五人皆入湘军，弟曾国荃为攻克天京主将；弟曾国华战死三河（1858）。子曾纪泽为出使英法俄大臣，收回伊犁；子曾纪鸿治算学。家风所延，后世三代不衰。",
      character:
        "资质不高而以「拙诚」自立，日课十二条、写日记自省数十年不辍。「屡败屡战」四字为其一生写照。极重克己，亦以严酷著称（时人号「曾剃头」）。",
    },
    events: [
      { year: 1838, event: "二十八岁中进士，入翰林院" },
      { year: 1852, event: "母丧丁忧回籍" },
      { year: 1853, event: "奉命办团练，湘军创立" },
      { year: 1854, event: "靖港大败，投水自尽被部下救起" },
      { year: 1855, event: "湖口大败，座船被夺，再度投水" },
      { year: 1858, event: "弟曾国华战死三河镇" },
      { year: 1860, event: "授两江总督，统辖四省军务，权势始盛" },
      { year: 1864, event: "湘军克天京，太平天国亡；封一等毅勇侯" },
      { year: 1870, event: "办天津教案，举国唾骂，声名大损" },
      { year: 1872, event: "卒于两江总督任，年六十一" },
    ],
    commentary:
      "旧论常以「拙而能恒」「屡踬屡起」立说。此为参考，答案以真实经历为准。",
    commentarySrc: "近代命理著述中的流传论断（非古籍原文）",
  },
];

/** 质量分：与后端 scoreQuality 同口径（维度×8 + 年表×8 上限5条 + 12） */
function scoreQuality(c: SeedCase): number {
  const dims = Object.values(c.life).filter((v) => v && v.trim()).length;
  const evs = Math.min(c.events.length, 5);
  let s = dims * 8 + evs * 8;
  if (evs && dims) s += 12;
  return Math.min(s, 100);
}

async function main() {
  const apply = process.argv.includes("--apply");

  for (const c of CASES) {
    const { y, m, d, hour } = c.birth;
    // 四柱现算，绝不手写
    const yp = yearGanzhi(y, m, d, hour);
    const mp = monthGanzhi(y, m, d, hour);
    const dp = dayGanzhi(y, m, d, hour);
    const hp = hourGanzhi(dp.gan, hour);

    const pillars = {
      yearPillar: `${yp.gan}${yp.zhi}`,
      monthPillar: `${mp.gan}${mp.zhi}`,
      dayPillar: `${dp.gan}${dp.zhi}`,
      hourPillar: `${hp.gan}${hp.zhi}`,
    };
    const quality = scoreQuality(c);

    console.log(
      `${c.title.padEnd(12)} ${y}-${m}-${d} ${hour}时 → ` +
        `${pillars.yearPillar} ${pillars.monthPillar} ${pillars.dayPillar} ${pillars.hourPillar}  ` +
        `质量分 ${quality}  时辰依据：${c.hourBasis}`,
    );

    if (!apply) continue;

    // 同一人物（真名 + 日柱）已存在就跳过，反复跑不会重复灌
    const existing = await prisma.baziCase.findFirst({
      where: { realName: c.realName, dayPillar: pillars.dayPillar },
    });
    if (existing) {
      console.log(`  ↳ 已存在，跳过`);
      continue;
    }

    await prisma.baziCase.create({
      data: {
        gender: c.gender,
        ...pillars,
        birthYear: y,
        birthMonth: m,
        birthDay: d,
        birthHour: hour,
        source: "CELEBRITY",
        title: c.title,
        realName: c.realName, // 历史人物、公开史料 → 可具名（用户投稿恒为 null）
        era: c.era,
        tags: [...c.tags, c.hourBasis],
        life: c.life,
        events: c.events,
        commentary: c.commentary,
        commentarySrc: c.commentarySrc,
        status: "APPROVED",
        reviewedBy: "SYSTEM",
        reviewedAt: new Date(),
        reviewNote: "种子案例：生辰取自公开史料，四柱由排盘引擎计算",
        consent: true, // 公开史料中的历史人物，不涉在世者授权
        desensitized: true,
        quality,
        isPremium: false, // 种子案例开放给所有人，不作高阶解锁门槛
      },
    });
    console.log(`  ↳ 已写入`);
  }

  if (!apply) {
    console.log("\n[预演] 未写数据库。确认无误后加 --apply。");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

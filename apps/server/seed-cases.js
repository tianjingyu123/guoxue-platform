const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const cases = [
  { name: "刘邦", gender: "male", description: "西汉开国皇帝", subtitle: "汉代", primaryCat: "名人案例", secondaryCat: "君主", bazi: ["乙","戊","丁","甲","巳","子","卯","辰"], letter: "L", zodiac: "蛇" },
  { name: "李世民", gender: "male", description: "唐太宗", subtitle: "盛唐", primaryCat: "名人案例", secondaryCat: "君主", bazi: ["戊","己","丙","壬","午","未","辰","辰"], letter: "L", zodiac: "龙" },
  { name: "朱元璋", gender: "male", description: "明太祖", subtitle: "明代", primaryCat: "名人案例", secondaryCat: "君主", bazi: ["戊","壬","丁","庚","辰","戌","丑","子"], letter: "Z", zodiac: "龙" },
  { name: "康熙", gender: "male", description: "清圣祖", subtitle: "清代", primaryCat: "名人案例", secondaryCat: "君主", bazi: ["甲","戊","乙","丙","午","辰","巳","子"], letter: "K", zodiac: "马" },
  { name: "马云", gender: "male", description: "阿里巴巴创始人", subtitle: "互联网商业", primaryCat: "名人案例", secondaryCat: "商界", bazi: ["甲","丙","甲","乙","辰","子","子","丑"], letter: "M", zodiac: "龙" },
  { name: "李白", gender: "male", description: "唐代诗人", subtitle: "诗仙", primaryCat: "名人案例", secondaryCat: "文艺", bazi: ["辛","丙","壬","庚","丑","申","辰","子"], letter: "L", zodiac: "牛" },
  { name: "苏轼", gender: "male", description: "北宋文学家", subtitle: "文豪", primaryCat: "名人案例", secondaryCat: "文艺", bazi: ["戊","己","甲","丁","辰","未","申","卯"], letter: "S", zodiac: "龙" },
  { name: "乔丹", gender: "male", description: "NBA传奇球星", subtitle: "篮球", primaryCat: "名人案例", secondaryCat: "体育", bazi: ["壬","癸","丙","戊","寅","丑","午","子"], letter: "Q", zodiac: "虎" },
  { name: "关羽", gender: "male", description: "三国名将", subtitle: "武圣", primaryCat: "名人案例", secondaryCat: "历史", bazi: ["辛","戊","戊","壬","丑","戌","申","子"], letter: "G", zodiac: "牛" },
  { name: "诸葛亮", gender: "male", description: "三国丞相", subtitle: "卧龙", primaryCat: "名人案例", secondaryCat: "军事", bazi: ["壬","丙","甲","己","子","午","辰","巳"], letter: "Z", zodiac: "鼠" },
  { name: "六祖惠能", gender: "male", description: "禅宗六祖", subtitle: "禅宗", primaryCat: "名人案例", secondaryCat: "僧道", bazi: ["戊","甲","壬","丁","申","子","辰","未"], letter: "L", zodiac: "猴" },
  { name: "财运案例01", gender: "male", description: "白手起家商人命", subtitle: "富命", primaryCat: "大众案例", secondaryCat: "财运", bazi: ["辛","丙","丁","甲","丑","申","未","辰"], letter: "C", zodiac: "牛" },
  { name: "婚姻案例01", gender: "female", description: "晚婚幸福命", subtitle: "良缘", primaryCat: "大众案例", secondaryCat: "婚姻", bazi: ["壬","甲","丙","己","申","辰","申","亥"], letter: "H", zodiac: "猴" },
  { name: "长寿案例01", gender: "male", description: "百岁老人命", subtitle: "寿星", primaryCat: "大众案例", secondaryCat: "长寿", bazi: ["甲","癸","丙","丁","子","酉","辰","酉"], letter: "C", zodiac: "鼠" },
];

async function main() {
  const count = await p.celebrityCase.count();
  if (count > 0) {
    console.log("Already has", count, "cases, skipping seed.");
    return;
  }
  for (const c of cases) {
    await p.celebrityCase.create({ data: {
      ...c,
      sortOrder: 0,
    }});
  }
  console.log("Seeded", cases.length, "celebrity cases.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

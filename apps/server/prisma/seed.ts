import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始填充种子数据...");

  // 1. 创建管理员用户
  const adminPwd = await bcrypt.hash("guoxue123", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "13800000000" },
    update: {},
    create: {
      phone: "13800000000",
      nickname: "国学管理员",
      avatar: "/static/avatars/admin.png",
      auths: { create: { provider: "PASSWORD", credential: adminPwd } },
      roles: { create: { roleType: "SUPER_ADMIN" } },
    },
  });
  console.log("✅ 管理员: " + admin.nickname);

  // 2. 创建讲师用户
  const teacherPwd = await bcrypt.hash("teacher123", 10);
  const teacher = await prisma.user.upsert({
    where: { phone: "13800000001" },
    update: {},
    create: {
      phone: "13800000001",
      nickname: "李玄明",
      avatar: "/static/avatars/teacher1.png",
      auths: { create: { provider: "PASSWORD", credential: teacherPwd } },
      roles: { create: { roleType: "LECTURER" } },
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { phone: "13800000002" },
    update: {},
    create: {
      phone: "13800000002",
      nickname: "王清音",
      avatar: "/static/avatars/teacher2.png",
      auths: { create: { provider: "PASSWORD", credential: teacherPwd } },
      roles: { create: { roleType: "LECTURER" } },
    },
  });
  console.log("✅ 讲师: " + teacher.nickname + ", " + teacher2.nickname);

  // 3. 创建圈子
  const circlesData = [
    {
      name: "道德经研习社",
      intro: "每日一章《道德经》，探讨老子智慧，体悟大道玄妙。",
      type: "FREE" as const,
      tags: ["道德经", "老子", "道家"],
    },
    {
      name: "易经天地",
      intro: "学易、玩易、用易——六十四卦的智慧，照亮人生抉择。",
      type: "FREE" as const,
      tags: ["易经", "六十四卦", "占卜"],
    },
    {
      name: "诗词雅集",
      intro: "唐诗宋词赏析，原创诗词交流，以诗会友。",
      type: "FREE" as const,
      tags: ["诗词", "唐诗", "宋词"],
    },
    {
      name: "命理研习堂",
      intro: "八字、紫微、风水——传统术数学习交流，排盘答疑。",
      type: "PAID" as const,
      price: 99,
      tags: ["八字", "紫微", "风水", "命理"],
    },
    {
      name: "论语共读",
      intro: "每日一则《论语》，结合生活践行儒家修身之道。",
      type: "FREE" as const,
      tags: ["论语", "儒家", "修身"],
    },
    {
      name: "国学茶话会",
      intro: "不拘一格谈国学：历史、哲学、书法、茶道、中医，无所不包。",
      type: "FREE" as const,
      tags: ["国学", "传统文化", "综合"],
    },
  ];

  const circles: any[] = [];
  for (const c of circlesData) {
    const circle = await prisma.circle.create({
      data: {
        ...c,
        ownerId: admin.id,
        status: "ACTIVE",
        memberCount: Math.floor(Math.random() * 500) + 100,
        postCount: Math.floor(Math.random() * 200) + 50,
      },
    });
    circles.push(circle);
    // 加管理员为成员
    await prisma.circleMember.create({
      data: { circleId: circle.id, userId: admin.id, role: "OWNER" },
    });
  }
  console.log("✅ 圈子: " + circles.length + " 个");

  // 4. 创建文章（经典摘录 + 诗词）
  const articlesData = [
    {
      title: "《道德经》第一章：道可道，非常道",
      excerpt: "道可道，非常道；名可名，非常名。无名天地之始，有名万物之母...",
      content: `<h2>原文</h2><p>道可道，非常道；名可名，非常名。</p><p>无名天地之始，有名万物之母。</p><p>故常无欲，以观其妙；常有欲，以观其徼。</p><p>此两者同出而异名，同谓之玄。玄之又玄，众妙之门。</p><h2>白话译文</h2><p>可以用语言表达的道，就不是永恒不变的道；可以用名字称呼的名，就不是永恒不变的名。无，是天地形成的本始；有，是创生万物的根源。所以常从无中，去观照道的奥秘；常从有中，去观照道的端倪。无和有这两者，来源相同而名称相异，都可以称之为玄妙。玄妙之中还有更深层的玄妙，是一切微妙的总门。</p><h2>解读</h2><p>《道德经》开篇即点明了"道"的不可言说性。真正的道超越了语言概念，言语只是在指向道，而非道本身。这启示我们：在研习经典时，切忌拘泥于文字表面，而要领会言外之意。</p>`,
      tags: ["道德经", "道家", "经典"],
      cover: "/static/covers/daodejing.jpg",
      circleIdx: 0,
      isPushHome: true,
    },
    {
      title: "《论语·学而》开篇三章",
      excerpt: "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
      content: `<h2>学而篇第一</h2><h3>1.1</h3><p>子曰：「学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？」</p><h3>1.2</h3><p>有子曰：「其为人也孝弟，而好犯上者，鲜矣；不好犯上，而好作乱者，未之有也。君子务本，本立而道生。孝弟也者，其为仁之本与！」</p><h3>1.3</h3><p>子曰：「巧言令色，鲜矣仁！」</p><h2>英译</h2><p>The Master said: "Is it not pleasant to learn with a constant perseverance and application? Is it not delightful to have friends coming from distant quarters? Is he not a man of complete virtue, who feels no discomposure though men may take no note of him?"</p><h2>解读</h2><p>孔子在这三章中，分别谈论了学习之乐、交友之乐和修养之境界。《学而》是《论语》第一篇，这三章奠定了儒家的核心精神：不断学习、善待他人、修养自身。</p>`,
      tags: ["论语", "儒家", "经典"],
      cover: "/static/covers/lunyu.jpg",
      circleIdx: 4,
      isPushHome: true,
    },
    {
      title: "《静夜思》李白 — 千古思乡绝唱",
      excerpt: "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
      content: `<h2>原文</h2><p>床前明月光，<br/>疑是地上霜。<br/>举头望明月，<br/>低头思故乡。</p><h2>赏析</h2><p>此诗以平淡自然的语言，写出游子静夜思乡之情。"疑是地上霜"以错觉入笔，生动写出月光的洁白明亮；"举头""低头"两个动作，将望月与思乡自然勾连。全诗仅二十字，却是中国最广为流传的唐诗，被誉为"千古思乡第一诗"。</p><h2>创作背景</h2><p>李白二十六岁时，客居扬州旅舍。一个明月之夜，诗人抬头望月，思乡之情油然而生，写下了这首千古名篇。</p>`,
      tags: ["唐诗", "李白", "思乡"],
      cover: "/static/covers/libai.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《水调歌头》苏轼 — 明月几时有",
      excerpt: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年。",
      content: `<h2>原文</h2><p>明月几时有？把酒问青天。<br/>不知天上宫阙，今夕是何年。<br/>我欲乘风归去，又恐琼楼玉宇，高处不胜寒。<br/>起舞弄清影，何似在人间。</p><p>转朱阁，低绮户，照无眠。<br/>不应有恨，何事长向别时圆？<br/>人有悲欢离合，月有阴晴圆缺，此事古难全。<br/>但愿人长久，千里共婵娟。</p><h2>赏析</h2><p>苏轼以中秋明月为引，抒发了对人生离合的豁达感悟。"人有悲欢离合，月有阴晴圆缺"以自然现象比喻人生境遇，将个人情感升华为普遍哲理。"但愿人长久，千里共婵娟"成为千古传颂的名句。</p><h2>创作背景</h2><p>此词作于宋神宗熙宁九年（1076年）中秋，苏轼时在密州。词前有小序："丙辰中秋，欢饮达旦，大醉，作此篇，兼怀子由。"子由是苏轼的弟弟苏辙。</p>`,
      tags: ["宋词", "苏轼", "中秋"],
      cover: "/static/covers/sushi.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《易经》乾卦：天行健，君子以自强不息",
      excerpt: "乾：元，亨，利，贞。天行健，君子以自强不息。",
      content: `<h2>乾卦原文</h2><p>乾：元，亨，利，贞。</p><p>《彖》曰：大哉乾元，万物资始，乃统天。云行雨施，品物流形。</p><p>《象》曰：天行健，君子以自强不息。</p><h2>解读</h2><p>乾卦是《易经》首卦，象征天、阳、刚健、创造。四个字"元亨利贞"代表事物发展的四个阶段：创始（元）、亨通（亨）、和谐（利）、正固（贞）。"天行健，君子以自强不息"告诉我们要像天体运行一样，永不停止地努力奋进。</p><h2>六爻</h2><p>初九：潜龙勿用。<br/>九二：见龙在田，利见大人。<br/>九三：君子终日乾乾，夕惕若厉，无咎。<br/>九四：或跃在渊，无咎。<br/>九五：飞龙在天，利见大人。<br/>上九：亢龙有悔。</p>`,
      tags: ["易经", "乾卦", "经典"],
      cover: "/static/covers/yijing.jpg",
      circleIdx: 1,
      isPushHome: true,
    },
    {
      title: "《大学》开篇：三纲领八条目",
      excerpt: "大学之道，在明明德，在亲民，在止于至善。",
      content: `<h2>原文</h2><p>大学之道，在明明德，在亲民，在止于至善。</p><p>知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。</p><p>物有本末，事有终始，知所先后，则近道矣。</p><p>古之欲明明德于天下者，先治其国；欲治其国者，先齐其家；欲齐其家者，先修其身；欲修其身者，先正其心；欲正其心者，先诚其意；欲诚其意者，先致其知；致知在格物。</p><h2>解读</h2><p>《大学》提出了儒家修养的完整纲领：三纲领（明明德、亲民、止于至善）和八条目（格物、致知、诚意、正心、修身、齐家、治国、平天下）。这是一个从内到外、从个人到天下的完整修养路径。</p>`,
      tags: ["大学", "儒家", "经典"],
      cover: "/static/covers/daxue.jpg",
      circleIdx: 4,
      isPushHome: false,
    },
    {
      title: "《心经》全文 — 般若波罗蜜多心经",
      excerpt: "观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。",
      content: `<h2>全文</h2><p>观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。</p><p>舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。</p><p>舍利子，是诸法空相，不生不灭，不垢不净，不增不减。</p><p>是故空中无色，无受想行识，无眼耳鼻舌身意，无色声香味触法，无眼界，乃至无意识界。</p><p>无无明，亦无无明尽，乃至无老死，亦无老死尽。</p><p>无苦集灭道，无智亦无得。以无所得故，菩提萨埵，依般若波罗蜜多故，心无挂碍，无挂碍故，无有恐怖，远离颠倒梦想，究竟涅槃。</p><p>三世诸佛，依般若波罗蜜多故，得阿耨多罗三藐三菩提。</p><p>故知般若波罗蜜多，是大神咒，是大明咒，是无上咒，是无等等咒，能除一切苦，真实不虚。</p><p>故说般若波罗蜜多咒，即说咒曰：</p><p>揭谛揭谛，波罗揭谛，波罗僧揭谛，菩提萨婆诃。</p><h2>解读</h2><p>《心经》是汉传佛教最短的经典之一，仅260字，却浓缩了般若经的核心思想。"色即是空，空即是色"道出了现象与本质的不二关系。经文以"照见五蕴皆空"开篇，以"能除一切苦"收尾，是一部关于解脱智慧的精华。</p>`,
      tags: ["心经", "佛学", "经典"],
      cover: "/static/covers/xinjing.jpg",
      circleIdx: 0,
      isPushHome: false,
    },
    {
      title: "《黄帝内经》四季调神大论",
      excerpt: "春三月，此谓发陈。天地俱生，万物以荣。夜卧早起，广步于庭。",
      content: `<h2>春三月</h2><p>春三月，此谓发陈。天地俱生，万物以荣。夜卧早起，广步于庭，被发缓形，以使志生。生而勿杀，予而勿夺，赏而勿罚。此春气之应，养生之道也。</p><h2>夏三月</h2><p>夏三月，此谓蕃秀。天地气交，万物华实。夜卧早起，无厌于日。使志无怒，使华英成秀，使气得泄，若所爱在外。此夏气之应，养长之道也。</p><h2>秋三月</h2><p>秋三月，此谓容平。天气以急，地气以明。早卧早起，与鸡俱兴。使志安宁，以缓秋刑；收敛神气，使秋气平；无外其志，使肺气清。此秋气之应，养收之道也。</p><h2>冬三月</h2><p>冬三月，此谓闭藏。水冰地坼，无扰乎阳。早卧晚起，必待日光。使志若伏若匿，若有私意，若已有得。去寒就温，无泄皮肤，使气亟夺。此冬气之应，养藏之道也。</p><h2>解读</h2><p>《黄帝内经》的四季养生理论，体现了中医"天人合一"的核心思想。人的作息、情志、饮食都应顺应四时变化。这套养生体系，两千多年来一直指导着中国人的日常生活。</p>`,
      tags: ["黄帝内经", "中医", "养生"],
      cover: "/static/covers/neijing.jpg",
      circleIdx: 5,
      isPushHome: false,
    },
    // ── 诗词 ──
    {
      title: "《春望》杜甫 — 国破山河在",
      excerpt: "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。",
      content: `<h2>原文</h2><p>国破山河在，<br/>城春草木深。<br/>感时花溅泪，<br/>恨别鸟惊心。<br/>烽火连三月，<br/>家书抵万金。<br/>白头搔更短，<br/>浑欲不胜簪。</p><h2>赏析</h2><p>此诗作于安史之乱期间，杜甫被困长安，目睹国破家亡的惨景。"山河在"而"国破"，"草木深"而"城春"，以有情之眼观无情之物，花鸟都染上了悲苦的色彩。"家书抵万金"道尽了乱世中亲情的珍贵，成为千古名句。全诗沉郁顿挫，情景交融，充分体现了杜诗"沉郁顿挫"的风格。</p><h2>创作背景</h2><p>唐肃宗至德二年（757年）春，杜甫被困于安史叛军占领的长安。目睹京城残破景象，思念远方亲人，遂作此诗。</p>`,
      tags: ["唐诗", "杜甫", "爱国"],
      cover: "/static/covers/dufu.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《将进酒》李白 — 天生我材必有用",
      excerpt: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。",
      content: `<h2>原文</h2><p>君不见黄河之水天上来，奔流到海不复回。<br/>君不见高堂明镜悲白发，朝如青丝暮成雪。<br/>人生得意须尽欢，莫使金樽空对月。<br/>天生我材必有用，千金散尽还复来。<br/>烹羊宰牛且为乐，会须一饮三百杯。<br/>岑夫子，丹丘生，将进酒，杯莫停。<br/>与君歌一曲，请君为我倾耳听。<br/>钟鼓馔玉不足贵，但愿长醉不愿醒。<br/>古来圣贤皆寂寞，惟有饮者留其名。<br/>陈王昔时宴平乐，斗酒十千恣欢谑。<br/>主人何为言少钱，径须沽取对君酌。<br/>五花马，千金裘，<br/>呼儿将出换美酒，与尔同销万古愁。</p><h2>赏析</h2><p>此诗以"黄河之水"起兴，气势磅礴，一泻千里。"天生我材必有用"是对自我的极度肯定与自信，"千金散尽还复来"展现了李白洒脱不羁的性格。全诗大起大落，由悲转乐、由乐转狂、由狂转愤，最后以"万古愁"收束，在豪放中隐含着深沉的悲哀。这是李白最负盛名的代表作之一。</p><h2>创作背景</h2><p>此诗约作于天宝十一年（752年），李白与友人岑勋、元丹丘在嵩山会饮。当时李白已被"赐金放还"离开长安，虽仕途坎坷，诗酒中却依然洋溢着豪迈不羁的气概。</p>`,
      tags: ["唐诗", "李白", "豪放"],
      cover: "/static/covers/libai2.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《声声慢》李清照 — 寻寻觅觅，冷冷清清",
      excerpt: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。",
      content: `<h2>原文</h2><p>寻寻觅觅，冷冷清清，凄凄惨惨戚戚。<br/>乍暖还寒时候，最难将息。<br/>三杯两盏淡酒，怎敌他、晚来风急？<br/>雁过也，正伤心，却是旧时相识。</p><p>满地黄花堆积，憔悴损，如今有谁堪摘？<br/>守着窗儿，独自怎生得黑？<br/>梧桐更兼细雨，到黄昏、点点滴滴。<br/>这次第，怎一个愁字了得！</p><h2>赏析</h2><p>此词开篇连用十四叠字，空前绝后，将孤寂凄凉的内心世界层层递进地展现出来。全词以秋日黄昏为背景，借酒、风、雁、菊、梧桐、细雨等意象，渲染出浓郁的愁绪。"怎一个愁字了得"以反问收束，言有尽而意无穷。此词是婉约词派的巅峰之作。</p><h2>创作背景</h2><p>此词作于李清照南渡之后。经历了国破、家亡、夫死的种种打击，词人晚景凄凉。一个秋日黄昏，面对满目萧瑟，写下了这首千古绝唱。</p>`,
      tags: ["宋词", "李清照", "婉约"],
      cover: "/static/covers/liqingzhao.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《念奴娇·赤壁怀古》苏轼 — 大江东去",
      excerpt: "大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。",
      content: `<h2>原文</h2><p>大江东去，浪淘尽，千古风流人物。<br/>故垒西边，人道是，三国周郎赤壁。<br/>乱石穿空，惊涛拍岸，卷起千堆雪。<br/>江山如画，一时多少豪杰。</p><p>遥想公瑾当年，小乔初嫁了，雄姿英发。<br/>羽扇纶巾，谈笑间，樯橹灰飞烟灭。<br/>故国神游，多情应笑我，早生华发。<br/>人生如梦，一尊还酹江月。</p><h2>赏析</h2><p>此词是豪放词的开山之作。"大江东去"起笔雄浑壮阔，将历史长河比作滚滚江水。"乱石穿空，惊涛拍岸，卷起千堆雪"以十三字写尽赤壁的壮丽景象。下阕追忆周瑜的英姿，反衬自己的失意，最后以"人生如梦"收束，将历史沧桑与个人感慨融为一体。全词气势磅礴，境界宏阔，代表了苏轼词的最高成就。</p><h2>创作背景</h2><p>宋神宗元丰五年（1082年），苏轼因"乌台诗案"被贬黄州。七月游赤壁，写下此词，借古抒怀，表达了对历史英雄的追慕和对人生的深沉感慨。</p>`,
      tags: ["宋词", "苏轼", "豪放"],
      cover: "/static/covers/sushi2.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
  ];

  for (let i = 0; i < articlesData.length; i++) {
    const a = articlesData[i];
    const author = i % 3 === 0 ? admin : i % 3 === 1 ? teacher : teacher2;
    const circle = circles[a.circleIdx];
    await prisma.article.create({
      data: {
        title: a.title,
        content: a.content,
        excerpt: a.excerpt,
        cover: a.cover,
        tags: a.tags,
        isPushHome: a.isPushHome,
        auditStatus: "APPROVED",
        circleId: circle.id,
        userId: author.id,
        viewCount: Math.floor(Math.random() * 5000) + 500,
        likeCount: Math.floor(Math.random() * 300) + 50,
        collectCount: Math.floor(Math.random() * 100) + 20,
        commentCount: Math.floor(Math.random() * 30) + 5,
      },
    });
  }
  console.log("✅ 文章: " + articlesData.length + " 篇");

  // 5. 创建课程
  const coursesData = [
    {
      title: "《道德经》81章精讲",
      intro: "逐章解读《道德经》，深入理解老子智慧，学以致用。",
      type: "VIDEO" as const,
      price: 299,
      originalPrice: 599,
      teacher: teacher,
      chapters: [
        { title: "第1-3章：道之概要", content: "道可道非常道——道的本体与功用", sortOrder: 0 },
        { title: "第4-6章：道之体用", content: "道冲而用之或不盈——虚空之道的妙用", sortOrder: 1 },
        { title: "第7-9章：修身之道", content: "天长地久——无私与利他的智慧", sortOrder: 2 },
      ],
    },
    {
      title: "易经六十四卦入门",
      intro: "从零开始学易经，理解卦象、爻辞，掌握基本占断方法。",
      type: "VIDEO" as const,
      price: 399,
      originalPrice: 699,
      teacher: teacher2,
      chapters: [
        { title: "易经概述与八卦基础", content: "太极→两仪→四象→八卦的生成原理", sortOrder: 0 },
        { title: "六十四卦的结构", content: "上下卦、爻位、承乘比应的分析方法", sortOrder: 1 },
        { title: "乾卦坤卦精讲", content: "乾坤为易之门——理解天地之道", sortOrder: 2 },
        { title: "实用占断入门", content: "如何起卦、解卦的实用方法", sortOrder: 3 },
      ],
    },
    {
      title: "唐诗宋词赏析30讲",
      intro: "精选30首经典诗词，从意象、格律、历史背景全方位赏析。",
      type: "AUDIO" as const,
      price: 99,
      originalPrice: 199,
      teacher: teacher,
      chapters: [
        { title: "唐诗概览：气象万千", content: "盛唐气象与唐诗的艺术成就", sortOrder: 0 },
        { title: "李白篇：诗仙的浪漫世界", content: "《将进酒》《蜀道难》等经典赏析", sortOrder: 1 },
        { title: "杜甫篇：诗圣的家国情怀", content: "《春望》《登高》等经典赏析", sortOrder: 2 },
      ],
    },
  ];

  for (const c of coursesData) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        intro: c.intro,
        type: c.type,
        price: c.price,
        originalPrice: c.originalPrice,
        auditStatus: "APPROVED",
        userId: c.teacher.id,
        studentCount: Math.floor(Math.random() * 2000) + 300,
      },
    });

    for (const ch of c.chapters) {
      await prisma.courseChapter.create({
        data: {
          courseId: course.id,
          title: ch.title,
          content: ch.content,
          sortOrder: ch.sortOrder,
        },
      });
    }
    console.log("✅ 课程: " + c.title + " (" + c.chapters.length + " 章)");
  }

  // 6. 创建商品
  const productsData = [
    { title: "《道德经》线装珍藏版", intro: "手工宣纸线装，朱砂句读，收藏级品质", price: 299, images: ["/static/products/daodejing_book.jpg"] },
    { title: "易经六十四卦卡牌", intro: "64张精美卦象卡牌，随时随地学习易经", price: 128, images: ["/static/products/yijing_cards.jpg"] },
    { title: "国学经典诵读播放器", intro: "预装12部经典诵读音频，护眼墨水屏", price: 399, images: ["/static/products/reader.jpg"] },
  ];

  for (const p of productsData) {
    await prisma.product.create({
      data: {
        title: p.title,
        intro: p.intro,
        detail: `<p>${p.intro}</p>`,
        images: p.images,
        price: p.price,
        stock: 100,
        status: "ON_SALE",
        salesCount: Math.floor(Math.random() * 500),
        isPlatform: true,
        supplierType: "PLATFORM",
      },
    });
  }
  console.log("✅ 商品: " + productsData.length + " 件");

  // 7. 创建热门搜索词
  const hotWords = [
    { keyword: "道德经", count: 15600 },
    { keyword: "易经", count: 14200 },
    { keyword: "论语", count: 12800 },
    { keyword: "八字排盘", count: 11500 },
    { keyword: "唐诗", count: 10800 },
    { keyword: "宋词", count: 9600 },
    { keyword: "风水", count: 8200 },
    { keyword: "心经", count: 7800 },
    { keyword: "黄帝内经", count: 6500 },
    { keyword: "孙子兵法", count: 5800 },
  ];

  // 用 ConfigSystem 表存热门搜索（key: search_hot_words）
  await prisma.configSystem.upsert({
    where: { configKey: "search_hot_words" },
    update: { configValue: JSON.stringify(hotWords) },
    create: {
      configKey: "search_hot_words",
      configValue: JSON.stringify(hotWords),
      description: "热门搜索词列表",
    },
  });
  // 同时创建搜索历史记录（让统计接口生效，仅少量样本）
  for (const hw of hotWords) {
    const n = Math.min(Math.floor(hw.count / 1000), 30);
    for (let i = 0; i < n; i++) {
      await prisma.searchHistory.create({ data: { userId: admin.id, keyword: hw.keyword } });
    }
  }
  console.log("✅ 热门搜索词: " + hotWords.length + " 条");

  // 8. 创建古籍
  const classicBooks = [
    {
      title: "道德经",
      author: "老子",
      dynasty: "春秋",
      category: "子",
      intro: "《道德经》又称《老子》，是道家思想的奠基之作，全文约五千字，分八十一章。以「道」为核心，阐述宇宙万物运行规律和人生处世智慧，影响中国文化两千余年。",
      source: "王弼注本",
      chapters: [
        { title: "第一章", content: "道可道，非常道；名可名，非常名。无名天地之始，有名万物之母。故常无欲，以观其妙；常有欲，以观其徼。此两者同出而异名，同谓之玄。玄之又玄，众妙之门。", translation: "可以用语言表达的道，就不是永恒不变的道；可以用名字称呼的名，就不是永恒不变的名。无，是天地形成的本始；有，是创生万物的根源。所以常从无中，去观照道的奥秘；常从有中，去观照道的端倪。无和有这两者，来源相同而名称相异，都可以称之为玄妙。玄妙之中还有更深层的玄妙，是一切微妙的总门。" },
        { title: "第二章", content: "天下皆知美之为美，斯恶已；皆知善之为善，斯不善已。故有无相生，难易相成，长短相较，高下相倾，音声相和，前后相随。是以圣人处无为之事，行不言之教；万物作焉而不辞，生而不有，为而不恃，功成而弗居。夫唯弗居，是以不去。", translation: "天下人都知道美之所以为美，是因为有丑的存在；都知道善之所以为善，是因为有恶的存在。所以有和无相互生成，难和易相互成就，长和短相互比较，高和下相互倾靠，音和声相互和谐，前和后相互跟随。因此圣人以无为的态度处事，施行不言之教化；万物兴起而不推辞，生养万物而不占有，有所作为而不自恃，功成而不自居。正因为不自居，所以功绩不会失去。" },
        { title: "第八章", content: "上善若水。水善利万物而不争，处众人之所恶，故几于道。居善地，心善渊，与善仁，言善信，政善治，事善能，动善时。夫唯不争，故无尤。", translation: "最高的善像水一样。水善于滋润万物而不与万物相争，停留在众人所厌恶的低处，所以最接近道。居住善于选择地方，心胸善于保持沉静，待人善于真诚仁爱，说话善于恪守信用，为政善于治理，处事善于发挥才能，行动善于把握时机。正因为不与人相争，所以没有过失。" },
      ],
    },
    {
      title: "论语",
      author: "孔子及其弟子",
      dynasty: "春秋",
      category: "经",
      intro: "《论语》是孔子及其弟子的言行录，儒家核心经典，共二十篇。记录了孔子的政治主张、伦理思想、道德观念和教育原则，对中国文化产生了深远影响。",
      source: "朱熹《论语集注》",
      chapters: [
        { title: "学而第一·选段", content: "子曰：「学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？」有子曰：「其为人也孝弟，而好犯上者，鲜矣；不好犯上，而好作乱者，未之有也。君子务本，本立而道生。孝弟也者，其为仁之本与！」子曰：「巧言令色，鲜矣仁！」", translation: "孔子说：「学习并时常温习实践，不也很愉快吗？有朋友从远方来，不也很快乐吗？别人不了解自己而不怨恨，不也是君子吗？」有子说：「一个人孝顺父母、敬爱兄长，却喜欢冒犯上级，是很少见的；不喜欢冒犯上级，却喜欢作乱的人，从来没有过。君子注重根本，根本确立了，道就产生了。孝悌，就是仁的根本吧！」孔子说：「花言巧语、装出和善面孔的人，仁德是不会多的。」" },
        { title: "为政第二·选段", content: "子曰：「为政以德，譬如北辰，居其所而众星共之。」子曰：「《诗》三百，一言以蔽之，曰：思无邪。」子曰：「吾十有五而志于学，三十而立，四十而不惑，五十而知天命，六十而耳顺，七十而从心所欲，不逾矩。」", translation: "孔子说：「以道德来治理政事，就像北极星一样，安居其位而众星环绕着它。」孔子说：「《诗经》三百篇，用一句话来概括，就是：思想纯正无邪。」孔子说：「我十五岁立志学习，三十岁能够自立，四十岁不再迷惑，五十岁懂得了天命，六十岁听什么都能顺耳，七十岁随心所欲而不越出规矩。」" },
        { title: "里仁第四·选段", content: "子曰：「富与贵，是人之所欲也；不以其道得之，不处也。贫与贱，是人之所恶也；不以其道得之，不去也。君子去仁，恶乎成名？君子无终食之间违仁，造次必于是，颠沛必于是。」子曰：「朝闻道，夕死可矣。」", translation: "孔子说：「富有和尊贵，是人人所向往的；但不用正当的方式得到它，君子不会接受。贫穷和卑贱，是人人所厌恶的；但不用正当的方式摆脱它，君子不会逃避。君子离开了仁德，怎么成就名声呢？君子即使在一顿饭的时间里也不会违背仁德，仓促匆忙时必定如此，颠沛流离时也必定如此。」孔子说：「早晨听闻大道，即使晚上死去也值得了。」" },
      ],
    },
    {
      title: "孙子兵法",
      author: "孙武",
      dynasty: "春秋",
      category: "子",
      intro: "《孙子兵法》是中国现存最早的兵书，被誉为「兵学圣典」，共十三篇。其战略思想早已超越军事领域，广泛应用于商业竞争、管理决策等各个方面。",
      source: "十一家注孙子",
      chapters: [
        { title: "始计第一", content: "孙子曰：兵者，国之大事，死生之地，存亡之道，不可不察也。故经之以五事，校之以计，而索其情：一曰道，二曰天，三曰地，四曰将，五曰法。道者，令民与上同意也，故可以与之死，可以与之生，而不畏危。天者，阴阳、寒暑、时制也。地者，远近、险易、广狭、死生也。将者，智、信、仁、勇、严也。法者，曲制、官道、主用也。", translation: "孙子说：战争是国家的头等大事，关系到军民的生死和国家的存亡，不能不认真研究。所以要从五个方面来分析，比较敌我双方的条件，来探求战争胜负的原因：一是道，二是天，三是地，四是将，五是法。道，就是让民众与君主的意愿一致，这样他们就可以为君主去死、去生，而不畏惧危险。天，就是昼夜、寒暑、季节时令。地，就是远近、险易、广狭以及关乎生死的地形。将，就是智慧、诚信、仁爱、勇敢、严明。法，就是军队编制、将吏管理、军需供应。" },
        { title: "作战第二", content: "孙子曰：凡用兵之法，驰车千驷，革车千乘，带甲十万，千里馈粮，则内外之费，宾客之用，胶漆之材，车甲之奉，日费千金，然后十万之师举矣。其用战也胜，久则钝兵挫锐，攻城则力屈，久暴师则国用不足。夫钝兵挫锐，屈力殚货，则诸侯乘其弊而起，虽有智者，不能善其后矣。", translation: "孙子说：凡是用兵作战的规律，要动用战车千辆、辎重车千辆、士兵十万，还要千里运粮；那么前方后方的费用、外交使节的开支、器材物资的供应、武器装具的保养补充，每天要耗费千金，然后十万大军才能出动。用这样庞大的军队去作战，就要力求速胜，旷日持久就会使军队疲惫、锐气挫伤，攻城就会使兵力耗尽，军队长期在外作战就会使国家财力不足。如果军队疲惫、锐气挫伤、兵力耗尽、财力枯竭，那么诸侯各国就会乘此危机来进攻，那时即使有智谋高超的人，也无法挽回危局了。" },
      ],
    },
    {
      title: "庄子",
      author: "庄子及其后学",
      dynasty: "战国",
      category: "子",
      intro: "《庄子》又称《南华经》，是道家经典之一，与《老子》并称。以寓言说理，汪洋恣肆，想象奇诡，是中国文学和哲学史上的巅峰之作。",
      source: "郭象注本",
      chapters: [
        { title: "逍遥游第一·选段", content: "北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也。怒而飞，其翼若垂天之云。是鸟也，海运则将徙于南冥。南冥者，天池也。", translation: "北海有一条鱼，名字叫鲲。鲲的体型巨大，不知道有几千里。鲲变化成鸟，名字叫鹏。鹏的脊背，不知道有几千里长。当它奋起而飞的时候，展开的双翅就像天边的云。这只鸟，海风吹起时就将迁徙到南海。那南海，就是一个天然的大池。" },
        { title: "齐物论第二·选段", content: "昔者庄周梦为胡蝶，栩栩然胡蝶也。自喻适志与！不知周也。俄然觉，则蘧蘧然周也。不知周之梦为胡蝶与？胡蝶之梦为周与？周与胡蝶则必有分矣。此之谓物化。", translation: "从前庄周梦见自己变成了蝴蝶，一只翩翩起舞的蝴蝶。非常愉快和惬意！不知道自己原本是庄周。突然间醒来，惊惶不定之间方知原来是我庄周。不知是庄周梦中变成了蝴蝶呢，还是蝴蝶梦中变成了庄周呢？庄周与蝴蝶那必定是有区别的。这就叫作物、我的交合与变化。" },
      ],
    },
    {
      title: "三字经",
      author: "王应麟（传）",
      dynasty: "宋",
      category: "经",
      intro: "《三字经》是中国传统启蒙读物，三字一句，朗朗上口。内容涵盖教育、历史、伦理、典故，是千年来中国儿童入学必读的第一本书。",
      source: "通行本",
      chapters: [
        { title: "开篇：教之道", content: "人之初，性本善。性相近，习相远。苟不教，性乃迁。教之道，贵以专。昔孟母，择邻处。子不学，断机杼。窦燕山，有义方。教五子，名俱扬。养不教，父之过。教不严，师之惰。子不学，非所宜。幼不学，老何为。玉不琢，不成器。人不学，不知义。", translation: "人出生之初，禀性本来都是善良的。天性也都相差不多，只是后天所处的环境不同才形成了差别。如果从小不好好教育，善良的本性就会变坏。教育的方法，最重要的是专心致志。从前孟子的母亲，为了给孟子一个好的学习环境，曾三次搬家。孟子逃学，孟母就割断织机的布来教育他。五代时燕山人窦禹钧，教育儿子很有方法。他教育的五个儿子都很有成就，同时科举成名。仅仅是供养儿女吃穿，而不好好教育，是父亲的过错。只是教育，但不严格要求，就是做老师的懒惰了。小孩子不肯好好学习，是很不应该的。一个人倘若小时候不好好学习，到老的时候又能做什么呢？玉不打磨雕刻，不会成为精美的器物。人若是不学习，就不懂得礼仪，不能成才。" },
        { title: "常识篇：三才三光", content: "三才者，天地人。三光者，日月星。三纲者，君臣义。父子亲，夫妇顺。曰春夏，曰秋冬。此四时，运不穷。曰南北，曰西东。此四方，应乎中。曰水火，木金土。此五行，本乎数。曰仁义，礼智信。此五常，不容紊。", translation: "三才指的是天、地、人。三光指的是太阳、月亮、星星。三纲是人与人之间关系应该遵守的三个行为准则，就是君王与臣子要合乎义理，父母子女之间相亲相爱，夫妻之间和顺相处。春、夏、秋、冬叫做四季。这四时季节不断变化，运行不止。南、北、西、东叫做四方，这四个方位，必须有个中央位置对应。水、火、木、金、土叫做五行，这是万物构成的基本元素。仁、义、礼、智、信叫做五常，这五种道德准则不容紊乱。" },
      ],
    },
    {
      title: "千字文",
      author: "周兴嗣",
      dynasty: "南北朝",
      category: "经",
      intro: "《千字文》由一千个不重复的汉字编成，四字一句，对仗工整，条理清晰。内容涵盖天文、地理、历史、道德，是流传最广的传统蒙学经典之一。",
      source: "通行本",
      chapters: [
        { title: "天地篇", content: "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。闰余成岁，律吕调阳。云腾致雨，露结为霜。金生丽水，玉出昆冈。剑号巨阙，珠称夜光。果珍李柰，菜重芥姜。海咸河淡，鳞潜羽翔。", translation: "天是青黑色的，地是黄色的，宇宙形成于混沌蒙昧的状态中。太阳正了又斜，月亮圆了又缺，星辰布满在无边的太空中。寒暑循环变换，来了又去，去了又来；秋季里忙着收割，冬天里忙着储藏。积累数年的闰余合成一个月，放在闰年里；古人用六律六吕来调节阴阳。云气上升遇冷就形成了雨，露水碰上寒夜就凝结成霜。黄金产自金沙江，美玉出自昆仑山。最锋利的宝剑叫巨阙，最珍贵的明珠叫夜光。水果里最珍贵的是李子和柰子，蔬菜中最看重的是芥菜和生姜。海水是咸的，河水是淡的，鱼儿在水中潜游，鸟儿在空中飞翔。" },
        { title: "修身篇", content: "盖此身发，四大五常。恭惟鞠养，岂敢毁伤。女慕贞洁，男效才良。知过必改，得能莫忘。罔谈彼短，靡恃己长。信使可覆，器欲难量。墨悲丝染，诗赞羔羊。景行维贤，克念作圣。德建名立，形端表正。空谷传声，虚堂习听。祸因恶积，福缘善庆。尺璧非宝，寸阴是竞。", translation: "人的身体发肤由地水火风四大元素和仁义礼智信五常构成。要恭敬地想着父母的养育之恩，哪里还敢毁坏损伤它。女子要仰慕那些持身严谨的贞洁妇女，男子要仿效那些有才能有道德的人。知道自己有过错，一定要改正；学到了技能，不要忘记。不要谈论别人的短处，也不要依仗自己有长处就不思进取。说过的话要经得起时间和事实的检验，器度要大，让人难以估量。墨子为白丝染色不褪而悲泣，《诗经》中因此有《羔羊》篇赞扬正人君子的纯正品德。要仰慕圣贤的德行，时时想着自己也能成为圣人。道德建立起来，名声就自然树立；就像身形端正了，影子就正。在空旷的山谷中呼喊，回声会传得很远；在空荡的厅堂里说话，会有回音。祸害是因为多次作恶积累而成，福运是因为常年行善得到的奖赏。一尺长的璧玉算不上宝贵，一寸短的光阴却值得争取。" },
      ],
    },
  ];

  for (const b of classicBooks) {
    const book = await prisma.classicBook.create({
      data: {
        title: b.title,
        author: b.author,
        dynasty: b.dynasty,
        category: b.category,
        intro: b.intro,
        source: b.source,
        chapterCount: b.chapters.length,
        viewCount: Math.floor(Math.random() * 10000) + 1000,
        status: "PUBLISHED",
      },
    });
    for (let i = 0; i < b.chapters.length; i++) {
      await prisma.classicChapter.create({
        data: {
          bookId: book.id,
          title: b.chapters[i].title,
          content: b.chapters[i].content,
          translation: b.chapters[i].translation,
          sortOrder: i,
        },
      });
    }
    console.log("✅ 古籍: " + b.title + " (" + b.chapters.length + " 章)");
  }

  console.log("\n🎉 种子数据填充完成！");
  console.log("   管理员: 13800000000 / guoxue123");
  console.log("   讲师1:  13800000001 / teacher123");
  console.log("   讲师2:  13800000002 / teacher123");
}

main()
  .catch((e) => {
    console.error("❌ 种子数据填充失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

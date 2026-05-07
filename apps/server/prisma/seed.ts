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
      tags: ["诗词", "唐诗", "李白", "思乡"],
      cover: "/static/covers/libai.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《水调歌头》苏轼 — 明月几时有",
      excerpt: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年。",
      content: `<h2>原文</h2><p>明月几时有？把酒问青天。<br/>不知天上宫阙，今夕是何年。<br/>我欲乘风归去，又恐琼楼玉宇，高处不胜寒。<br/>起舞弄清影，何似在人间。</p><p>转朱阁，低绮户，照无眠。<br/>不应有恨，何事长向别时圆？<br/>人有悲欢离合，月有阴晴圆缺，此事古难全。<br/>但愿人长久，千里共婵娟。</p><h2>赏析</h2><p>苏轼以中秋明月为引，抒发了对人生离合的豁达感悟。"人有悲欢离合，月有阴晴圆缺"以自然现象比喻人生境遇，将个人情感升华为普遍哲理。"但愿人长久，千里共婵娟"成为千古传颂的名句。</p><h2>创作背景</h2><p>此词作于宋神宗熙宁九年（1076年）中秋，苏轼时在密州。词前有小序："丙辰中秋，欢饮达旦，大醉，作此篇，兼怀子由。"子由是苏轼的弟弟苏辙。</p>`,
      tags: ["诗词", "宋词", "苏轼", "中秋"],
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
      tags: ["诗词", "唐诗", "杜甫", "爱国"],
      cover: "/static/covers/dufu.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《将进酒》李白 — 天生我材必有用",
      excerpt: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。",
      content: `<h2>原文</h2><p>君不见黄河之水天上来，奔流到海不复回。<br/>君不见高堂明镜悲白发，朝如青丝暮成雪。<br/>人生得意须尽欢，莫使金樽空对月。<br/>天生我材必有用，千金散尽还复来。<br/>烹羊宰牛且为乐，会须一饮三百杯。<br/>岑夫子，丹丘生，将进酒，杯莫停。<br/>与君歌一曲，请君为我倾耳听。<br/>钟鼓馔玉不足贵，但愿长醉不愿醒。<br/>古来圣贤皆寂寞，惟有饮者留其名。<br/>陈王昔时宴平乐，斗酒十千恣欢谑。<br/>主人何为言少钱，径须沽取对君酌。<br/>五花马，千金裘，<br/>呼儿将出换美酒，与尔同销万古愁。</p><h2>赏析</h2><p>此诗以"黄河之水"起兴，气势磅礴，一泻千里。"天生我材必有用"是对自我的极度肯定与自信，"千金散尽还复来"展现了李白洒脱不羁的性格。全诗大起大落，由悲转乐、由乐转狂、由狂转愤，最后以"万古愁"收束，在豪放中隐含着深沉的悲哀。这是李白最负盛名的代表作之一。</p><h2>创作背景</h2><p>此诗约作于天宝十一年（752年），李白与友人岑勋、元丹丘在嵩山会饮。当时李白已被"赐金放还"离开长安，虽仕途坎坷，诗酒中却依然洋溢着豪迈不羁的气概。</p>`,
      tags: ["诗词", "唐诗", "李白", "豪放"],
      cover: "/static/covers/libai2.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《声声慢》李清照 — 寻寻觅觅，冷冷清清",
      excerpt: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。",
      content: `<h2>原文</h2><p>寻寻觅觅，冷冷清清，凄凄惨惨戚戚。<br/>乍暖还寒时候，最难将息。<br/>三杯两盏淡酒，怎敌他、晚来风急？<br/>雁过也，正伤心，却是旧时相识。</p><p>满地黄花堆积，憔悴损，如今有谁堪摘？<br/>守着窗儿，独自怎生得黑？<br/>梧桐更兼细雨，到黄昏、点点滴滴。<br/>这次第，怎一个愁字了得！</p><h2>赏析</h2><p>此词开篇连用十四叠字，空前绝后，将孤寂凄凉的内心世界层层递进地展现出来。全词以秋日黄昏为背景，借酒、风、雁、菊、梧桐、细雨等意象，渲染出浓郁的愁绪。"怎一个愁字了得"以反问收束，言有尽而意无穷。此词是婉约词派的巅峰之作。</p><h2>创作背景</h2><p>此词作于李清照南渡之后。经历了国破、家亡、夫死的种种打击，词人晚景凄凉。一个秋日黄昏，面对满目萧瑟，写下了这首千古绝唱。</p>`,
      tags: ["诗词", "宋词", "李清照", "婉约"],
      cover: "/static/covers/liqingzhao.jpg",
      circleIdx: 2,
      isPushHome: true,
    },
    {
      title: "《念奴娇·赤壁怀古》苏轼 — 大江东去",
      excerpt: "大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。",
      content: `<h2>原文</h2><p>大江东去，浪淘尽，千古风流人物。<br/>故垒西边，人道是，三国周郎赤壁。<br/>乱石穿空，惊涛拍岸，卷起千堆雪。<br/>江山如画，一时多少豪杰。</p><p>遥想公瑾当年，小乔初嫁了，雄姿英发。<br/>羽扇纶巾，谈笑间，樯橹灰飞烟灭。<br/>故国神游，多情应笑我，早生华发。<br/>人生如梦，一尊还酹江月。</p><h2>赏析</h2><p>此词是豪放词的开山之作。"大江东去"起笔雄浑壮阔，将历史长河比作滚滚江水。"乱石穿空，惊涛拍岸，卷起千堆雪"以十三字写尽赤壁的壮丽景象。下阕追忆周瑜的英姿，反衬自己的失意，最后以"人生如梦"收束，将历史沧桑与个人感慨融为一体。全词气势磅礴，境界宏阔，代表了苏轼词的最高成就。</p><h2>创作背景</h2><p>宋神宗元丰五年（1082年），苏轼因"乌台诗案"被贬黄州。七月游赤壁，写下此词，借古抒怀，表达了对历史英雄的追慕和对人生的深沉感慨。</p>`,
      tags: ["诗词", "宋词", "苏轼", "豪放"],
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
        { title: "第1-3章：道之概要", content: `<h2>一、道可道，非常道</h2><p>《道德经》开篇第一句话，就点出了全书的核心命题——「道」的不可言说性。老子说：「道可道，非常道；名可名，非常名。」可以用语言表达的道，就不是永恒不变的道；可以用名字称呼的名，就不是永恒不变的名。</p><p>这告诉我们：真正的智慧，不是靠语言概念就能完全把握的。就像学习骑自行车，别人告诉你要「保持平衡」，但真正的平衡感只能靠自己去体会。道理可以讲，但体悟才是关键。</p><h2>二、有无相生</h2><p>第二章提出：「有无相生，难易相成，长短相较，高下相倾。」对立的事物总是相互依存、相互转化的。没有「无」，就没有「有」的概念；没有「难」，就无所谓「易」。这个思想影响了中国几千年的辩证思维。</p><p>在现实生活中，这意味着：挫折中蕴藏着机遇，成功中潜伏着危机。圣人的做法是「处无为之事，行不言之教」——不刻意强求，而是顺应事物本身的规律。</p><h2>三、不尚贤，使民不争</h2><p>第三章讲治国之道：「不尚贤，使民不争；不贵难得之货，使民不为盗。」如果不过分标榜贤能，人们就不会去争名夺利；如果不把稀有的东西当作宝贝，人们就不会去偷盗。老子的智慧在于：很多社会问题恰恰是制度本身制造的。</p><h2>课程思考</h2><p>这三章构成了《道德经》的纲领：第一章讲道的本体，第二章讲对立统一的方法论，第三章讲社会治理的应用。理解这三章，就掌握了老子的核心思路。</p>`, sortOrder: 0 },
        { title: "第4-6章：道之体用", content: `<h2>一、道冲而用之或不盈</h2><p>第四章说：「道冲，而用之或不盈。」道是虚空的，但它的作用却无穷无尽。就像一口井，看似空空的，却能源源不断地出水。这告诉我们：真正的大用，往往看起来像是无用的。</p><p>老子进一步说：「渊兮，似万物之宗。挫其锐，解其纷，和其光，同其尘。」道深邃得像万物的源头，它能磨去锐气、化解纷扰、调和光芒、混同尘世——这就是道的包容和融化万物的力量。</p><h2>二、天地不仁</h2><p>第五章尤为震撼：「天地不仁，以万物为刍狗；圣人不仁，以百姓为刍狗。」天地没有偏私，对待万物都像对待刍狗（祭祀用的草扎狗）一样——用的时候隆重登场，用完就弃之一旁。</p><p>这不是说天地冷漠无情，而是说天地没有人类那种带有偏私的「仁」。正如太阳普照万物，不分善恶；雨水滋润大地，不分贵贱。真正的公平是不偏不倚。</p><h2>三、谷神不死</h2><p>第六章用「谷神」比喻道的生生不息之力：「谷神不死，是谓玄牝。玄牝之门，是谓天地根。」空虚的神妙不会消亡，它就像雌性的生育之门，那是天地的根源。老子用孕育生命的意象来表达道的创造力——柔、虚、静之中蕴含着无穷的生机。</p>`, sortOrder: 1 },
        { title: "第7-9章：修身之道", content: `<h2>一、天长地久与无私</h2><p>第七章：「天长地久。天地所以能长且久者，以其不自生，故能长生。」天地之所以能长久存在，是因为它们不为自己而活，所以反而能长久。老子由此推出：「是以圣人后其身而身先，外其身而身存。」</p><p>这看似矛盾——越是退让反而越能领先，越是不顾自己反而保全自己——但这恰恰是中国人处世的深层智慧。就像水，总是往低处流，却最终汇成了大海。</p><h2>二、上善若水</h2><p>第八章的名句「上善若水」是老子最广为人知的思想之一。最高的善像水一样——水利万物而不与万物相争，甘愿处在众人厌恶的低洼之处，所以最接近道。</p><p>水有七种美德：居善地（谦下）、心善渊（深沉）、与善仁（仁爱）、言善信（诚信）、政善治（治理）、事善能（能力）、动善时（时宜）。这七个层面构成了一个完整的修身框架。</p><h2>三、功成身退</h2><p>第九章警告：「持而盈之，不如其已。揣而锐之，不可长保。金玉满堂，莫之能守。富贵而骄，自遗其咎。」凡事太过就不好了。杯子装得太满就会洒，刀磨得太锋利就容易折断。老子最后说：「功成名遂身退，天之道也。」——这是中国几千年来「急流勇退」智慧的思想源头。</p>`, sortOrder: 2 },
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
        { title: "易经概述与八卦基础", content: `<h2>一、易有三义</h2><p>《易经》的「易」有三个含义：变易、简易、不易。变易——万物时刻在变化；简易——变化虽多但规律简单；不易——变化的规律本身是不变的。这三个层次是理解易经的入门之钥。</p><h2>二、太极生两仪</h2><p>「易有太极，是生两仪，两仪生四象，四象生八卦。」太极是宇宙未分的混沌状态；两仪就是阴阳，用阳爻（⚊）和阴爻（⚋）表示；四象是太阳、少阳、太阴、少阴，由两个爻组成；八卦是三个爻的组合。</p><h2>三、八卦取象</h2><p>八卦各有对应的自然现象和属性：乾☰为天（健）、坤☷为地（顺）、震☳为雷（动）、巽☴为风（入）、坎☵为水（陷）、离☲为火（丽）、艮☶为山（止）、兑☱为泽（悦）。记住这八卦的象义，是读易的基本功。</p><h2>四、先天八卦与后天八卦</h2><p>伏羲先天八卦讲的是天地自然之理，乾南坤北；文王后天八卦讲的是人事之用，离南坎北。两个八卦图有完全不同的方位排列，分别对应不同的应用场景。风水、命理多用后天八卦。</p>`, sortOrder: 0 },
        { title: "六十四卦的结构", content: `<h2>一、重卦原理</h2><p>八卦两两重叠，就形成了六十四卦（8×8=64）。每卦由六爻组成，分上下两部分：下卦（内卦）代表内部、自身、开始；上卦（外卦）代表外部、他人、结果。</p><h2>二、爻位关系</h2><p>六个爻位从下到上依次为初爻、二爻、三爻、四爻、五爻、上爻。奇数位（初、三、五）是阳位，偶数位（二、四、上）是阴位。阳爻居阳位、阴爻居阴位为「得位」，反之为「失位」。</p><p>重要的爻位法则：初爻代表起始、二爻代表内助、三爻代表行动、四爻代表外应、五爻代表君位/主导、上爻代表终结/退藏。</p><h2>三、承乘比应</h2><p>「承」：下爻对上爻的承接关系；「乘」：上爻对下爻的凌乘关系（阴乘阳为顺，阳乘阴为逆）；「比」：相邻两爻的亲密程度；「应」：初与四、二与五、三与上之间的呼应关系。掌握这四种关系，才能准确理解爻辞。</p><h2>四、错综复杂</h2><p>错卦（旁通卦）——六爻全变；综卦（覆卦）——上下颠倒；互卦——取中间四爻重组的卦。这些是易经推理的进阶方法。</p>`, sortOrder: 1 },
        { title: "乾卦坤卦精讲", content: `<h2>一、乾卦：天行健</h2><p>乾卦六爻皆阳，象征纯阳之德、创造之力。卦辞「元亨利贞」四字概括了事物发展的完整过程：创始（元）、亨通（亨）、和谐（利）、正固（贞）。</p><p>六爻讲述了龙的变化：初九「潜龙勿用」（积蓄力量）、九二「见龙在田」（初露锋芒）、九三「终日乾乾」（勤奋警惕）、九四「或跃在渊」（审时度势）、九五「飞龙在天」（大成之境）、上九「亢龙有悔」（物极必反）。</p><p>《象传》说：「天行健，君子以自强不息。」这是中华民族精神的核心格言。</p><h2>二、坤卦：地势坤</h2><p>坤卦六爻皆阴，象征纯阴之德、承载之力。卦辞说：「元亨利牝马之贞。」坤的品德是像母马一样柔顺而坚韧。六二爻辞「直方大，不习无不利」——正直、方正、广大，即使不刻意学习也不会不利。</p><p>《象传》说：「地势坤，君子以厚德载物。」乾是创造，坤是承载；乾是领导，坤是配合。两者相辅而成，缺一不可。</p><h2>三、乾坤互参</h2><p>乾坤是易之门。理解了乾卦的「自强不息」和坤卦的「厚德载物」，就把握了中国文化精神的两大支柱——刚健有为与柔顺包容。</p>`, sortOrder: 2 },
        { title: "实用占断入门", content: `<h2>一、起卦三法</h2><p>最传统的方法是用50根蓍草进行「大衍筮法」，过程较为复杂。日常可用三枚铜钱摇卦法：准备三枚硬币，心想所问之事，摇六次，每次记下正反面：三个正面为老阳（变爻○）、三个反面为老阴（变爻×）、两正一反为少阳（—）、两反一正为少阴（- -）。</p><p>还有一种简易的数字起卦法：随意想两个数字，第一个除以8取余数得上卦，第二个除以8取余数得下卦，两数之和除以6取余数得动爻。</p><h2>二、解卦步骤</h2><p>第一步：看卦名和卦辞，理解整体含义。第二步：看动爻（变爻）的爻辞，这是问题的核心提示。第三步：结合本卦和变卦，本卦是现状，变卦是趋势。第四步：综合五行生克（如果熟悉的话）来辅助判断。</p><h2>三、占断心法</h2><p>「善易者不占」——真正懂易经的人不轻易占卜。因为易理教你看清事物的规律，很多事不用占也知道结果。占卜更多是在困境迷茫中厘清思路的工具。心诚则灵，心乱不占；重大问题可占，鸡毛蒜皮不占；同一件事不反复占。</p>`, sortOrder: 3 },
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
        { title: "唐诗概览：气象万千", content: `<h2>一、为什么是唐诗？</h2><p>唐代是中国诗歌的黄金时代。《全唐诗》收录了2200多位诗人的近5万首诗。唐诗的繁荣离不开三个条件：国力强盛带来的文化自信、科举制度中进士科考诗赋的驱动、以及六朝以来诗歌艺术的积累。</p><h2>二、唐诗的分期</h2><p>初唐（618-712）：从宫廷诗风走向革新。代表人物「初唐四杰」——王勃、杨炯、卢照邻、骆宾王，以及陈子昂。盛唐（712-770）：巅峰时期，李白和杜甫两位巨擘并峙。王维、孟浩然代表的山水田园诗派和高适、岑参代表的边塞诗派也在这时兴盛。中唐（770-835）：白居易、元稹推动新乐府运动，韩愈、柳宗元以文为诗。晚唐（835-907）：李商隐、杜牧独树一帜，诗风趋于细腻深沉。</p><h2>三、唐诗的格律之美</h2><p>唐诗的格律（平仄、对仗、押韵）不是束缚，而是创造音乐美的工具。绝句四句、律诗八句、排律更长。平仄交替产生节奏，对仗工整产生视觉对称，押韵产生回环往复的音乐效果。理解了格律，才能真正体会唐诗的好。</p>`, sortOrder: 0 },
        { title: "李白篇：诗仙的浪漫世界", content: `<h2>一、仙气从何而来？</h2><p>李白被称为「诗仙」，与他的道家和道教修养密不可分。他青少年时在四川接触道教，一生好道求仙。他的诗中充满了飞翔、登天、驾鹤、乘云的意象：「我欲因之梦吴越，一夜飞度镜湖月」「脚著谢公屐，身登青云梯」。</p><h2>二、《将进酒》：生命力的狂欢</h2><p>「君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。」开头两句用空间和时间两个维度的巨大反差，营造了无与伦比的气势。「天生我材必有用，千金散尽还复来」——这不是自负，而是对生命价值的绝对肯定。</p><h2>三、《静夜思》：最简单的神奇</h2><p>20个字，没有一个生僻字，没有一个典故，三岁小孩都能背。但正是这种朴素，产生了穿越时空的力量。月光的白与霜的白相映，举头与低头的动作转换，思乡之情自然流出。大巧若拙，大音希声。</p><h2>四、李白的诗学贡献</h2><p>李白把古体诗的自由奔放推向了极致，同时在七绝和七律上也成就卓越。他打破了诗与歌的界限，让诗歌重新获得了音乐般的节奏感。「清水出芙蓉，天然去雕饰」——这不仅是他对自己诗歌的评价，也是中国诗歌最高的审美理想之一。</p>`, sortOrder: 1 },
        { title: "杜甫篇：诗圣的家国情怀", content: `<h2>一、诗圣何以称圣？</h2><p>如果说李白是天上的仙，杜甫就是地上的人。他的诗直面现实，记录时代，被称为「诗史」。安史之乱期间的诗作，每一首都是那个时代的血泪见证。「国破山河在，城春草木深」——十个字写尽了战乱后的荒凉与坚韧。</p><h2>二、《春望》：乱世中的凝视</h2><p>「感时花溅泪，恨别鸟惊心。」花鸟本是令人愉悦的东西，但在国破家亡的背景下，花上的露水变成了泪水，鸟的叫声让人心惊。这是移情于物的极致——不是我悲伤，而是整个世界都在悲伤。「家书抵万金」五个字，道尽了战乱中所有人的共同心愿。</p><h2>三、《登高》：七律之冠</h2><p>「风急天高猿啸哀，渚清沙白鸟飞回。无边落木萧萧下，不尽长江滚滚来。」这首诗被后人评为「古今七律第一」。前四句写景，后四句抒情，情景交融达到了完美的平衡。落木的萧萧与长江的滚滚，一仄一平，一收一放，形成了无尽的张力。</p><h2>四、李杜比较</h2><p>李白是天才型的，他的诗似乎不费力气；杜甫是锤炼型的，「为人性僻耽佳句，语不惊人死不休」。两种风格没有高下之分，都是中国诗歌不可逾越的高峰。韩愈说：「李杜文章在，光焰万丈长。」</p>`, sortOrder: 2 },
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

  // 6. 创建智能体
  const botsData = [
    {
      name: "智能客服",
      type: "CUSTOMER_SERVICE",
      avatar: "/static/bots/customer_service.png",
      intro: "7×24小时在线解答平台使用问题，快速响应用户咨询，提升服务效率。",
      botId: "coze_cs_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 9999,
      sortOrder: 1,
    },
    {
      name: "圈主助理",
      type: "CIRCLE_ASSISTANT",
      avatar: "/static/bots/circle_assistant.png",
      intro: "协助圈主管理圈子内容、审核帖子、维护社群秩序，让圈子运营更轻松。",
      botId: "coze_ca_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 50,
      sortOrder: 2,
    },
    {
      name: "站长助理",
      type: "STATION_ASSISTANT",
      avatar: "/static/bots/station_assistant.png",
      intro: "为分站站长提供运营数据分析、内容推荐和客户管理辅助，助力业绩增长。",
      botId: "coze_sa_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 50,
      sortOrder: 3,
    },
    {
      name: "获客文案生成器",
      type: "CONTENT_WRITER",
      avatar: "/static/bots/content_writer.png",
      intro: "一键生成国学主题营销文案、朋友圈推广文案和公众号文章，轻松获客。",
      botId: "coze_cw_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 5,
      price: 1.99,
      monthlyPrice: 29.99,
      sortOrder: 4,
    },
    {
      name: "报告工厂",
      type: "REPORT_FACTORY",
      avatar: "/static/bots/report_factory.png",
      intro: "根据八字排盘结果生成详细的人生解读报告，含事业、财运、感情分析。",
      botId: "coze_rf_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 3,
      price: 9.99,
      monthlyPrice: 99.99,
      sortOrder: 5,
    },
    {
      name: "开运好物推荐官",
      type: "GOODS_RECOMMENDER",
      avatar: "/static/bots/goods_recommender.png",
      intro: "根据用户生辰八字和运势分析，精准推荐开运饰品和吉祥物。",
      botId: "coze_gr_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 5,
      price: 2.99,
      monthlyPrice: 39.99,
      sortOrder: 6,
    },
    {
      name: "白标AI助手",
      type: "WHITE_LABEL_AI",
      avatar: "/static/bots/white_label_ai.png",
      intro: "为分站提供白标AI问答能力，支持自定义知识库和品牌形象，打造专属AI。",
      botId: "coze_wl_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 20,
      price: 0.99,
      monthlyPrice: 19.99,
      sortOrder: 7,
    },
    {
      name: "大师对练馆",
      type: "MASTER_PRACTICE",
      avatar: "/static/bots/master_practice.png",
      intro: "模拟国学大师对话场景，与AI孔子、AI老子、AI佛陀交流论道，启迪智慧。",
      botId: "coze_mp_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 10,
      price: 1.99,
      monthlyPrice: 24.99,
      sortOrder: 8,
    },
    {
      name: "古籍活字典",
      type: "CLASSIC_DICTIONARY",
      avatar: "/static/bots/classic_dict.png",
      intro: "输入古籍中的疑难字句，AI即刻给出释义、出处和白话翻译，古文学习利器。",
      botId: "coze_cd_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 100,
      sortOrder: 9,
    },
    {
      name: "客户关系管家",
      type: "CRM_ASSISTANT",
      avatar: "/static/bots/crm_assistant.png",
      intro: "帮助站长高效管理客户关系，自动跟进意向客户，提升转化率。",
      botId: "coze_crm_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 30,
      price: 0.99,
      monthlyPrice: 14.99,
      sortOrder: 10,
    },
    {
      name: "全能办公助理",
      type: "OFFICE_ASSISTANT",
      avatar: "/static/bots/office_assistant.png",
      intro: "文案撰写、数据分析、PPT大纲、活动方案——国学人的AI办公助手。",
      botId: "coze_oa_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 30,
      sortOrder: 11,
    },
    {
      name: "个人运势自查台",
      type: "FORTUNE_CHECK",
      avatar: "/static/bots/fortune_check.png",
      intro: "每日宜忌、每周运势、每月总结，结合八字与紫微的个性化运势服务。",
      botId: "coze_fc_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 3,
      price: 3.99,
      monthlyPrice: 49.99,
      sortOrder: 12,
    },
    {
      name: "大师时间守护者",
      type: "SCHEDULE_GUARDIAN",
      avatar: "/static/bots/schedule_guardian.png",
      intro: "自动管理大师日程，协调课程安排、直播提醒和客户预约，时间管理专家。",
      botId: "coze_sg_001",
      apiKey: "sk_dev_placeholder",
      isFree: true,
      dailyLimit: 50,
      sortOrder: 13,
    },
    {
      name: "个人IP孵化器",
      type: "IP_INCUBATOR",
      avatar: "/static/bots/ip_incubator.png",
      intro: "为国学从业者提供个人品牌定位、内容规划和多平台运营策略，打造个人IP。",
      botId: "coze_ii_001",
      apiKey: "sk_dev_placeholder",
      isFree: false,
      dailyLimit: 5,
      price: 4.99,
      monthlyPrice: 59.99,
      sortOrder: 14,
    },
  ];

  let botCount = 0;
  for (const b of botsData) {
    const existing = await prisma.botConfig.findFirst({ where: { name: b.name } });
    if (!existing) {
      await prisma.botConfig.create({ data: b });
      botCount++;
    }
  }
  console.log("✅ 智能体: " + botCount + " 个");

  // 7. 创建商品
  const productsData = [
    {
      title: "《道德经》线装珍藏版",
      intro: "手工宣纸线装，朱砂句读，收藏级品质。含八十一章完整原文，附王弼注。",
      price: 299,
      images: ["/static/products/daodejing_book.jpg"],
      detail: `<h3>📖 产品亮点</h3><ul><li>宣纸手工线装，传统工艺打造，每册均为匠人手工穿线装帧</li><li>朱砂句读，红墨分明，断句清晰，阅读体验极佳</li><li>收录八十一章完整原文，附王弼注本</li><li>封面采用蓝布硬装，烫金书名，典雅大气</li><li>尺寸：18.5×26cm，大开本，字大行疏</li></ul><h3>🎁 适合场景</h3><p>书房陈设、送礼馈赠、日常诵读、收藏增值</p><h3>📦 包装</h3><p>函套精装，内含干燥剂，防潮防虫</p>`,
    },
    {
      title: "易经六十四卦卡牌",
      intro: "64张精美卦象卡牌，随时随地学习易经。含卦名、卦象、卦辞、简注。",
      price: 128,
      images: ["/static/products/yijing_cards.jpg"],
      detail: `<h3>🃏 产品亮点</h3><ul><li>64张卡牌，每张对应一个卦，正面为卦象图案，背面为卦名和卦辞</li><li>12×8cm大尺寸，300g铜版纸覆膜，手感厚实耐用</li><li>附带卦序索引卡和简易占断说明书</li><li>设计风格古朴典雅，每卦配以传统水墨元素</li></ul><h3>🎯 玩法多样</h3><p>每日抽一卦作为当日指引；用三张牌进行简易占断（过去/现在/未来）；系统学习易经时作为记忆卡片；茶几上的文化装饰</p><h3>🎁 赠品</h3><p>附赠电子版《易经入门指南》+ 卦序歌卡片</p>`,
    },
    {
      title: "国学经典诵读播放器",
      intro: "预装12部经典诵读音频，护眼墨水屏。支持蓝牙耳机，续航30天。",
      price: 399,
      images: ["/static/products/reader.jpg"],
      detail: `<h3>🎧 产品亮点</h3><ul><li>预装12部经典诵读音频：《道德经》《论语》《易经》《诗经》《心经》《金刚经》《大学》《中庸》《孟子》《庄子》《黄帝内经》《孙子兵法》</li><li>6英寸护眼墨水屏，类纸阅读体验，无蓝光伤害</li><li>专业播音员录制，字正腔圆，节奏舒缓，适合跟读和静听</li><li>蓝牙5.0连接耳机/音箱，内置扬声器</li><li>32GB存储，支持自行导入MP3/TXT文件</li><li>1500mAh电池，纯待机30天，持续播放40小时</li></ul><h3>📱 操作方式</h3><p>实体按键操作，老人小孩都能轻松上手。支持顺序播放、单篇循环、定时关机。</p><h3>🎁 适合人群</h3><p>国学爱好者、学生、老年人、视力不佳者、通勤/睡前听书族</p>`,
    },
    {
      title: "国学文化衫 · 经典系列",
      intro: "纯棉圆领T恤，正面印有名家书法《论语》名句。透气舒适，国风设计。",
      price: 79,
      images: ["/static/products/tshirt_lunyu.jpg", "/static/products/tshirt_daodejing.jpg"],
      detail: `<h3>👕 产品亮点</h3><ul><li>100%精梳棉，亲肤透气，四季皆宜</li><li>国学书法印花，洗后不褪色不龟裂</li><li>经典黑白两色可选，尺码S-3XL</li><li>书法字体可选：《论语》《道德经》《心经》《易经》四款</li></ul><h3>📏 尺码参考</h3><p>S(165/88A) M(170/92A) L(175/96A) XL(180/100A) 2XL(185/104A) 3XL(190/108A)</p>`,
    },
    {
      title: "手工檀香 · 静心礼盒",
      intro: "天然老山檀香线香，配紫铜香炉。读书打坐必备，安神静心。",
      price: 168,
      images: ["/static/products/incense_box.jpg"],
      detail: `<h3>🎋 产品亮点</h3><ul><li>印度老山檀香，纯天然无化学添加</li><li>每盒含约120支线香，每支燃烧约40分钟</li><li>附赠紫铜卧香炉一个，造型古朴雅致</li><li>沉香、檀香、艾草三种香型可选</li></ul><h3>💡 使用场景</h3><p>静坐冥想、读书习字、品茶论道、瑜伽修行——一缕清香，万般自在。</p>`,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({
      data: {
        title: p.title,
        intro: p.intro,
        detail: p.detail,
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

  // 8. 创建短视频
  const videosData = [
    {
      title: "《道德经》第一章诵读与讲解",
      videoUrl: "/static/videos/daodejing_ch1.mp4",
      coverUrl: "/static/covers/video_daodejing.jpg",
      duration: 480,
      viewCount: 12500,
      likeCount: 892,
      circleIdx: 0,
    },
    {
      title: "易经占卜入门：三枚铜钱起卦法",
      videoUrl: "/static/videos/yijing_divination.mp4",
      coverUrl: "/static/covers/video_yijing.jpg",
      duration: 720,
      viewCount: 9800,
      likeCount: 756,
      circleIdx: 1,
    },
    {
      title: "李白《将进酒》朗诵与赏析",
      videoUrl: "/static/videos/libai_jiangjinjiu.mp4",
      coverUrl: "/static/covers/video_libai.jpg",
      duration: 360,
      viewCount: 15200,
      likeCount: 1203,
      circleIdx: 2,
    },
    {
      title: "八段锦完整教学：每天10分钟",
      videoUrl: "/static/videos/baduanjin.mp4",
      coverUrl: "/static/covers/video_baduanjin.jpg",
      duration: 600,
      viewCount: 22000,
      likeCount: 2105,
      circleIdx: 5,
    },
    {
      title: "《论语》中的人生智慧：学而篇精讲",
      videoUrl: "/static/videos/lunyu_xueer.mp4",
      coverUrl: "/static/covers/video_lunyu.jpg",
      duration: 900,
      viewCount: 7800,
      likeCount: 623,
      circleIdx: 4,
    },
    {
      title: "认识你的生辰八字：排盘入门",
      videoUrl: "/static/videos/bazi_intro.mp4",
      coverUrl: "/static/covers/video_bazi.jpg",
      duration: 840,
      viewCount: 18500,
      likeCount: 1567,
      circleIdx: 3,
    },
  ];

  for (const v of videosData) {
    const circle = circles[v.circleIdx];
    const author = v.circleIdx % 2 === 0 ? admin : teacher;
    await prisma.video.create({
      data: {
        title: v.title,
        videoUrl: v.videoUrl,
        coverUrl: v.coverUrl,
        duration: v.duration,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        status: "PUBLISHED",
        circleId: circle.id,
        userId: author.id,
      },
    });
  }
  console.log("✅ 短视频: " + videosData.length + " 条");

  // 9. 创建热门搜索词
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

  // 11. 创建通知
  const notificationsData = [
    { type: "SYSTEM", title: "欢迎加入国学平台", content: "欢迎您加入国学传统文化综合平台！在这里您可以学习经典、参与圈子讨论、观看直播课程。祝您学有所得！" },
    { type: "SYSTEM", title: "平台升级通知", content: "平台已完成系统升级，新增智能体助手功能，您可以在「AI智能体」页面体验14款国学AI助手。" },
    { type: "SYSTEM", title: "新课程上线：《道德经》81章精讲", content: "李玄明老师的《道德经》81章精讲课程已上线，限时特惠299元（原价599元），点击查看详情。" },
    { type: "SYSTEM", title: "会员权益升级", content: "感谢您的支持！平台会员权益已升级，年卡会员可免费学习所有音频课程，并享受商城9折优惠。" },
    { type: "LIKE", title: "您的文章收到新的点赞", content: "用户「清心居士」赞了您的文章《道德经第一章：道可道，非常道》。" },
    { type: "COMMENT", title: "有人回复了您的评论", content: "用户「易学小白」回复了您在圈子「易经天地」中的评论：「说得很有道理，学习了。」" },
    { type: "LIKE", title: "您的评论被点赞", content: "用户「诗酒趁年华」赞了您在「诗词雅集」的评论。" },
    { type: "COMMENT", title: "您的帖子有新评论", content: "用户「修行者」在您的帖子「每日一卦·乾卦解读」中发表了新评论。" },
    { type: "SYSTEM", title: "直播提醒：今晚8点《易经占断实战》", content: "您关注的直播「易经占断实战」将在今晚8点开始，主播：王清音老师，不要错过哦。" },
    { type: "SYSTEM", title: "学习进度提醒", content: "您学习的课程《唐诗宋词赏析30讲》已完成30%，继续加油！" },
    { type: "SYSTEM", title: "商品到货通知", content: "您关注的「国学文化衫·经典系列」已到货上架，限量发售中。" },
    { type: "SYSTEM", title: "每日运势已更新", content: "您今日的运势报告已生成，点击查看今日宜忌及幸运方向。" },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: false,
      },
    });
  }
  console.log("✅ 通知: " + notificationsData.length + " 条");

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

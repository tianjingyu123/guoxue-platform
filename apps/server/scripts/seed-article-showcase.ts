import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ASSET = "https://api.rebugx.cn/h5/static/images/articles";

const articles = [
  {
    id: "8d71bd3b-5f71-4b2d-a9cb-260726000001",
    title: "一盏春茶里的中国时间：从采青、候火到待客之礼",
    excerpt: "清明前后的新茶，不只是味觉经验。顺着一片叶子的来路，我们可以看见节气、手艺与中国人的待客分寸。",
    cover: `${ASSET}/spring-tea.svg`,
    layout: "FEATURE",
    tags: ["节气生活", "茶文化", "本期策划"],
    viewCount: 3862,
    likeCount: 428,
    collectCount: 176,
    content: `
      <p>清明是二十四节气中最适合谈“新”的时刻。雨水渐丰，草木舒展，茶树也把一个冬天积攒的气息推到芽尖。古人说“茶贵新”，并非只追求鲜嫩，而是在意人与时令是否相合。</p>
      <h2>一、先辨时令，再谈滋味</h2>
      <p>所谓明前、雨前，首先是一套时间标尺。不同产区的温度、海拔与树种各异，不能只用一个日期判断优劣。真正值得关注的是芽叶是否舒展、香气是否清正，以及制作是否顺应当天的天气。</p>
      <blockquote>节气不是装饰性的标签，而是古人观察自然后形成的生活秩序。</blockquote>
      <h2>二、候火：把急躁留在水沸之前</h2>
      <p>煮水、温器、投茶，看似简单，却让人自然慢下来。水声从细碎到连珠，正好提醒我们：一杯茶的完成，需要等待，也需要判断。</p>
      <img src="${ASSET}/spring-tea.svg" alt="春茶与节气"/>
      <h2>三、待客之礼，在浓淡之间</h2>
      <p>中国茶席讲究“主随客便”。先问喜好，再定浓淡；杯中不斟满，是为了方便持握，也为下一次续茶留出余地。真正的礼，不是繁复仪式，而是让对方感到被照顾。</p>
      <p>当我们重新理解一盏春茶，也是在重新学习如何与季节相处、如何把时间交还给生活。</p>
    `,
  },
  {
    id: "8d71bd3b-5f71-4b2d-a9cb-260726000002",
    title: "器物里的礼乐中国：从一件青铜器读懂“礼”",
    excerpt: "纹样、铭文、器形与使用场景，共同构成一件器物的语言。这篇图像志带你从三个细节进入礼乐文明。",
    cover: `${ASSET}/museum-bronze.svg`,
    layout: "GALLERY",
    tags: ["器物美学", "博物志", "图像志"],
    viewCount: 2941,
    likeCount: 367,
    collectCount: 219,
    content: `
      <p>面对博物馆里的青铜器，我们常常先被它的体量和纹饰吸引。但如果只把它看作一件“漂亮的古董”，就会错过器物背后的秩序。</p>
      <img src="${ASSET}/museum-detail.svg" alt="青铜器纹样细节"/>
      <h2>纹样：不是装饰，而是观看方式</h2>
      <p>对称、回旋、连续，是商周纹样中常见的组织方式。它们让视线不断回到中心，也让器物在庄重中保持节奏。</p>
      <img src="${ASSET}/museum-ritual.svg" alt="礼制空间示意"/>
      <h2>空间：器物为何总与位置有关</h2>
      <p>礼器从来不是孤立存在。它与席位、方向、次序共同出现。器物被放在哪里、由谁使用，本身就是一段无声的说明。</p>
      <h2>铭文：把一次事件留给后人</h2>
      <p>许多铭文记录册命、征伐、赏赐与家族记忆。短短数十字，把个人经历放进更长的历史中。读器，也是在读人与时代的关系。</p>
    `,
  },
  {
    id: "8d71bd3b-5f71-4b2d-a9cb-260726000003",
    title: "永字八法不是八个动作：初学书法先学会看线条",
    excerpt: "与其急着临满一整页，不如先学会观察起笔、行笔、收笔。看懂一条线，才真正迈进书法的门。",
    cover: `${ASSET}/calligraphy-room.svg`,
    layout: "SINGLE",
    tags: ["书法入门", "学习方法", "一课一得"],
    viewCount: 1876,
    likeCount: 246,
    collectCount: 133,
    content: `
      <p>很多初学者第一次拿起毛笔，会立刻问：“这个字怎么写得像？”其实，比“像”更重要的，是先看懂线条经历了什么。</p>
      <h2>第一步：看起笔的方向</h2>
      <p>起笔并不是一个点。笔锋落纸时有方向、有轻重，也有短暂的停顿。把这一瞬间看清楚，线条才不会显得轻浮。</p>
      <h2>第二步：看行笔的速度</h2>
      <p>同一条横画，中段并非匀速拖过。提按、转折与速度共同决定线条的厚薄和弹性。</p>
      <blockquote>临帖不是复制轮廓，而是还原古人用笔的时间过程。</blockquote>
      <h2>第三步：一次只解决一个问题</h2>
      <p>今天只观察横画，明天只观察转折。把问题拆小，比反复写一百个相似的字更有效。学习书法的耐心，来自看见自己每次具体的进步。</p>
    `,
  },
  {
    id: "8d71bd3b-5f71-4b2d-a9cb-260726000004",
    title: "古籍怎样读得进去：给第一次打开经典的你",
    excerpt: "不必从头硬啃，也不必先背完所有注释。用“问题—原文—注解—复述”四步法，建立自己的经典阅读路径。",
    cover: `${ASSET}/classic-desk.svg`,
    layout: "COLUMN",
    tags: ["经典研读", "阅读方法", "专栏"],
    viewCount: 4250,
    likeCount: 521,
    collectCount: 308,
    content: `
      <p>古籍难读，往往不是因为每个字都不认识，而是不知道应该带着什么问题进入。没有问题，注释越多越容易迷路。</p>
      <h2>先用一个问题打开文本</h2>
      <p>读《论语》，可以先问“孔子如何理解学习”；读《孟子》，可以先问“人为什么能够向善”。问题像一根线，把散落的章句串起来。</p>
      <h2>原文只读一小段</h2>
      <p>每次选三到五句，先标出不确定的词，再看注解。不要让注释替你完成全部思考，先写下自己的理解，哪怕只有一句。</p>
      <h2>最后用自己的话复述</h2>
      <p>合上书，试着向一个朋友解释刚才读到的内容。说不清的地方，就是下一轮应该回到原文的位置。</p>
      <blockquote>经典阅读不是完成一项任务，而是让一段古老经验进入今天的问题。</blockquote>
      <p>当你有了稳定的读法，古籍就不再是一堵墙，而会变成可以反复往来的路径。</p>
    `,
  },
] as const;

async function main() {
  const circle = await prisma.circle.findFirst({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: [{ memberCount: "desc" }, { createdAt: "asc" }],
    select: { id: true, ownerId: true, name: true },
  });
  if (!circle) throw new Error("未找到可承载文章的已审核圈子");

  for (const [index, article] of articles.entries()) {
    const data = {
      title: article.title,
      excerpt: article.excerpt,
      cover: article.cover,
      layout: article.layout,
      tags: [...article.tags],
      viewCount: article.viewCount,
      likeCount: article.likeCount,
      collectCount: article.collectCount,
      content: article.content,
      circleId: circle.id,
      userId: circle.ownerId,
      auditStatus: "APPROVED",
      visibility: "PLATFORM",
      isPushHome: index < 2,
      deletedAt: null,
    };
    await prisma.article.upsert({
      where: { id: article.id },
      update: data,
      create: {
        id: article.id,
        ...data,
        createdAt: new Date(Date.now() - index * 3_600_000),
      },
    });
  }

  console.log(`文章展示种子已写入：${articles.length} 篇；承载圈子：${circle.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

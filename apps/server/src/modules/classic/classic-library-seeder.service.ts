import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

interface ClassicSeed {
  title: string;
  author: string;
  dynasty: string;
  category: "经" | "史" | "子" | "集" | "释" | "道";
  intro: string;
  chapters: Array<{
    title: string;
    content: string;
    translation?: string;
    annotation?: string;
  }>;
}

/**
 * 国学经典原文库种子服务
 *
 * 内置 30+ 部核心经典的章节目录和关键原文片段，
 * 用于冷启动 RAG 知识库和古籍阅读模块。
 *
 * 策略：每部经典只内置精华片段（首章/核心章节），
 * 完整内容通过后台管理或外部导入补全。
 */
@Injectable()
export class ClassicLibrarySeeder implements OnModuleInit {
  private readonly logger = new Logger(ClassicLibrarySeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {}

  /** 模块初始化时自动播种 30+ 部经典 */
  async onModuleInit() {
    this.logger.log("开始自动初始化经典文库...");
    try {
      const result = await this.seed();
      this.logger.log(`经典文库初始化完成: 新建${result.created}, 跳过${result.skipped}`);
      // 异步同步到知识库并向量化
      if (result.created > 0) {
        const synced = await this.syncToKnowledge();
        this.logger.log(`自动同步知识库: ${synced} 条`);
        const vectorized = await this.vectorizeUnindexed(100);
        this.logger.log(`自动向量化: ${vectorized} 条`);
      }
    } catch (err: any) {
      this.logger.warn(`自动初始化经典文库失败（将在定时任务中重试）: ${err.message}`);
    }
  }

  /** 执行种子数据初始化（幂等） */
  async seed(): Promise<{ created: number; skipped: number }> {
    const seeds = this.getSeeds();
    let created = 0;
    let skipped = 0;

    for (const seed of seeds) {
      const exists = await this.prisma.classicBook.findFirst({
        where: { title: seed.title },
      });

      if (exists) {
        skipped++;
        continue;
      }

      try {
        const book = await this.prisma.classicBook.create({
          data: {
            title: seed.title,
            author: seed.author,
            dynasty: seed.dynasty,
            category: seed.category,
            intro: seed.intro,
            chapterCount: seed.chapters.length,
            status: "PUBLISHED",
          },
        });

        for (let i = 0; i < seed.chapters.length; i++) {
          const ch = seed.chapters[i];
          await this.prisma.classicChapter.create({
            data: {
              bookId: book.id,
              title: ch.title,
              content: ch.content,
              translation: ch.translation,
              annotation: ch.annotation,
              sortOrder: i + 1,
            },
          });
        }

        created++;
      } catch (err: any) {
        this.logger.warn(`种子 ${seed.title} 创建失败: ${err.message}`);
      }
    }

    this.logger.log(`种子初始化完成: 新建 ${created}, 跳过 ${skipped}`);
    return { created, skipped };
  }

  /** 对已入库但未向量化的经典章节进行向量化 */
  async vectorizeUnindexed(batchSize = 30): Promise<number> {
    const unindexed = await this.vector.findUnindexed(batchSize);
    if (unindexed.length === 0) return 0;

    const texts = unindexed.map((r) => r.content);
    const vectors = await this.vector.embed(texts);

    let count = 0;
    for (let i = 0; i < unindexed.length && i < vectors.length; i++) {
      await this.vector.storeCircleKnowledge(unindexed[i].id, vectors[i]);
      count++;
    }

    this.logger.log(`向量化完成: ${count} 条`);
    return count;
  }

  /** 将经典章节同步到 circle_knowledge（供 RAG 检索） */
  async syncToKnowledge(): Promise<number> {
    const books = await this.prisma.classicBook.findMany({
      select: { id: true, title: true },
    });

    let synced = 0;

    for (const book of books) {
      const chapters = await this.prisma.classicChapter.findMany({
        where: { bookId: book.id },
        select: { id: true, title: true, content: true },
      });

      for (const ch of chapters) {
        if (!ch.content) continue;

        const chunks = this.chunkContent(book.title, ch.title, ch.content);
        for (const chunk of chunks) {
          const existing = await this.prisma.circleKnowledge.findFirst({
            where: {
              circleId: "classic",
              sourceType: "classic_chunk",
              contentHash: this.hashContent(chunk.content),
            },
          });

          if (existing) continue;

          try {
            await this.prisma.circleKnowledge.create({
              data: {
                circleId: "classic",
                sourceType: "classic_chunk",
                sourceId: ch.id,
                content: chunk.content,
                contentHash: this.hashContent(chunk.content),
                addedBy: "SYSTEM",
              },
            });
            synced++;
          } catch (err) {
            this.logger.debug(`知识库同步失败（可能 contentHash 重复）`);
          }
        }
      }
    }

    this.logger.log(`知识库同步完成: ${synced} 条分块`);
    return synced;
  }

  /**
   * 智能分块：按段落切分长文本，保持语义完整
   * 每块 200-500 字，前缀标注书名+章节
   */
  private chunkContent(
    bookTitle: string,
    chapterTitle: string,
    content: string,
  ): Array<{ content: string }> {
    const prefix = `《${bookTitle}·${chapterTitle}》`;
    const maxChunkSize = 400;
    const minChunkSize = 100;

    if (content.length <= maxChunkSize) {
      return [{ content: `${prefix} ${content}` }];
    }

    const paragraphs = content.split(/\n+/).filter((p) => p.trim().length > 0);
    const chunks: Array<{ content: string }> = [];
    let buffer = "";

    for (const para of paragraphs) {
      if (buffer.length + para.length > maxChunkSize && buffer.length >= minChunkSize) {
        chunks.push({ content: `${prefix} ${buffer.trim()}` });
        buffer = "";
      }
      buffer += (buffer ? "\n" : "") + para;
    }

    if (buffer.trim().length > 0) {
      chunks.push({ content: `${prefix} ${buffer.trim()}` });
    }

    return chunks;
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16);
  }

  /** 30+ 部核心国学经典种子数据 */
  private getSeeds(): ClassicSeed[] {
    return [
      // ═══ 四书 ═══
      {
        title: "论语",
        author: "孔子及弟子",
        dynasty: "春秋",
        category: "经",
        intro: "儒家核心经典，记录孔子及弟子言行的语录体散文集。",
        chapters: [
          {
            title: "学而篇第一",
            content: `子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"有子曰："其为人也孝弟，而好犯上者，鲜矣；不好犯上，而好作乱者，未之有也。君子务本，本立而道生。孝弟也者，其为仁之本与！"子曰："巧言令色，鲜矣仁！"曾子曰："吾日三省吾身——为人谋而不忠乎？与朋友交而不信乎？传不习乎？"`,
            translation: `孔子说："学了知识然后按时温习，不是很愉快吗？有志同道合的朋友从远方来，不是很快乐吗？别人不了解自己却不生气，不也是君子的风度吗？"`,
          },
          {
            title: "为政篇第二",
            content: `子曰："为政以德，譬如北辰，居其所而众星共之。"子曰："《诗》三百，一言以蔽之，曰'思无邪'。"子曰："道之以政，齐之以刑，民免而无耻；道之以德，齐之以礼，有耻且格。"子曰："吾十有五而志于学，三十而立，四十而不惑，五十而知天命，六十而耳顺，七十而从心所欲，不逾矩。"`,
            translation: `孔子说："以道德教化来治理政事，就会像北极星那样，自己居于一定的方位，而群星都环绕着它。"`,
          },
          {
            title: "里仁篇第四",
            content: `子曰："里仁为美。择不处仁，焉得知？"子曰："不仁者不可以久处约，不可以长处乐。仁者安仁，知者利仁。"子曰："唯仁者能好人，能恶人。"子曰："苟志于仁矣，无恶也。"子曰："富与贵，是人之所欲也；不以其道得之，不处也。贫与贱，是人之所恶也；不以其道得之，不去也。"`,
            translation: `孔子说："居住在有仁德的地方才好。选择住处，不住在有仁德的地方，怎么能算是聪明呢？"`,
          },
        ],
      },
      {
        title: "孟子",
        author: "孟轲",
        dynasty: "战国",
        category: "经",
        intro: "儒家经典，阐述性善论、仁政思想和民贵君轻理念。",
        chapters: [
          {
            title: "梁惠王章句上",
            content: `孟子见梁惠王。王曰："叟！不远千里而来，亦将有以利吾国乎？"孟子对曰："王何必曰利？亦有仁义而已矣。王曰'何以利吾国'？大夫曰'何以利吾家'？士庶人曰'何以利吾身'？上下交征利而国危矣。"`,
            translation: `孟子拜见梁惠王。惠王说："老先生，您不远千里而来，一定有什么对我的国家有利的高见吧？"孟子回答说："大王何必说利呢？只要有仁义就行了。"`,
          },
          {
            title: "公孙丑章句上",
            content: `公孙丑问曰："夫子当路于齐，管仲、晏子之功，可复许乎？"孟子曰："子诚齐人也，知管仲、晏子而已矣。"曰："管仲以其君霸，晏子以其君显，管仲晏子犹不足为与？"曰："以齐王，由反手也。"曰："若是，则弟子之惑滋甚。且以文王之德，百年而后崩，犹未洽于天下；武王、周公继之，然后大行。今言王若易然，则文王不足法与？"`,
          },
        ],
      },
      {
        title: "大学",
        author: "曾参",
        dynasty: "春秋",
        category: "经",
        intro: "四书之一，阐述修身齐家治国平天下的政治哲学。",
        chapters: [
          {
            title: "经一章",
            content: "大学之道，在明明德，在亲民，在止于至善。知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。物有本末，事有终始。知所先后，则近道矣。古之欲明明德于天下者，先治其国；欲治其国者，先齐其家；欲齐其家者，先修其身；欲修其身者，先正其心；欲正其心者，先诚其意；欲诚其意者，先致其知。致知在格物。",
            translation: "大学的宗旨在于弘扬光明正大的品德，在于使人弃旧图新，在于使人达到最完善的境界。",
          },
        ],
      },
      {
        title: "中庸",
        author: "子思",
        dynasty: "战国",
        category: "经",
        intro: "四书之一，论述中正和谐之道，是儒家心性哲学的核心经典。",
        chapters: [
          {
            title: "第一章",
            content: "天命之谓性，率性之谓道，修道之谓教。道也者，不可须臾离也，可离非道也。是故君子戒慎乎其所不睹，恐惧乎其所不闻。莫见乎隐，莫显乎微，故君子慎其独也。喜怒哀乐之未发，谓之中；发而皆中节，谓之和；中也者，天下之大本也；和也者，天下之达道也。致中和，天地位焉，万物育焉。",
            translation: "上天所赋予人的，叫做本性；遵循本性而行的，叫做正道；修养正道的，叫做教化。",
          },
        ],
      },

      // ═══ 五经 ═══
      {
        title: "周易",
        author: "伏羲、周文王、孔子",
        dynasty: "上古-周",
        category: "经",
        intro: "群经之首，包含六十四卦及系辞等十翼，涵盖哲学、占卜、自然规律。",
        chapters: [
          {
            title: "乾卦第一",
            content: "乾：元，亨，利，贞。初九：潜龙，勿用。九二：见龙在田，利见大人。九三：君子终日乾乾，夕惕若，厉无咎。九四：或跃在渊，无咎。九五：飞龙在天，利见大人。上九：亢龙有悔。用九：见群龙无首，吉。",
            translation: "乾卦象征天：至大至刚，畅通无阻，利于守持正固。",
          },
          {
            title: "坤卦第二",
            content: "坤：元，亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞，吉。初六：履霜，坚冰至。六二：直，方，大，不习无不利。六三：含章可贞。或从王事，无成有终。六四：括囊，无咎无誉。六五：黄裳，元吉。上六：龙战于野，其血玄黄。",
            translation: "坤卦象征地：至柔至顺，如母马般柔顺而贞正。",
          },
          {
            title: "系辞上传",
            content: "天尊地卑，乾坤定矣。卑高以陈，贵贱位矣。动静有常，刚柔断矣。方以类聚，物以群分，吉凶生矣。在天成象，在地成形，变化见矣。是故刚柔相摩，八卦相荡。鼓之以雷霆，润之以风雨。日月运行，一寒一暑。乾道成男，坤道成女。乾知大始，坤作成物。",
            translation: "天尊贵，地卑微，乾坤的位置由此确定。低的高的排列有序，尊贵与卑贱的地位也由此确定。",
          },
        ],
      },
      {
        title: "诗经",
        author: "佚名",
        dynasty: "西周-春秋",
        category: "经",
        intro: "中国最早的诗歌总集，收录305首诗，分风、雅、颂三部分。",
        chapters: [
          {
            title: "关雎（国风·周南）",
            content: "关关雎鸠，在河之洲。窈窕淑女，君子好逑。参差荇菜，左右流之。窈窕淑女，寤寐求之。求之不得，寤寐思服。悠哉悠哉，辗转反侧。参差荇菜，左右采之。窈窕淑女，琴瑟友之。参差荇菜，左右芼之。窈窕淑女，钟鼓乐之。",
            translation: "关关鸣叫的雎鸠鸟，栖息在河中的小洲上。美丽善良的姑娘，是君子好的配偶。",
          },
          {
            title: "蒹葭（国风·秦风）",
            content: "蒹葭苍苍，白露为霜。所谓伊人，在水一方。溯洄从之，道阻且长。溯游从之，宛在水中央。蒹葭萋萋，白露未晞。所谓伊人，在水之湄。溯洄从之，道阻且跻。溯游从之，宛在水中坻。蒹葭采采，白露未已。所谓伊人，在水之涘。",
            translation: "芦苇茂盛苍苍，白露凝结成霜。所说的那个人，就在河水那一边。",
          },
        ],
      },
      {
        title: "尚书",
        author: "佚名",
        dynasty: "先秦",
        category: "经",
        intro: "中国最古老的政事文献汇编，记录上古帝王治国理政的言行。",
        chapters: [
          {
            title: "尧典",
            content: "曰若稽古帝尧，曰放勋，钦明文思安安，允恭克让，光被四表，格于上下。克明俊德，以亲九族。九族既睦，平章百姓。百姓昭明，协和万邦。黎民于变时雍。",
            translation: "考察古代帝尧的事迹，他名叫放勋，恭敬、聪明、有文采、有思想，安详而从容。他真诚恭敬，能够谦让。",
          },
        ],
      },
      {
        title: "礼记",
        author: "戴圣",
        dynasty: "西汉",
        category: "经",
        intro: "儒家礼学典籍，论述先秦礼制、教育及社会规范。",
        chapters: [
          {
            title: "礼运·大同篇",
            content: "大道之行也，天下为公。选贤与能，讲信修睦，故人不独亲其亲，不独子其子，使老有所终，壮有所用，幼有所长，鳏寡孤独废疾者皆有所养，男有分，女有归。货恶其弃于地也，不必藏于己；力恶其不出于身也，不必为己。是故谋闭而不兴，盗窃乱贼而不作，故外户而不闭，是谓大同。",
            translation: "大道施行的时候，天下是天下人共有的天下。选举有贤德、有才能的人来治理国家，人们讲求诚信，修习和睦。",
          },
          {
            title: "学记",
            content: `发虑宪，求善良，足以謏闻，不足以动众。就贤体远，足以动众，未足以化民。君子如欲化民成俗，其必由学乎！玉不琢，不成器；人不学，不知道。是故古之王者建国君民，教学为先。《兑命》曰："念终始典于学。"其此之谓乎！`,
            translation: "思虑要合乎法则，追求善良的品行，这虽然足以获得小名声，却不足以感动众人。",
          },
        ],
      },
      {
        title: "春秋左传",
        author: "左丘明",
        dynasty: "春秋",
        category: "经",
        intro: "左丘明为《春秋》作的注解，是中国最早的编年体史书。",
        chapters: [
          {
            title: "郑伯克段于鄢",
            content: `初，郑武公娶于申，曰武姜，生庄公及共叔段。庄公寤生，惊姜氏，故名曰寤生，遂恶之。爱共叔段，欲立之。亟请于武公，公弗许。及庄公即位，为之请制。公曰："制，岩邑也，虢叔死焉，佗邑唯命。"请京，使居之，谓之京城大叔。`,
            translation: "当初，郑武公娶了申国的女子为妻，称为武姜，生下庄公和共叔段。",
          },
        ],
      },

      // ═══ 道家 ═══
      {
        title: "道德经",
        author: "老子（李耳）",
        dynasty: "春秋",
        category: "道",
        intro: "道家核心经典，论述道与德的哲学思想，共81章，约5000字。",
        chapters: [
          {
            title: "第一章",
            content: "道可道，非常道；名可名，非常名。无名天地之始；有名万物之母。故常无，欲以观其妙；常有，欲以观其徼。此两者，同出而异名，同谓之玄。玄之又玄，众妙之门。",
            translation: "可以用语言表达的道，就不是永恒的道；可以用名称定义的名，就不是永恒的名。",
          },
          {
            title: "第二章",
            content: "天下皆知美之为美，斯恶已。皆知善之为善，斯不善已。故有无相生，难易相成，长短相形，高下相倾，音声相和，前后相随。是以圣人处无为之事，行不言之教；万物作焉而不辞，生而不有，为而不恃，功成而弗居。夫唯弗居，是以不去。",
            translation: "天下都知道美之所以为美，就有了丑的概念。都知道善之所以为善，就有了不善的概念。",
          },
          {
            title: "第八十一章",
            content: "信言不美，美言不信。善者不辩，辩者不善。知者不博，博者不知。圣人不积，既以为人己愈有，既以与人己愈多。天之道，利而不害；圣人之道，为而不争。",
            translation: "真实的话不漂亮，漂亮的话不真实。善良的人不巧辩，巧辩的人不善良。",
          },
        ],
      },
      {
        title: "庄子",
        author: "庄周",
        dynasty: "战国",
        category: "道",
        intro: "道家经典，以寓言故事阐述逍遥游、齐物论等哲学思想。",
        chapters: [
          {
            title: "逍遥游",
            content: `北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也；怒而飞，其翼若垂天之云。是鸟也，海运则将徙于南冥。南冥者，天池也。《齐谐》者，志怪者也。《谐》之言曰："鹏之徙于南冥也，水击三千里，抟扶摇而上者九万里，去以六月息者也。"`,
            translation: "北方的大海里有一条鱼，它的名字叫做鲲。鲲的巨大，不知道有几千里。",
          },
          {
            title: "齐物论",
            content: `南郭子綦隐机而坐，仰天而嘘，荅焉似丧其耦。颜成子游立侍乎前，曰："何居乎？形固可使如槁木，而心固可使如死灰乎？今之隐机者，非昔之隐机者也。"子綦曰："偃，不亦善乎，而问之也！今者吾丧我，汝知之乎？女闻人籁而未闻地籁，女闻地籁而未闻天籁夫！"`,
            translation: "南郭子綦靠着几案而坐，仰头向天缓缓嘘气，恍惚间好像灵魂出窍一般。",
          },
        ],
      },
      {
        title: "列子",
        author: "列御寇",
        dynasty: "战国",
        category: "道",
        intro: "道家经典，以寓言阐述宇宙观和人生哲学，代表篇章有《愚公移山》。",
        chapters: [
          {
            title: "汤问篇·愚公移山",
            content: `太行、王屋二山，方七百里，高万仞。本在冀州之南，河阳之北。北山愚公者，年且九十，面山而居。惩山北之塞，出入之迂也，聚室而谋曰："吾与汝毕力平险，指通豫南，达于汉阴，可乎？"杂然相许。`,
            translation: "太行和王屋两座大山，方圆七百里，高万仞。原来在冀州的南面、黄河的北面。",
          },
        ],
      },

      // ═══ 佛学 ═══
      {
        title: "心经",
        author: "玄奘（译）",
        dynasty: "唐",
        category: "释",
        intro: "般若波罗蜜多心经，佛教核心经典，全文260字，阐述空性智慧。",
        chapters: [
          {
            title: "全文",
            content: "观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。舍利子，是诸法空相，不生不灭，不垢不净，不增不减。是故空中无色，无受想行识，无眼耳鼻舌身意，无色声香味触法，无眼界，乃至无意识界。无无明，亦无无明尽，乃至无老死，亦无老死尽。无苦集灭道，无智亦无得。以无所得故，菩提萨埵，依般若波罗蜜多故，心无罣碍。无罣碍故，无有恐怖，远离颠倒梦想，究竟涅槃。",
            translation: "观自在菩萨在修习深奥的般若智慧时，照见人的色、受、想、行、识五种蕴聚都是虚空。",
          },
        ],
      },
      {
        title: "金刚经",
        author: "鸠摩罗什（译）",
        dynasty: "后秦",
        category: "释",
        intro: "全称《金刚般若波罗蜜经》，大乘佛教核心经典，论述般若空性。",
        chapters: [
          {
            title: "第一品·法会因由分",
            content: "如是我闻。一时，佛在舍卫国祇树给孤独园，与大比丘众千二百五十人俱。尔时，世尊食时，著衣持钵，入舍卫大城乞食。于其城中，次第乞已，还至本处。饭食讫，收衣钵，洗足已，敷座而坐。",
            translation: "我是这样听说的。有一次，佛陀住在舍卫国的祇树给孤独园中，和一千二百五十位大比丘在一起。",
          },
          {
            title: "第三十二品·应化非真分",
            content: "须菩提！若有人以满无量阿僧祇世界七宝持用布施，若有善男子、善女人发菩提心者，持于此经，乃至四句偈等，受持读诵，为人演说，其福胜彼。云何为人演说，不取于相，如如不动。一切有为法，如梦幻泡影，如露亦如电，应作如是观。",
            translation: "一切因缘和合所生之法，都像梦、幻、水泡、影子一样虚幻不实，像朝露、像闪电一样转瞬即逝，应当这样看待一切。",
          },
        ],
      },
      {
        title: "六祖坛经",
        author: "慧能",
        dynasty: "唐",
        category: "释",
        intro: `禅宗六祖慧能的说法记录，是汉传佛教中唯一被称为"经"的祖师著作。`,
        chapters: [
          {
            title: "行由品第一",
            content: `时，大师至宝林，韶州韦刺史与官僚入山，请师出，于城中大梵寺讲堂，为众开缘说法。师升座次，刺史官僚三十余人、儒宗学士三十余人、僧尼道俗一千余人，同时作礼，愿闻法要。大师告众曰："善知识！菩提自性，本来清净，但用此心，直了成佛。"`,
            translation: "当时，大师到了宝林寺，韶州的韦刺史和官员们进山来，请大师出来说法。",
          },
        ],
      },

      // ═══ 中医 ═══
      {
        title: "黄帝内经·素问",
        author: "佚名",
        dynasty: "先秦-汉",
        category: "子",
        intro: "中医学奠基之作，论述阴阳五行、脏腑经络、病因病机和养生之道。",
        chapters: [
          {
            title: "上古天真论篇第一",
            content: "昔在黄帝，生而神灵，弱而能言，幼而徇齐，长而敦敏，成而登天。乃问于天师曰：余闻上古之人，春秋皆度百岁，而动作不衰；今时之人，年半百而动作皆衰者，时世异耶？人将失之耶？岐伯对曰：上古之人，其知道者，法于阴阳，和于术数，食饮有节，起居有常，不妄作劳，故能形与神俱，而尽终其天年，度百岁乃去。",
            translation: "从前的黄帝，生来就十分聪慧灵敏。他问老师岐伯：听说上古之人都能活过百岁，而今人半百就衰老了，是什么原因？",
          },
          {
            title: "四气调神大论篇第二",
            content: "春三月，此谓发陈。天地俱生，万物以荣，夜卧早起，广步于庭，被发缓形，以使志生，生而勿杀，予而勿夺，赏而勿罚，此春气之应，养生之道也。逆之则伤肝，夏为寒变，奉长者少。",
            translation: "春天的三个月，叫做发陈，是推陈出新、生命萌发的季节。天地自然都富有生气，万物显得欣欣向荣。",
          },
        ],
      },
      {
        title: "伤寒杂病论",
        author: "张仲景",
        dynasty: "东汉",
        category: "子",
        intro: "中医临床医学的奠基之作，确立了辨证论治的原则。",
        chapters: [
          {
            title: "辨太阳病脉证并治（上）",
            content: "太阳之为病，脉浮，头项强痛而恶寒。太阳病，发热，汗出，恶风，脉缓者，名为中风。太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧者，名为伤寒。",
            translation: "太阳病的特征是脉象浮，头和后颈部僵硬疼痛，并且怕冷。",
          },
        ],
      },
      {
        title: "神农本草经",
        author: "佚名",
        dynasty: "汉",
        category: "子",
        intro: "中药学奠基之作，记载365种药物，分上、中、下三品。",
        chapters: [
          {
            title: "上经·人参",
            content: "人参，味甘微寒。主补五脏，安精神，定魂魄，止惊悸，除邪气，明目，开心益智。久服轻身延年。一名人衔，一名鬼盖。生山谷。",
            translation: "人参味甘性微寒，主要功效是补益五脏，安定精神，安定魂魄，止惊悸，驱除邪气，使眼睛明亮，开心窍增益智慧。",
          },
        ],
      },

      // ═══ 诗词文学 ═══
      {
        title: "唐诗三百首",
        author: "蘅塘退士（编）",
        dynasty: "清",
        category: "集",
        intro: "中国古典诗歌最负盛名的选本，收录唐代诗人77位、诗作311首。",
        chapters: [
          {
            title: "感遇·其一（张九龄）",
            content: "兰叶春葳蕤，桂华秋皎洁。欣欣此生意，自尔为佳节。谁知林栖者，闻风坐相悦。草木有本心，何求美人折。",
            translation: "兰草在春天枝叶繁茂，桂花在秋天洁白美好。它们各自在自己的时节散发生机和光辉。",
          },
          {
            title: "春望（杜甫）",
            content: "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。",
            translation: "国家已经破碎，只有山河依旧存在。城中春天的草木已经长得很茂盛了。",
          },
          {
            title: "静夜思（李白）",
            content: "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
            translation: "明亮的月光照在床前，好像地上泛起一层白霜。抬头望着天上的明月，低下头思念远方的故乡。",
          },
        ],
      },
      {
        title: "宋词三百首",
        author: "朱孝臧（编）",
        dynasty: "民国",
        category: "集",
        intro: "宋词经典选本，收录宋代词人的优秀作品，展现词的艺术巅峰。",
        chapters: [
          {
            title: "水调歌头（苏轼）",
            content: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。",
            translation: "明月是什么时候开始有的呢？我端起酒杯遥问苍天。不知道天上的宫殿，今晚是哪年哪日。",
          },
          {
            title: "声声慢（李清照）",
            content: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。三杯两盏淡酒，怎敌他、晚来风急。雁过也，正伤心，却是旧时相识。满地黄花堆积。憔悴损，如今有谁堪摘。守着窗儿，独自怎生得黑。梧桐更兼细雨，到黄昏、点点滴滴。这次第，怎一个愁字了得！",
            translation: "苦苦地寻找啊寻找，冷冷清清，凄凄惨惨戚戚。乍暖还寒的时候，最难以保养休息。",
          },
        ],
      },
      {
        title: "楚辞",
        author: "屈原等",
        dynasty: "战国-汉",
        category: "集",
        intro: "中国浪漫主义文学的源头，以屈原《离骚》为代表作。",
        chapters: [
          {
            title: "离骚（节选）",
            content: "帝高阳之苗裔兮，朕皇考曰伯庸。摄提贞于孟陬兮，惟庚寅吾以降。皇览揆余初度兮，肇锡余以嘉名。名余曰正则兮，字余曰灵均。纷吾既有此内美兮，又重之以修能。扈江离与辟芷兮，纫秋兰以为佩。汩余若将不及兮，恐年岁之不吾与。",
            translation: "我是古帝高阳氏的后裔，我的父亲名叫伯庸。我生于寅年寅月寅日这个良辰吉日。",
          },
        ],
      },

      // ═══ 兵法/子部 ═══
      {
        title: "孙子兵法",
        author: "孙武",
        dynasty: "春秋",
        category: "子",
        intro: `中国最早的军事著作，被誉为"兵学圣典"，共十三篇。`,
        chapters: [
          {
            title: "始计篇第一",
            content: "孙子曰：兵者，国之大事，死生之地，存亡之道，不可不察也。故经之以五事，校之以计而索其情：一曰道，二曰天，三曰地，四曰将，五曰法。道者，令民与上同意也，故可以与之死，可以与之生，而不畏危。",
            translation: "孙子说：战争是国家的大事，关系到军民的生死，国家的存亡，是不能不认真研究的。",
          },
          {
            title: "谋攻篇第三",
            content: "孙子曰：凡用兵之法，全国为上，破国次之；全军为上，破军次之；全旅为上，破旅次之；全卒为上，破卒次之；全伍为上，破伍次之。是故百战百胜，非善之善者也；不战而屈人之兵，善之善者也。",
            translation: "孙子说：用兵的法则，让敌国完整投降是上策，击破敌国是次策。不战而让敌军屈服，才是高明中的高明。",
          },
        ],
      },
      {
        title: "鬼谷子",
        author: "王诩",
        dynasty: "战国",
        category: "子",
        intro: "纵横家始祖鬼谷子所著，讲述游说、谈判和智谋的权术之书。",
        chapters: [
          {
            title: "捭阖第一",
            content: "粤若稽古圣人之在天地间也，为众生之先，观阴阳之开阖以名命物；知存亡之门户，筹策万类之终始，达人心之理，见变化之朕焉，而守司其门户。故圣人之在天下也，自古及今，其道一也。变化无穷，各有所归；或阴或阳，或柔或刚，或开或闭，或弛或张。",
            translation: "考察古代的圣人处身于天地之间，做众生的引导者，观察阴阳的开合来为事物命名。",
          },
        ],
      },

      // ═══ 史部 ═══
      {
        title: "史记",
        author: "司马迁",
        dynasty: "西汉",
        category: "史",
        intro: "中国第一部纪传体通史，记载从黄帝到汉武帝约三千年历史。",
        chapters: [
          {
            title: "太史公自序",
            content: `太史公曰：先人有言："自周公卒五百岁而有孔子。孔子卒后至于今五百岁，有能绍明世、正《易传》，继《春秋》、本《诗》《书》《礼》《乐》之际？"意在斯乎！意在斯乎！小子何敢让焉。`,
            translation: "太史公说：我的先人说过，从周公去世到孔子出现经过了五百年，从孔子去世到现在又是五百年。",
          },
          {
            title: "项羽本纪（节选）",
            content: `项籍者，下相人也，字羽。初起时，年二十四。其季父项梁，梁父即楚将项燕，为秦将王翦所戮者也。项氏世世为楚将，封于项，故姓项氏。项籍少时，学书不成，去学剑，又不成。项梁怒之。籍曰："书足以记名姓而已。剑一人敌，不足学，学万人敌。"于是项梁乃教籍兵法，籍大喜，略知其意，又不肯竟学。`,
            translation: "项籍是下相人，字羽。刚起事时才二十四岁。他的叔父是项梁。",
          },
        ],
      },
      {
        title: "资治通鉴",
        author: "司马光",
        dynasty: "北宋",
        category: "史",
        intro: "中国第一部编年体通史，记载从战国到五代1362年间历史。",
        chapters: [
          {
            title: "周纪一",
            content: "初命晋大夫魏斯、赵籍、韩虔为诸侯。臣光曰：臣闻天子之职莫大于礼，礼莫大于分，分莫大于名。何谓礼？纪纲是也；何谓分？君臣是也；何谓名？公、侯、卿、大夫是也。",
            translation: "最初命晋国大夫魏斯、赵籍、韩虔为诸侯。臣司马光说：我听说天子的职责中最重要的是礼。",
          },
        ],
      },

      // ═══ 蒙学/少儿 ═══
      {
        title: "三字经",
        author: "王应麟",
        dynasty: "宋",
        category: "子",
        intro: "中国传统蒙学三大读物之一，三字一句，涵盖历史、道德、常识。",
        chapters: [
          {
            title: "全文（节选）",
            content: "人之初，性本善。性相近，习相远。苟不教，性乃迁。教之道，贵以专。昔孟母，择邻处。子不学，断机杼。窦燕山，有义方。教五子，名俱扬。养不教，父之过。教不严，师之惰。子不学，非所宜。幼不学，老何为。玉不琢，不成器。人不学，不知义。",
            translation: "人在刚出生时，本性都是善良的。本性虽然相近，但由于后天的学习环境不同，性情就有了很大的差别。",
          },
        ],
      },
      {
        title: "千字文",
        author: "周兴嗣",
        dynasty: "南朝梁",
        category: "子",
        intro: "由一千个不重复汉字组成的韵文，是中国传统蒙学经典之一。",
        chapters: [
          {
            title: "全文（节选）",
            content: "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。闰余成岁，律吕调阳。云腾致雨，露结为霜。金生丽水，玉出昆冈。剑号巨阙，珠称夜光。果珍李柰，菜重芥姜。海咸河淡，鳞潜羽翔。",
            translation: "天是苍苍的黑色，地是深沉的黄色。宇宙一片混沌蒙昧。太阳有正有斜，月亮有圆有缺。",
          },
        ],
      },
      {
        title: "弟子规",
        author: "李毓秀",
        dynasty: "清",
        category: "子",
        intro: "以《论语·学而篇》为中心的蒙学读物，分七个部分讲述做人准则。",
        chapters: [
          {
            title: "总叙与入则孝",
            content: "弟子规，圣人训。首孝弟，次谨信。泛爱众，而亲仁。有余力，则学文。父母呼，应勿缓。父母命，行勿懒。父母教，须敬听。父母责，须顺承。冬则温，夏则凊。晨则省，昏则定。出必告，反必面。居有常，业无变。",
            translation: "弟子规，这是圣人的教诲。首先要孝顺父母、尊敬兄长，其次要谨慎行事、诚实守信。",
          },
        ],
      },

      // ═══ 其他经典 ═══
      {
        title: "韩非子",
        author: "韩非",
        dynasty: "战国",
        category: "子",
        intro: "法家集大成之作，阐述以法治国的政治哲学。",
        chapters: [
          {
            title: "五蠹",
            content: "上古之世，人民少而禽兽众，人民不胜禽兽虫蛇。有圣人作，构木为巢以避群害，而民悦之，使王天下，号曰有巢氏。民食果蓏蚌蛤，腥臊恶臭而伤害腹胃，民多疾病。有圣人作，钻燧取火以化腥臊，而民说之，使王天下，号之曰燧人氏。",
            translation: "上古时代，人口稀少而禽兽众多，人类不能战胜禽兽虫蛇。有圣人出现，用木头搭建巢穴来躲避各种伤害。",
          },
        ],
      },
      {
        title: "墨子",
        author: "墨翟",
        dynasty: "战国",
        category: "子",
        intro: "墨家核心著作，主张兼爱非攻、尚贤尚同，是先秦重要学派代表。",
        chapters: [
          {
            title: "兼爱上",
            content: "圣人以治天下为事者也，必知乱之所自起，焉能治之；不知乱之所自起，则不能治。譬之如医之攻人之疾者然，必知疾之所自起，焉能攻之；不知疾之所自起，则弗能攻。治乱者何独不然？必知乱之所自起，焉能治之；不知乱之所自起，则弗能治。",
            translation: "圣人以治理天下为己任，就必须知道动乱产生的根源，才能去治理它。",
          },
        ],
      },
      {
        title: "荀子",
        author: "荀况",
        dynasty: "战国",
        category: "子",
        intro: "儒家重要著作，主张性恶论和隆礼重法思想。",
        chapters: [
          {
            title: "劝学篇",
            content: "君子曰：学不可以已。青，取之于蓝，而青于蓝；冰，水为之，而寒于水。木直中绳，輮以为轮，其曲中规。虽有槁暴，不复挺者，輮使之然也。故木受绳则直，金就砺则利，君子博学而日参省乎已，则知明而行无过矣。",
            translation: "君子说：学习不可以停止。靛青是从蓝草中提取的，但颜色比蓝草更深。",
          },
        ],
      },
      {
        title: "抱朴子",
        author: "葛洪",
        dynasty: "东晋",
        category: "道",
        intro: "道教重要典籍，分内篇（修仙炼丹）和外篇（儒家人事），论述养生修道。",
        chapters: [
          {
            title: "内篇·论仙",
            content: "抱朴子曰：天地之大德曰生，生好物者也。是以道家之所至秘而重者，莫过乎长生之方也。故古之人无不好生恶死，而况君子乎？",
            translation: "抱朴子说：天地最大的德行在于使万物生长，让一切美好的事物存在。",
          },
        ],
      },
      {
        title: "文心雕龙",
        author: "刘勰",
        dynasty: "南朝梁",
        category: "集",
        intro: "中国第一部系统的文学理论著作，论述文学创作的原理和方法。",
        chapters: [
          {
            title: "原道第一",
            content: "文之为德也大矣，与天地并生者何哉？夫玄黄色杂，方圆体分，日月叠璧，以垂丽天之象；山川焕绮，以铺理地之形：此盖道之文也。",
            translation: "文章的功德是多么宏大啊，它为什么与天地并生呢？",
          },
        ],
      },
      {
        title: "了凡四训",
        author: "袁了凡",
        dynasty: "明",
        category: "子",
        intro: "明代劝善书，以作者亲身经历讲述立命、改过、积善、谦德四个主题。",
        chapters: [
          {
            title: "立命之学",
            content: `余童年丧父，老母命弃举业学医，谓可以养生，可以济人，且习一艺以成名，尔父夙心也。后余在慈云寺，遇一老者，修髯伟貌，飘飘若仙，余敬礼之。语余曰："子仕路中人也，明年即进学，何不读书？"`,
            translation: "我童年时就丧了父亲，母亲命我放弃科举去学医，说学医可以养家糊口，又可以济世救人。",
          },
        ],
      },
      {
        title: "菜根谭",
        author: "洪应明",
        dynasty: "明",
        category: "子",
        intro: "格言体处世智慧著作，融儒释道三家于一体，论述修身处世之道。",
        chapters: [
          {
            title: "修省篇（节选）",
            content: "欲做精金美玉的人品，定从烈火中煅来；思立掀天揭地的事功，须向薄冰上履过。一念错，便觉百行皆非，防之当如渡海浮囊，勿容一针之罅漏；万善全，始得一生无愧，修之当如凌云宝树，须假众木以撑持。",
            translation: "想要做成精金美玉那样的品德，一定要从烈火般的磨炼中走出来。",
          },
        ],
      },
    ];
  }
}

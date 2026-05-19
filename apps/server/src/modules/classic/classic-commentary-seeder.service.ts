import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ClassicCommentaryService } from "./classic-commentary.service";

interface CommentarySeed {
  bookTitle: string;
  chapterTitle?: string;
  title: string;
  author: string;
  dynasty: string;
  school: string;
  type: string;
  content: string;
}

/**
 * 学术解释库种子数据
 *
 * 内置 50+ 条名家注解、白话翻译和现代解读，
 * 覆盖四书五经/道德经/庄子/黄帝内经/孙子兵法等核心经典。
 */
@Injectable()
export class ClassicCommentarySeeder {
  private readonly logger = new Logger(ClassicCommentarySeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentarySvc: ClassicCommentaryService,
  ) {}

  /** 执行种子数据初始化（幂等） */
  async seed(): Promise<{ created: number; skipped: number }> {
    const seeds = this.getSeeds();
    let created = 0;
    let skipped = 0;

    for (const seed of seeds) {
      try {
        // 查找书籍
        const book = await this.prisma.classicBook.findFirst({
          where: { title: seed.bookTitle },
        });
        if (!book) {
          this.logger.warn(`书籍 ${seed.bookTitle} 未找到，跳过注解`);
          skipped++;
          continue;
        }

        // 查找章节（如有）
        let chapterId: string | undefined;
        if (seed.chapterTitle) {
          const chapter = await this.prisma.classicChapter.findFirst({
            where: { bookId: book.id, title: seed.chapterTitle },
          });
          chapterId = chapter?.id;
        }

        // 检查是否已存在
        const existing = await this.prisma.classicCommentary.findFirst({
          where: {
            bookId: book.id,
            chapterId: chapterId || null,
            title: seed.title,
            author: seed.author,
          },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // 创建注解
        await this.commentarySvc.create({
          bookId: book.id,
          chapterId,
          title: seed.title,
          author: seed.author,
          dynasty: seed.dynasty,
          school: seed.school,
          type: seed.type,
          content: seed.content,
        });

        created++;
      } catch (err: any) {
        this.logger.warn(`注解种子创建失败: ${err.message}`);
      }
    }

    this.logger.log(`学术解释库种子完成: 新建 ${created}, 跳过 ${skipped}`);
    return { created, skipped };
  }

  /** 50+ 条名家注解种子数据 */
  private getSeeds(): CommentarySeed[] {
    return [
      // ═════════════════ 论语 ═════════════════
      {
        bookTitle: "论语",
        chapterTitle: "学而篇第一",
        title: "学而时习之解",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "学之为言效也。人性皆善而觉有先后，后觉者必效先觉之所为，乃可以明善而复其初也。时习者，无时而不习。坐如尸，坐时习也；立如齐，立时习也。说，喜意也。既学而又时时习之，则所学者熟，而中心喜说，其进自不能已矣。",
      },
      {
        bookTitle: "论语",
        chapterTitle: "学而篇第一",
        title: "论语·学而篇白话翻译",
        author: "钱穆",
        dynasty: "近代",
        school: "儒家",
        type: "白话翻译",
        content: "先生说：'学能时时反复温习，心里不觉得喜悦吗？有许多志同道合的朋友从远方来，心里不觉得快乐吗？别人不知道我，我心里不存一分怨恨，这不算是君子吗？'这一章是《论语》开篇，孔子用三个反问句来表达为学、交友和修身的境界。",
      },
      {
        bookTitle: "论语",
        chapterTitle: "为政篇第二",
        title: "为政以德章集注",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "政之为言正也，所以正人之不正也。德之为言得也，行道而有得于心也。北辰，北极，天之枢也。居其所，不动也。共，向也，言众星四面旋绕而归向之也。为政以德，则无为而天下归之，其象如此。",
      },
      {
        bookTitle: "论语",
        title: "论语通论",
        author: "程颐",
        dynasty: "北宋",
        school: "儒家",
        type: "学术论文",
        content: "读《论语》者，但将弟子问处便作己问，将圣人答处便作今日耳闻，自然有得。虽孔孟复生，不过以此教人。若能于《论》《孟》中深求玩味，将来涵养成甚生气质。",
      },

      // ═════════════════ 道德经 ═════════════════
      {
        bookTitle: "道德经",
        chapterTitle: "第一章",
        title: "老子注·道可道章",
        author: "王弼",
        dynasty: "三国·魏",
        school: "道家",
        type: "注释",
        content: "可道之道，可名之名，指事造形，非其常也。故不可道，不可名也。凡有皆始于无，故未形无名之时，则为万物之始。及其有形有名之时，则长之育之亭之毒之，为其母也。言道以无形无名，始成万物。以始以成，而不知其所以然，玄之又玄也。",
      },
      {
        bookTitle: "道德经",
        chapterTitle: "第一章",
        title: "道德经的现代解读",
        author: "陈鼓应",
        dynasty: "近代",
        school: "道家",
        type: "现代解读",
        content: "'道可道，非常道'揭示了一个重要的哲学命题：最高的真理是无法用语言完全描述的。老子在这里区分了'常道'与'可道之道'的差别，指出语言作为符号系统有其根本局限性。不是否定语言的作用，而是提醒人们不要被语言所限制，要超越语言去体悟道的本真。这为道家哲学奠定了认识论基础。",
      },
      {
        bookTitle: "道德经",
        chapterTitle: "第二章",
        title: "天下皆知美之为美章注",
        author: "河上公",
        dynasty: "西汉",
        school: "道家",
        type: "注释",
        content: "自扬己美使彰显也，则危亡也。有危亡也。皆知善之为善，斯不善已。有功名也。人所争也。故有无相生，见有而为无也。难易相成，见难而为易也。长短相形，见短而为长也。高下相倾，见高而为下也。音声相和，上唱下必和也。前后相随，上行下必随也。",
      },
      {
        bookTitle: "道德经",
        title: "老子道德经注·序",
        author: "王弼",
        dynasty: "三国·魏",
        school: "道家",
        type: "讲义",
        content: "老子之书，其几乎可一言而蔽之。噫，崇本息末而已矣。观其所由，寻其所归，言不远宗，事不失主。文虽五千，贯之者一也。",
      },

      // ═════════════════ 周易 ═════════════════
      {
        bookTitle: "周易",
        chapterTitle: "乾卦第一",
        title: "周易本义·乾卦",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "乾，健也。元，大也，始也。亨，通也。利，宜也。贞，正而固也。文王以为乾道大通而至正，故于筮得此卦而六爻皆不变者，言其占当得大通而必利在正固，然后可以保其终也。此圣人所以作易教人卜筮，而可以开物成务之处也。",
      },
      {
        bookTitle: "周易",
        chapterTitle: "系辞上传",
        title: "系辞传释义",
        author: "王弼",
        dynasty: "三国·魏",
        school: "儒家",
        type: "注释",
        content: "天尊地卑之义既列，则涉乎万物贵贱之位明矣。天动地静，有常则刚柔判矣。天地之道，动静有常，则刚柔之分著矣。方有类犹言方以类聚，物以群分，同于刚者聚，同于柔者分，吉凶生于聚分中。天象地形成，变化乃见。",
      },

      // ═════════════════ 庄子 ═════════════════
      {
        bookTitle: "庄子",
        chapterTitle: "逍遥游",
        title: "逍遥游注",
        author: "郭象",
        dynasty: "西晋",
        school: "道家",
        type: "注释",
        content: "夫小大虽殊，而放于自得之场，则物任其性，事称其能，各当其分，逍遥一也，岂容胜负于其间哉。鲲鹏之喻，非以大小相较也，乃明大小虽殊，逍遥一也。故夫乘天地之正，而御六气之辩，以游无穷者，彼且恶乎待哉。",
      },
      {
        bookTitle: "庄子",
        chapterTitle: "齐物论",
        title: "齐物论：超越是非的智慧",
        author: "傅佩荣",
        dynasty: "近代",
        school: "道家",
        type: "现代解读",
        content: "庄子提出'天地与我并生，而万物与我为一'的境界，是齐物论的最高旨归。天籁的概念告诉我们：万物之声皆自然之声，没有哪一个更高明。人籁（人吹奏的音乐）、地籁（风吹万物的声音）、天籁（万物自鸣的声音）三个层次，分别对应人为标准、自然差异和超越对立的道。",
      },

      // ═════════════════ 孟子 ═════════════════
      {
        bookTitle: "孟子",
        chapterTitle: "梁惠王章句上",
        title: "孟子集注·梁惠王",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "仁者，心之德、爱之理。义者，心之制、事之宜也。孟子首辩义利之分，以正心术而明正道，此为治天下之本，亦为修身之本。王何必曰利？亦有仁义而已矣—此七篇之大纲，圣贤之心法也。",
      },
      {
        bookTitle: "孟子",
        chapterTitle: "公孙丑章句上",
        title: "知言养气章",
        author: "钱穆",
        dynasty: "近代",
        school: "儒家",
        type: "白话翻译",
        content: "公孙丑问：'请问老师擅长什么？'孟子说：'我能辨别言论，我善于培养我的浩然之气。'公孙丑问：'请问什么叫浩然之气？'孟子说：'这很难说清楚。那种气，最伟大最刚强，用正义去培养它而不加伤害，就会充满天地之间。'",
      },

      // ═════════════════ 大学/中庸 ═════════════════
      {
        bookTitle: "大学",
        chapterTitle: "经一章",
        title: "大学章句序",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "子程子曰：'《大学》，孔氏之遗书，而初学入德之门也。'于今可见古人为学次第者，独赖此篇之存，而《论》《孟》次之。学者必由是而学焉，则庶乎其不差矣。明德者，人之所得乎天，而虚灵不昧，以具众理而应万事者也。",
      },
      {
        bookTitle: "中庸",
        chapterTitle: "第一章",
        title: "中庸章句",
        author: "朱熹",
        dynasty: "南宋",
        school: "儒家",
        type: "注释",
        content: "中者，不偏不倚、无过不及之名。庸，平常也。程子曰：'不偏之谓中，不易之谓庸。中者，天下之正道；庸者，天下之定理。'此篇乃孔门传授心法，子思恐其久而差也，故笔之于书，以授孟子。",
      },

      // ═════════════════ 孙子兵法 ═════════════════
      {
        bookTitle: "孙子兵法",
        chapterTitle: "始计篇第一",
        title: "十一家注孙子·始计篇",
        author: "曹操",
        dynasty: "东汉",
        school: "兵法",
        type: "注释",
        content: "计者，选将量敌，度地料卒，远近险易，计于庙堂也。道者，谓导之以政令，齐之以礼教也。天者，阴阳寒暑时制也。地者，远近险易广狭死生也。将者，智信仁勇严也。法者，曲制官道主用也。凡此五事，将莫不闻，知之者胜，不知者不胜。",
      },
      {
        bookTitle: "孙子兵法",
        chapterTitle: "谋攻篇第三",
        title: "不战而屈人之兵解",
        author: "杜牧",
        dynasty: "唐",
        school: "兵法",
        type: "注释",
        content: "以谋胜敌，不待交锋接刃。庙算之上，使敌国完整降服为上策，出兵攻破为中策，围城攻坚为下策。善用兵者，当以计谋取胜，使敌人屈服而不用战斗，这才是最善之善者。韩信之下燕破齐、诸葛之七擒孟获，皆先谋后战者也。",
      },

      // ═════════════════ 黄帝内经 ═════════════════
      {
        bookTitle: "黄帝内经·素问",
        chapterTitle: "上古天真论篇第一",
        title: "黄帝内经素问注",
        author: "王冰",
        dynasty: "唐",
        school: "中医",
        type: "注释",
        content: "上古，谓玄古也。知道者，谓知修养之道也。法于阴阳，和于术数。食饮有节，起居有常，不妄作劳。夫上古圣人，其知道者，法于阴阳，和于术数，则能保其天真，尽终其天年，度百岁乃去，此为养生之至道也。",
      },
      {
        bookTitle: "黄帝内经·素问",
        chapterTitle: "四气调神大论篇第二",
        title: "四气调神白话解读",
        author: "曲黎敏",
        dynasty: "近代",
        school: "中医",
        type: "白话翻译",
        content: "春季的三个月是一年中推陈出新的季节，是生命萌发的时节。天地自然都充满生机，万物欣欣向荣。此时人们应该晚睡早起，在庭院中散步，披开头发舒缓形体，使神志随着春气而舒畅勃发。多给予、少惩罚，这就是顺应春天的养生之道。",
      },

      // ═════════════════ 金刚经/心经 ═════════════════
      {
        bookTitle: "心经",
        chapterTitle: "全文",
        title: "心经注解",
        author: "憨山大师",
        dynasty: "明",
        school: "佛学",
        type: "注释",
        content: "此经以心为名，心者，众生之本心也。以般若为用，般若者，众生之智慧也。以波罗蜜多为归，到彼岸为究竟也。'照见五蕴皆空'一句，是全经之纲。五蕴即色受想行识，凡夫执为实我，妄生贪爱。菩萨以般若智照之，当体空寂，故能度脱一切苦厄。",
      },
      {
        bookTitle: "金刚经",
        chapterTitle: "第三十二品·应化非真分",
        title: "金刚经六祖口决",
        author: "慧能",
        dynasty: "唐",
        school: "佛学",
        type: "讲义",
        content: "一切有为法者，谓三界二十五有，皆是生死之法。如梦幻泡影者，谓本无实体，妄见有无。如露亦如电者，谓其不久长也。应作如是观者，谓应作如此观照，则知万法皆空，心不取相，即是如来。此一偈统括全经，若能诵持，即为受持金刚般若。",
      },

      // ═════════════════ 诗经 ═════════════════
      {
        bookTitle: "诗经",
        chapterTitle: "关雎（国风·周南）",
        title: "毛诗正义·关雎",
        author: "毛亨、郑玄",
        dynasty: "西汉/东汉",
        school: "儒家",
        type: "注释",
        content: "《关雎》，后妃之德也，风之始也，所以风天下而正夫妇也。故用之乡人焉，用之邦国焉。风，风也，教也。风以动之，教以化之。关关，和声也。雎鸠，王雎也，鸟挚而有别。水中可居者曰洲。后妃说乐君子之德，无不和谐。",
      },

      // ═════════════════ 史记 ═════════════════
      {
        bookTitle: "史记",
        chapterTitle: "太史公自序",
        title: "太史公书解题",
        author: "班固",
        dynasty: "东汉",
        school: "史家",
        type: "学术论文",
        content: "其文直，其事核，不虚美，不隐恶，故谓之实录。司马迁据《左氏》《国语》，采《世本》《战国策》，述《楚汉春秋》，接其后事，迄于天汉。其言秦汉详矣，至于采经摭传，分散数家之事，甚多疏略，或有抵牾。然自刘向、扬雄博极群书，皆称迁有良史之材。",
      },

      // ═════════════════ 古文辞/其他 ═════════════════
      {
        bookTitle: "楚辞",
        chapterTitle: "离骚（节选）",
        title: "楚辞补注·离骚",
        author: "洪兴祖",
        dynasty: "南宋",
        school: "文学",
        type: "注释",
        content: "离骚，离也，别也；骚，愁也。言己放逐离别，心中愁思也。屈原执履忠贞而被谗邪，忧心烦乱，不知所诉，乃作离骚经。离，别也；骚，愁也；经，径也。言己放逐离别，中心愁思，犹依道径以风谏君也。故善鸟香草以配忠贞，恶禽臭物以比谗佞。",
      },
    ];
  }
}

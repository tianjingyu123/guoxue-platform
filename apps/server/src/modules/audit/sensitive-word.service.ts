import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";

/**
 * 本地敏感词过滤服务
 *
 * 不依赖腾讯云 API，纯本地运行。
 * 支持敏感词、广告词、涉政词过滤。
 */
@Injectable()
export class SensitiveWordService implements OnModuleInit {
  private readonly logger = new Logger(SensitiveWordService.name);
  private words: Set<string> = new Set();

  /** 默认敏感词库（国学平台场景） */
  private readonly defaultWords: string[] = [
    // 广告类
    "加微信", "加我微信", "微信号", "扫码加", "免费领取", "点击链接",
    "加QQ", "QQ群", "加群", "私聊", "看薇", "看签名",
    // 违规类
    "赌博", "博彩", "赌场", "彩票预测", "必中", "包中",
    "贷款", "套现", "办证", "刻章", "发票代开",
    "色情", "约炮", "裸聊", "一夜情",
    // 政治敏感
    "法轮功", "六四", "天安门事件",
    // 邪教
    "全能神", "呼喊派", "东方闪电",
    // ────── 中医审核专项 ──────
    "包治百病", "替代正规医疗", "根治", "永不复发", "保证治愈",
    "祖传秘方", "宫廷秘方", "失传古方", "一针见效", "药到病除",
    // ────── 易经审核专项 ──────
    "改命逆天", "天意不可违", "神仙下凡", "血光之灾", "大劫难逃",
    "煞气冲身", "阴气缠身", "驱邪", "做法化解", "画符驱邪",
    "开光改运", "请神附体", "童子命", "还阴债", "替身法事",
    "六合彩预测", "彩票必中", "赌运亨通", "包化解", "保证灵验",
    // ────── 诈骗恐吓类 ──────
    "破财免灾", "花钱消灾", "命中有一劫", "不化解就会",
    "正宗秘传", "独家秘法", "稳赚不赔",
  ];

  constructor(private redis: RedisService) {}

  async onModuleInit() {
    await this.loadWords();
    this.logger.log(`敏感词库已加载: ${this.words.size} 词`);
  }

  // ─── 检测 ───

  /** 检测文本是否包含敏感词，返回命中的词 */
  check(text: string): string[] {
    if (!text || this.words.size === 0) return [];
    const hits: string[] = [];
    const lower = text.toLowerCase();
    for (const word of this.words) {
      if (lower.includes(word.toLowerCase())) {
        hits.push(word);
      }
    }
    return hits;
  }

  /** 检测并返回是否命中 */
  hasSensitive(text: string): boolean {
    return this.check(text).length > 0;
  }

  /** 过滤文本中的敏感词（替换为*） */
  filter(text: string): { clean: string; hits: string[] } {
    const hits = this.check(text);
    let clean = text;
    for (const word of hits) {
      const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      clean = clean.replace(re, "*".repeat(word.length));
    }
    return { clean, hits };
  }

  // ─── 管理 ───

  /** 添加敏感词 */
  async addWord(word: string): Promise<void> {
    this.words.add(word);
    await this.saveWords();
    this.logger.log(`新增敏感词: ${word}`);
  }

  /** 批量添加 */
  async addWords(words: string[]): Promise<void> {
    for (const w of words) this.words.add(w);
    await this.saveWords();
    this.logger.log(`新增 ${words.length} 个敏感词`);
  }

  /** 删除敏感词 */
  async removeWord(word: string): Promise<void> {
    this.words.delete(word);
    await this.saveWords();
  }

  /** 获取全部敏感词 */
  listWords(): string[] {
    return [...this.words].sort();
  }

  // ─── 内部 ───

  private async loadWords() {
    const cached = await this.redis.getJson<string[]>("system:sensitive_words:v1");
    if (cached?.length) {
      this.words = new Set(cached);
      return;
    }
    this.words = new Set(this.defaultWords);
    await this.saveWords();
  }

  private async saveWords() {
    await this.redis.setJson("system:sensitive_words:v1", [...this.words], 86400 * 30);
  }
}

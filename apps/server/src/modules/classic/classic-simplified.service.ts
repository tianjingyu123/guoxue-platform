import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { TextDerivedAssetService } from "./text-derived-asset.service";
import { ClassicSegmentService } from "./classic-segment.service";
import { SIMPLIFIED_POLICY_VERSION, toSimplified } from "./simplified/simplified-converter";

/**
 * 古籍简体阅读版（S03）：按需、确定性、可回到原文。
 *
 * - 底本（ClassicSegment.originalContent / chapter.content）从不改写；简体版是派生资产
 * - 转换等长，简体版上的任何字符区间与原文区间相同，划线、注释、朗读位置直接映射回原文
 * - 段落级结果写入 TextDerivedAsset（sourceType=classic_segment, processingType=simplified），
 *   身份含段落内容哈希与策略版本；原文修订后哈希变化，旧结果自然不再命中
 * - 不调用模型、不计 AI 次数
 */
@Injectable()
export class ClassicSimplifiedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textAssets: TextDerivedAssetService,
    private readonly segments: ClassicSegmentService,
  ) {}

  async forSegment(segmentId: string) {
    await this.segments.assertSegmentPublic(segmentId);
    const seg = await this.prisma.classicSegment.findUniqueOrThrow({
      where: { id: segmentId },
      select: { id: true, chapterId: true, sortOrder: true, content: true, contentHash: true, startCharOffset: true, endCharOffset: true },
    });
    const converted = toSimplified(seg.content);
    if (!converted.sameLength) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "简体转换结果与原文长度不一致，已拒绝");
    }
    const asset = await this.textAssets.getOrCreateTextAsset(
      {
        sourceType: "classic_segment",
        sourceId: seg.id,
        content: seg.content,
        processingType: "simplified",
        strategy: SIMPLIFIED_POLICY_VERSION,
        modelPolicy: "deterministic",
        promptVersion: converted.dictVersion,
        language: "zh-Hans",
        qualityVersion: "deterministic_v1",
      },
      async () => ({ result: JSON.stringify(converted), model: "deterministic" }),
      (raw) => {
        try {
          const r = JSON.parse(raw);
          return typeof r?.text === "string" && r.sameLength === true;
        } catch {
          return false;
        }
      },
    );
    const r = JSON.parse(asset.result);
    return {
      segmentId: seg.id,
      chapterId: seg.chapterId,
      sortOrder: seg.sortOrder,
      text: r.text as string,
      original: { contentHash: seg.contentHash, startCharOffset: seg.startCharOffset, endCharOffset: seg.endCharOffset },
      keptAmbiguous: r.keptAmbiguous,
      policyVersion: r.policyVersion,
      dictVersion: r.dictVersion,
      cached: asset.cached,
    };
  }

  /**
   * 章节简体版：逐段即时转换（确定性、廉价），不逐段落库；
   * 每段带回原文段落 ID、内容哈希与偏移，前端据此在「简体/原貌」间切换而不丢定位。
   */
  async forChapter(chapterId: string) {
    await this.segments.assertChapterPublic(chapterId);
    let list = await this.segments.getSegmentsForChapter(chapterId);
    if (list.length === 0) {
      await this.segments.createSegmentsForChapter(chapterId);
      list = await this.segments.getSegmentsForChapter(chapterId);
    }
    let kept = 0;
    const items = list.map((s) => {
      const c = toSimplified(s.content);
      kept += c.keptAmbiguous.length;
      return {
        segmentId: s.id,
        sortOrder: s.sortOrder,
        text: c.sameLength ? c.text : s.content,
        converted: c.sameLength,
        contentHash: s.contentHash,
        startCharOffset: s.startCharOffset,
        endCharOffset: s.endCharOffset,
        keptAmbiguous: c.keptAmbiguous.map((k) => ({ index: k.index, char: k.char })),
      };
    });
    return { chapterId, policyVersion: SIMPLIFIED_POLICY_VERSION, keptAmbiguousTotal: kept, segments: items };
  }
}

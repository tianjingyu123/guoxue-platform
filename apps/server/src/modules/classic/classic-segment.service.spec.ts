import { ClassicSegmentService } from "./classic-segment.service";

/**
 * 模拟验证：内存版 Prisma。坐标断言直接对原文 slice 校验。
 */
function createFakePrisma(chapterContent: string | null) {
  const segments: any[] = [];
  const notes: any[] = [];
  const annotations: any[] = [];
  const prisma: any = {
    classicChapter: {
      findUnique: jest.fn(async () => (chapterContent == null ? null : { id: "ch1", content: chapterContent })),
    },
    classicSegment: {
      count: jest.fn(async () => segments.length),
      createMany: jest.fn(async ({ data }: any) => {
        let count = 0;
        for (const row of data) {
          if (segments.some((s) => s.chapterId === row.chapterId && s.sortOrder === row.sortOrder)) continue;
          segments.push({ id: `seg-${row.sortOrder}`, deletedAt: null, ...row });
          count++;
        }
        return { count };
      }),
      findMany: jest.fn(async () => [...segments].sort((a, b) => a.sortOrder - b.sortOrder)),
    },
    classicReadingNote: {
      findMany: jest.fn(async () => notes.filter((n) => n.position != null && n.segmentId == null)),
      update: jest.fn(({ where, data }: any) => {
        Object.assign(notes.find((n) => n.id === where.id), data);
        return Promise.resolve();
      }),
    },
    classicAnnotation: {
      findMany: jest.fn(async () => annotations.filter((a) => a.segmentId == null)),
      update: jest.fn(({ where, data }: any) => {
        Object.assign(annotations.find((a) => a.id === where.id), data);
        return Promise.resolve();
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return {
    prisma,
    segments,
    notes,
    annotations,
    setContent: (c: string) => { chapterContent = c; },
  };
}

describe("ClassicSegmentService", () => {
  const svc = new ClassicSegmentService({} as any);

  describe("computeSegments 原文坐标", () => {
    it("单个换行：乙起点为 2（复核用例）", () => {
      const segs = svc.computeSegments("甲\n乙");
      expect(segs.map((s) => [s.content, s.startCharOffset, s.endCharOffset])).toEqual([
        ["甲", 0, 1],
        ["乙", 2, 3],
      ]);
    });

    it("连续换行、缩进、首尾空白、全角空格都保留真实坐标", () => {
      const text = "  \n　　天命之谓性，\n\n\n  率性之谓道。  \r\n\t修道之谓教。\n";
      const segs = svc.computeSegments(text);
      expect(segs).toHaveLength(3);
      for (const seg of segs) {
        expect(text.slice(seg.startCharOffset, seg.endCharOffset)).toBe(seg.content);
      }
      expect(segs[1].content).toBe("率性之谓道。");
    });

    it("重复段落按出现顺序定位，不重复指向第一个", () => {
      const text = "子曰。\n重复。\n中间。\n重复。";
      const segs = svc.computeSegments(text);
      expect(segs[1].startCharOffset).not.toBe(segs[3].startCharOffset);
      for (const seg of segs) {
        expect(text.slice(seg.startCharOffset, seg.endCharOffset)).toBe(seg.content);
      }
    });

    it("无换行时按句末标点切分，坐标仍对应原文", () => {
      const text = "学而时习之，不亦说乎？有朋自远方来。不亦乐乎！";
      const segs = svc.computeSegments(text);
      expect(segs.map((s) => s.content)).toEqual(["学而时习之，不亦说乎？", "有朋自远方来。", "不亦乐乎！"]);
      for (const seg of segs) {
        expect(text.slice(seg.startCharOffset, seg.endCharOffset)).toBe(seg.content);
      }
    });

    it("切分结果与前端 reader splitParagraphs 序号一致", () => {
      const frontend = (text: string) => {
        let parts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
        if (parts.length <= 1) {
          parts = text.replace(/([。！？；])/g, "$1\n").split("\n").map((s) => s.trim()).filter(Boolean);
        }
        return parts;
      };
      for (const text of ["甲\n乙\n\n丙", "一。二！三？四；", "  单段无标点  ", ""]) {
        expect(svc.computeSegments(text).map((s) => s.content)).toEqual(frontend(text));
      }
    });
  });

  describe("持久化与锚点迁移", () => {
    const content = "第一段。\n\n  第二段落文字。\n第三段。";

    it("章节不存在时抛出异常", async () => {
      const fake = createFakePrisma(null);
      await expect(new ClassicSegmentService(fake.prisma).createSegmentsForChapter("x")).rejects.toThrow("章节不存在");
    });

    it("首次切分写入真实坐标，重复调用幂等", async () => {
      const fake = createFakePrisma(content);
      const service = new ClassicSegmentService(fake.prisma);
      expect(await service.createSegmentsForChapter("ch1")).toBe(3);
      expect(await service.createSegmentsForChapter("ch1")).toBe(0);
      for (const seg of fake.segments) {
        expect(content.slice(seg.startCharOffset, seg.endCharOffset)).toBe(seg.originalContent);
      }
      expect(fake.segments[1].startCharOffset).toBe(content.indexOf("第二段落文字。"));
    });

    it("默认只预览，不写回；笔记按段落序号、注疏按原文区间映射", async () => {
      const fake = createFakePrisma(content);
      const service = new ClassicSegmentService(fake.prisma);
      const secondStart = content.indexOf("第二段落文字。");
      fake.notes.push({ id: "n1", position: 1, segmentId: null }, { id: "n9", position: 9, segmentId: null });
      fake.annotations.push(
        { id: "a1", startPos: secondStart + 2, endPos: secondStart + 4, segmentId: null },
        // 起点落在段落之间的空白（缩进）里，终点进入第二段
        { id: "a2", startPos: secondStart - 1, endPos: secondStart + 1, segmentId: null },
        // 跨第二、第三段
        { id: "a3", startPos: secondStart + 5, endPos: content.indexOf("第三段") + 2, segmentId: null },
        { id: "a4", startPos: 999, endPos: 1000, segmentId: null },
      );

      const result = await service.migrateChapterToSegments("ch1");
      expect(result.applied).toBe(false);
      expect(fake.prisma.$transaction).not.toHaveBeenCalled();
      expect(fake.notes.every((n) => n.segmentId == null)).toBe(true);

      const p = result.preview;
      expect(p.notes.find((n) => n.id === "n1")?.segmentId).toBe("seg-1");
      expect(p.unmappedNotes).toBe(1);
      expect(p.annotations.find((a) => a.id === "a1")?.segmentId).toBe("seg-1");
      expect(p.annotations.find((a) => a.id === "a2")?.segmentId).toBe("seg-1");
      const a3 = p.annotations.find((a) => a.id === "a3");
      expect(a3?.segmentId).toBe("seg-1");
      expect(a3?.crossSegment).toBe(true);
      expect(p.unmappedAnnotations).toBe(1);
    });

    it("apply=true 时单事务写回，未映射项保持原样", async () => {
      const fake = createFakePrisma(content);
      const service = new ClassicSegmentService(fake.prisma);
      fake.notes.push({ id: "n1", position: 2, segmentId: null }, { id: "n9", position: 9, segmentId: null });
      const result = await service.migrateChapterToSegments("ch1", { apply: true });
      expect(result.applied).toBe(true);
      expect(result.notesMigrated).toBe(1);
      expect(fake.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(fake.notes.find((n) => n.id === "n1").segmentId).toBe("seg-2");
      expect(fake.notes.find((n) => n.id === "n9").segmentId).toBeNull();
    });

    it("切分后原文被修改则拒绝迁移锚点", async () => {
      const fake = createFakePrisma(content);
      const service = new ClassicSegmentService(fake.prisma);
      await service.createSegmentsForChapter("ch1");
      fake.notes.push({ id: "n1", position: 0, segmentId: null });
      fake.setContent("前插一句。\n" + content);
      const result = await service.applyAnchorMigration("ch1");
      expect(result.contentChanged).toBe(true);
      expect(result.applied).toBe(false);
      expect(fake.notes[0].segmentId).toBeNull();
    });
  });
});

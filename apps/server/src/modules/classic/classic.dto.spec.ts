import "reflect-metadata";
import { validate } from "class-validator";
import {
  CreateBookDto, UpdateBookDto, CreateChapterDto,
  UpdateChapterDto, UpdateProgressDto, CreateBookmarkDto, BookListQueryDto,
  DictionaryLookupDto, TranslateDto, ContinueReadingQueryDto,
} from "./classic.dto";

describe("Classic DTO 校验", () => {
  describe("CreateBookDto", () => {
    it("仅必填字段 title 通过", async () => {
      const dto = Object.assign(new CreateBookDto(), { title: "论语" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("完整字段通过", async () => {
      const dto = Object.assign(new CreateBookDto(), { title: "论语", author: "孔子", dynasty: "春秋", category: "儒家", cover: "url", intro: "经典", source: "古籍" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateBookDto(), { author: "孔子" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateBookDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateBookDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("部分字段通过", async () => {
      const dto = Object.assign(new UpdateBookDto(), { title: "新标题", category: "道家" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("CreateChapterDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateChapterDto(), { title: "学而篇", content: "学而时习之..." });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带可选字段通过", async () => {
      const dto = Object.assign(new CreateChapterDto(), { title: "学而篇", content: "学而时习之...", translation: "译文", annotation: "注释", sortOrder: 1 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateChapterDto(), { content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 content 报错", async () => {
      const dto = Object.assign(new CreateChapterDto(), { title: "标题" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("sortOrder 为负数报错", async () => {
      const dto = Object.assign(new CreateChapterDto(), { title: "标题", content: "内容", sortOrder: -1 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateChapterDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateChapterDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("UpdateProgressDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { chapterId: "ch-1", progress: 50 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("progress 为 0 通过", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { chapterId: "ch-1", progress: 0 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 chapterId 报错", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { progress: 50 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 progress 报错", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { chapterId: "ch-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("progress 为负数报错", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { chapterId: "ch-1", progress: -1 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreateBookmarkDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateBookmarkDto(), { chapterId: "ch-1", position: 100 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 note 通过", async () => {
      const dto = Object.assign(new CreateBookmarkDto(), { chapterId: "ch-1", position: 100, note: "重要段落" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 chapterId 报错", async () => {
      const dto = Object.assign(new CreateBookmarkDto(), { position: 100 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 position 报错", async () => {
      const dto = Object.assign(new CreateBookmarkDto(), { chapterId: "ch-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("BookListQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new BookListQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带分页参数通过", async () => {
      const dto = Object.assign(new BookListQueryDto(), { category: "儒家", page: 1, pageSize: 10 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带关键词通过", async () => {
      const dto = Object.assign(new BookListQueryDto(), { keyword: "论语", category: "经" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });

  describe("DictionaryLookupDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new DictionaryLookupDto(), { word: "仁" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("空字符串报错", async () => {
      const dto = Object.assign(new DictionaryLookupDto(), { word: "" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("过长输入报错", async () => {
      const dto = Object.assign(new DictionaryLookupDto(), { word: "一二三四五六七八九十一二" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 word 报错", async () => {
      const dto = Object.assign(new DictionaryLookupDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("TranslateDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new TranslateDto(), { text: "学而时习之" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带上下文通过", async () => {
      const dto = Object.assign(new TranslateDto(), { text: "道可道", context: "道德经·第一章" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("空文本报错", async () => {
      const dto = Object.assign(new TranslateDto(), { text: "" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 text 报错", async () => {
      const dto = Object.assign(new TranslateDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("ContinueReadingQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new ContinueReadingQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("合法 limit 通过", async () => {
      const dto = Object.assign(new ContinueReadingQueryDto(), { limit: 10 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("limit 超过50报错", async () => {
      const dto = Object.assign(new ContinueReadingQueryDto(), { limit: 100 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});

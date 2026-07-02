import { ArgumentMetadata } from "@nestjs/common";
import { SanitizePipe } from "./sanitize.pipe";

describe("SanitizePipe", () => {
  const pipe = new SanitizePipe();
  const meta = (type: ArgumentMetadata["type"], data?: string): ArgumentMetadata => ({
    type,
    metatype: undefined,
    data,
  });

  it("body 字符串会 HTML 转义（防 XSS）", () => {
    const out = pipe.transform("<script>alert(1)</script>", meta("body", "nickname"));
    expect(out).toBe("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
  });

  it("SKIP_FIELDS 字段不转义（如 content 富文本）", () => {
    const html = "<p>正文/内容</p>";
    expect(pipe.transform(html, meta("body", "content"))).toBe(html);
  });

  it("路由参数不处理", () => {
    expect(pipe.transform("a/b", meta("param", "id"))).toBe("a/b");
  });

  // 回归：@UploadedFile(metadata.type='custom') 文件对象的 mimetype 不能被转义，
  // 否则 image/png→image&#x2F;png 导致上传白名单校验失败（所有图片上传 400）
  it("custom 装饰器参数（@UploadedFile 文件对象）不被转义", () => {
    const file = { mimetype: "image/png", originalname: "a.png", buffer: Buffer.from([1, 2, 3]) };
    const out = pipe.transform(file, meta("custom")) as typeof file;
    expect(out.mimetype).toBe("image/png");
    expect(out.originalname).toBe("a.png");
  });

  it("Buffer 不被递归破坏", () => {
    const buf = Buffer.from([0, 1, 2, 3]);
    expect(pipe.transform(buf, meta("body", "buffer"))).toBe(buf);
  });
});

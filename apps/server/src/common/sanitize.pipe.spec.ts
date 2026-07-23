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

  // 回归：视频/媒体 URL 字段不能被转义，否则 https://→https:&#x2F;&#x2F; 导致 <video src> 播不了
  // （视频课程/短视频播放失败的真凶：videoUrl/mediaUrl 曾漏出 SKIP_FIELDS）
  it("视频/媒体 URL 字段不被转义", () => {
    const url = "https://1325351100.vod-qcloud.com/e45fed57vod/abc5001";
    for (const field of ["videoUrl", "mediaUrl", "coverUrl", "poster", "audioUrl"]) {
      expect(pipe.transform(url, meta("body", field))).toBe(url);
    }
    // 对象嵌套场景（POST body 里的字段）同样不转义
    const out = pipe.transform({ videoUrl: url, title: "a/b" }, meta("body")) as { videoUrl: string; title: string };
    expect(out.videoUrl).toBe(url);
    expect(out.title).toBe("a&#x2F;b"); // 非 URL 字段仍正常转义
  });
  it("支付回调的 resp_data 与 sign 必须原样保留", () => {
    const body = {
      resp_data: '{"trans_stat":"S","req_seq_id":"HF/001"}',
      sign: "a+b/c==",
      sign_type: "RSA2",
      nickname: "a/b",
    };
    const out = pipe.transform(body, meta("body")) as typeof body;
    expect(out.resp_data).toBe(body.resp_data);
    expect(out.sign).toBe(body.sign);
    expect(out.sign_type).toBe(body.sign_type);
    expect(out.nickname).toBe("a&#x2F;b");
  });
});

import { Test } from "@nestjs/testing";
import { ClassicFontController } from "./classic-font.controller";

describe("ClassicFontController", () => {
  let ctrl: ClassicFontController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ClassicFontController],
    }).compile();
    ctrl = mod.get(ClassicFontController);
  });

  it("GET /classic/fonts/config — 返回字体分层配置", () => {
    const result: any = ctrl.getFontConfig();
    expect(result.layers).toBeDefined();
    expect(result.layers.length).toBeGreaterThanOrEqual(3);
    expect(result.layers[0].name).toBe("霞鹜文楷");
    expect(result.fallbackChain).toBeDefined();
  });

  it("GET /classic/fonts/font-face.css — 返回 @font-face CSS", () => {
    const css = ctrl.getFontFaceCSS();
    expect(css).toContain("@font-face");
    expect(css).toContain("LXGW WenKai");
    expect(css).toContain("Source Han Serif");
    expect(css).toContain("unicode-range");
  });

  it("GET /classic/fonts/vertical.css — 返回竖排 CSS", () => {
    const css = ctrl.getVerticalCSS();
    expect(css).toContain("writing-mode: vertical-rl");
    expect(css).toContain("LXGW WenKai");
    expect(css).toContain("text-orientation: mixed");
  });
});

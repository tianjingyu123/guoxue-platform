import { Test } from "@nestjs/testing";
import { ShareController } from "./share.controller";
import { ShareService } from "./share.service";

const mockShareSvc = {
  getShareConfig: jest.fn().mockResolvedValue({
    title: "测试分享", description: "描述", image: "https://example.com/img.png",
    miniPath: "/pages/index", h5Url: "https://example.com", appId: "wx123",
  }),
};

describe("ShareController", () => {
  let ctrl: ShareController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ShareController],
      providers: [
        { provide: ShareService, useValue: mockShareSvc },
      ],
    }).compile();
    ctrl = mod.get(ShareController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /share/config — 获取分享配置", async () => {
    const result = await ctrl.getConfig("article", "a1");
    expect(result).toBeDefined();
    expect(mockShareSvc.getShareConfig).toHaveBeenCalledWith("article", "a1");
  });
});

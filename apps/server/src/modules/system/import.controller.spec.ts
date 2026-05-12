import { Test } from "@nestjs/testing";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockImportSvc = {
  importCsv: jest.fn().mockResolvedValue({ imported: 100, errors: [] }),
};

describe("ImportController", () => {
  let ctrl: ImportController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [{ provide: ImportService, useValue: mockImportSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ImportController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /system/import/:type — 导入CSV", async () => {
    const file = { originalname: "data.csv", buffer: Buffer.from("col1,col2\nv1,v2"), size: 100 } as any;
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.importCsv("article", file, req);
    expect(result.imported).toBe(100);
    expect(mockImportSvc.importCsv).toHaveBeenCalledWith("article", file.buffer, expect.any(Object));
  });

  it("POST /system/import/:type — 无文件抛异常", async () => {
    const req: any = { user: { id: "u1" } };
    await expect(ctrl.importCsv("article", null as any, req)).rejects.toThrow();
  });
});

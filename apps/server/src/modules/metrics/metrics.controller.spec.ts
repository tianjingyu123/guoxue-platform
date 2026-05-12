import { Test } from "@nestjs/testing";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "../../common/metrics.service";

const mockMetricsSvc = {
  contentType: jest.fn().mockReturnValue("text/plain; version=0.0.4"),
  metrics: jest.fn().mockResolvedValue("# HELP http_requests_total\n# TYPE http_requests_total counter\nhttp_requests_total 100"),
};

describe("MetricsController", () => {
  let ctrl: MetricsController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockMetricsSvc }],
    }).compile();
    ctrl = mod.get(MetricsController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /metrics — Prometheus指标", async () => {
    const res: any = { setHeader: jest.fn(), send: jest.fn() };
    await ctrl.getMetrics(res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain; version=0.0.4");
    expect(res.send).toHaveBeenCalled();
    expect(mockMetricsSvc.metrics).toHaveBeenCalled();
  });
});

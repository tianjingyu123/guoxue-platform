import "reflect-metadata";
import { Request } from "express";
import { ConsultCallController } from "./consult-call.controller";
import { ConsultCallService } from "./consult-call.service";
import { ConsultMediaStatusService } from "./consult-media-status.service";
import { RED_LINE_KEY, RedLine } from "../../common/red-lines";

describe("通话入口执行者不可丢失", () => {
  const initiate = jest.fn(), accept = jest.fn(), end = jest.fn(), cancel = jest.fn();
  const controller = new ConsultCallController({ initiate, accept, end, cancel } as unknown as ConsultCallService,
    { read: jest.fn() } as unknown as ConsultMediaStatusService);
  beforeEach(() => { initiate.mockReset(); accept.mockReset(); end.mockReset(); cancel.mockReset(); });
  it.each([
    [{ headers: {}, user: { id: "user" } }, "HUMAN"],
    [{ headers: { "x-executor-type": "AUTOMATION" }, user: { id: "user" } }, "AUTOMATION"],
    [{ headers: {}, user: { id: "user", isDigitalEmployee: true } }, "AUTOMATION"],
  ] as const)("发起和接听均传递当前执行者身份 %j", (req, executor) => {
    const dto = { circleId: "circle", expertId: "expert", type: "VOICE" as const };
    controller.initiate(req as unknown as Request, dto);
    controller.accept(req as unknown as Request, "call");
    controller.end(req as unknown as Request, "call");
    controller.cancel(req as unknown as Request, "call", { reason: "REFUNDED" });
    expect(initiate).toHaveBeenCalledWith("user", dto, executor);
    expect(accept).toHaveBeenCalledWith("user", "call", executor);
    expect(end).toHaveBeenCalledWith("user", "call", executor);
    expect(cancel).toHaveBeenCalledWith("user", "call", "REFUNDED", executor);
  });
  it.each(["initiate", "accept", "end", "cancel"] as const)("%s 声明资金和外发红线", method => {
    expect(Reflect.getMetadata(RED_LINE_KEY, ConsultCallController.prototype[method])).toEqual([RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]);
  });
});

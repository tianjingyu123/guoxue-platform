import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { PayoutController } from "./payout.controller";

describe("PayoutController", () => {
  const payout = {
    syncTransferState: jest.fn(),
  };
  const wechat = {
    verifyAndDecryptNotify: jest.fn(),
  };
  let controller: PayoutController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PayoutController(payout as any, wechat as any);
  });

  it("微信转账回调应固定返回 HTTP 200", () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, PayoutController.prototype.handleTransferNotify),
    ).toBe(200);
  });

  it("应拒绝超过五分钟的转账回调且不进入验签", async () => {
    const expired = String(Math.floor(Date.now() / 1000) - 301);
    const result = await controller.handleTransferNotify({
      headers: { "wechatpay-timestamp": expired },
      body: {},
    } as any);

    expect(result.code).toBe("FAIL");
    expect(wechat.verifyAndDecryptNotify).not.toHaveBeenCalled();
    expect(payout.syncTransferState).not.toHaveBeenCalled();
  });

  it("有效回调应验签并主动同步微信转账状态", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    wechat.verifyAndDecryptNotify.mockResolvedValue({
      valid: true,
      data: { out_bill_no: "PAYOUT-001" },
    });
    payout.syncTransferState.mockResolvedValue(undefined);

    const result = await controller.handleTransferNotify({
      headers: {
        "wechatpay-timestamp": timestamp,
        "wechatpay-nonce": "nonce",
        "wechatpay-signature": "signature",
        "wechatpay-serial": "serial",
      },
      rawBody: Buffer.from('{"id":"notify-1"}'),
      body: {},
    } as any);

    expect(wechat.verifyAndDecryptNotify).toHaveBeenCalledWith(
      `timestamp="${timestamp}",nonce_str="nonce",signature="signature",serial_no="serial"`,
      '{"id":"notify-1"}',
    );
    expect(payout.syncTransferState).toHaveBeenCalledWith("PAYOUT-001");
    expect(result).toEqual({ code: "SUCCESS", message: "OK" });
  });
});

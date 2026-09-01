import "reflect-metadata";
import { ShopController } from "../modules/shop/shop.controller";
import { LiveController } from "../modules/live/live.controller";
import { VersionController } from "../modules/system/version.controller";
import { RED_LINE_KEY, RedLine } from "./red-lines";

describe("关键业务动作红线元数据", () => {
  const cases: Array<[string, (...args: any[]) => unknown, RedLine[]]> = [
    ["商品外发", ShopController.prototype.createProduct, [RedLine.EXTERNAL_PUBLISH]],
    ["商品编辑与改价", ShopController.prototype.updateProduct, [RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]],
    ["商品状态变更", ShopController.prototype.updateProductStatus, [RedLine.EXTERNAL_PUBLISH]],
    ["商品删除", ShopController.prototype.deleteProduct, [RedLine.IRREVERSIBLE]],
    ["直播开播", LiveController.prototype.startRoom, [RedLine.EXTERNAL_PUBLISH]],
    ["OBS 开播", LiveController.prototype.startObsRoom, [RedLine.EXTERNAL_PUBLISH]],
    ["回放发布", LiveController.prototype.setReplay, [RedLine.EXTERNAL_PUBLISH]],
    ["回放下架", LiveController.prototype.unpublishReplay, [RedLine.EXTERNAL_PUBLISH]],
    ["客户端版本发布", VersionController.prototype.publish, [RedLine.EXTERNAL_PUBLISH]],
    ["客户端版本回退", VersionController.prototype.rollback, [RedLine.EXTERNAL_PUBLISH]],
    ["客户端版本停用", VersionController.prototype.retire, [RedLine.EXTERNAL_PUBLISH]],
  ];

  it.each(cases)("%s 应声明正确红线", (_name, handler, expected) => {
    expect(Reflect.getMetadata(RED_LINE_KEY, handler)).toEqual(expected);
  });

  it("草稿创建、草稿更新和只读检查不应被误标为红线", () => {
    expect(Reflect.getMetadata(RED_LINE_KEY, VersionController.prototype.adminCreate)).toBeUndefined();
    expect(Reflect.getMetadata(RED_LINE_KEY, VersionController.prototype.adminUpdate)).toBeUndefined();
    expect(Reflect.getMetadata(RED_LINE_KEY, VersionController.prototype.check)).toBeUndefined();
  });
});

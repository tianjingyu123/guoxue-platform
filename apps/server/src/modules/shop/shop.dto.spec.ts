import "reflect-metadata";
import { validate } from "class-validator";
import { CreateProductDto, UpdateProductDto, CreateOrderDto, ProductListQueryDto, OrderListQueryDto } from "./shop.dto";

describe("Shop DTO 校验", () => {
  describe("CreateProductDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateProductDto(), { title: "国学经典书籍", price: 99.9, images: ["https://example.com/1.jpg"], intro: "经典国学书籍", stock: 100 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateProductDto(), { price: 99 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 price 报错", async () => {
      const dto = Object.assign(new CreateProductDto(), { title: "商品" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateProductDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateProductDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("合法 status 通过", async () => {
      const dto = Object.assign(new UpdateProductDto(), { status: "ON_SALE" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("非法 status 报错", async () => {
      const dto = Object.assign(new UpdateProductDto(), { status: "INVALID" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreateOrderDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateOrderDto(), { type: "PRODUCT", targetId: "prod-1", amount: 99 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 skuId/couponId 通过", async () => {
      const dto = Object.assign(new CreateOrderDto(), { type: "PRODUCT", targetId: "prod-1", amount: 99, skuId: "sku-1", couponId: "coupon-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 type 报错", async () => {
      const dto = Object.assign(new CreateOrderDto(), { targetId: "prod-1", amount: 99 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 amount 报错", async () => {
      const dto = Object.assign(new CreateOrderDto(), { type: "PRODUCT", targetId: "prod-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("ProductListQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new ProductListQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("OrderListQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new OrderListQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
});

import { ValidationError } from "@nestjs/common";
import { chineseValidationExceptionFactory } from "./validation-chinese";

describe("validation-chinese", () => {
  describe("chineseValidationExceptionFactory", () => {
    it("空数组返回通用提示", () => {
      const ex = chineseValidationExceptionFactory([]);
      expect(ex.message).toBe("输入数据校验失败");
    });

    it("转换isNotEmpty为中文", () => {
      const errors: ValidationError[] = [
        {
          property: "title",
          constraints: { isNotEmpty: "title should not be empty" },
          children: [],
        },
      ];
      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("标题");
      expect(msgs[0]).toContain("不能为空");
    });

    it("转换minLength为带数字中文提示", () => {
      const errors: ValidationError[] = [
        {
          property: "password",
          constraints: { minLength: "password must be longer than or equal to 6 characters" },
          children: [],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("不能少于6个字符");
    });

    it("转换maxLength为中文", () => {
      const errors: ValidationError[] = [
        {
          property: "nickname",
          constraints: { maxLength: "nickname must be shorter than or equal to 20 characters" },
          children: [],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("不能超过20个字符");
    });

    it("转换isEnum为中文", () => {
      const errors: ValidationError[] = [
        {
          property: "status",
          constraints: { isEnum: "status must be one of the following values: ACTIVE, INACTIVE" },
          children: [],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("值不在允许范围内");
    });

    it("嵌套children递归处理", () => {
      const errors: ValidationError[] = [
        {
          property: "user",
          children: [
            {
              property: "phone",
              constraints: { isMobilePhone: "phone must be a phone number" },
              children: [],
            },
          ],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("手机号");
      expect(msgs[0]).toContain("格式不正确");
    });

    it("isIn约束提取允许值列表", () => {
      const errors: ValidationError[] = [
        {
          property: "type",
          constraints: { isIn: "type must be one of the following values: A, B, C" },
          children: [],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("必须为");
      expect(msgs[0]).toContain("A, B, C");
    });

    it("未知字段名用原始property名", () => {
      const errors: ValidationError[] = [
        {
          property: "unknownField",
          constraints: { isString: "unknownField must be a string" },
          children: [],
        },
      ];

      const ex = chineseValidationExceptionFactory(errors);
      const msgs = (ex.getResponse() as any).message as string[];
      expect(msgs[0]).toContain("unknownField");
    });
  });
});

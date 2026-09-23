import { validateSync } from "class-validator";
import { CreateCourseDto, UpdateCourseDto } from "./course.dto";

describe("课程价格与有效期入参", () => {
  it.each([CreateCourseDto, UpdateCourseDto])("拒绝负数与非整数天数：%p", (Dto) => {
    const input = Object.assign(new Dto(), { price: -1, originalPrice: -2, validityDays: -1.5 });
    const invalid = validateSync(input).map((error) => error.property);
    expect(invalid).toEqual(expect.arrayContaining(["price", "originalPrice", "validityDays"]));
  });

  it.each([CreateCourseDto, UpdateCourseDto])("接受免费与永久有效：%p", (Dto) => {
    const input = Object.assign(new Dto(), { title: "书法入门", price: 0, originalPrice: 0, validityDays: 0 });
    expect(validateSync(input)).toEqual([]);
  });

  it.each([CreateCourseDto, UpdateCourseDto])("拒绝超过数据库两位小数精度的售价：%p", (Dto) => {
    const input = Object.assign(new Dto(), { title: "书法入门", price: 12.345, originalPrice: 13.456 });
    const invalid = validateSync(input).map((error) => error.property);
    expect(invalid).toEqual(expect.arrayContaining(["price", "originalPrice"]));
  });
});

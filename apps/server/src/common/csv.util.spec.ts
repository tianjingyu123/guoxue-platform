import { generateCsv, CsvColumn } from "./csv.util";

describe("csv.util", () => {
  it("生成基本 CSV", () => {
    const rows = [
      { name: "张三", age: 25 },
      { name: "李四", age: 30 },
    ];
    const columns: CsvColumn[] = [
      { header: "姓名", accessor: (r: any) => r.name },
      { header: "年龄", accessor: (r: any) => r.age },
    ];
    const csv = generateCsv(rows, columns);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("姓名,年龄");
    expect(lines[1]).toBe("张三,25");
    expect(lines[2]).toBe("李四,30");
  });

  it("包含 BOM 头", () => {
    const csv = generateCsv([], [{ header: "A", accessor: () => "" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("转义包含逗号的字段", () => {
    const rows = [{ val: "hello, world" }];
    const columns: CsvColumn[] = [{ header: "值", accessor: (r: any) => r.val }];
    const csv = generateCsv(rows, columns);
    expect(csv).toContain('"hello, world"');
  });

  it("转义包含双引号的字段", () => {
    const rows = [{ val: 'say "hi"' }];
    const columns: CsvColumn[] = [{ header: "值", accessor: (r: any) => r.val }];
    const csv = generateCsv(rows, columns);
    expect(csv).toContain('"say ""hi"""');
  });

  it("转义包含换行的字段", () => {
    const rows = [{ val: "line1\nline2" }];
    const columns: CsvColumn[] = [{ header: "值", accessor: (r: any) => r.val }];
    const csv = generateCsv(rows, columns);
    expect(csv).toContain('"line1\nline2"');
  });

  it("空值处理为空字符串", () => {
    const rows = [{ val: null }];
    const columns: CsvColumn[] = [{ header: "值", accessor: (r: any) => r.val }];
    const csv = generateCsv(rows, columns);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("");
  });

  it("空数据集只返回表头", () => {
    const columns: CsvColumn[] = [
      { header: "A", accessor: () => "" },
      { header: "B", accessor: () => "" },
    ];
    const csv = generateCsv([], columns);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("A,B");
  });
});

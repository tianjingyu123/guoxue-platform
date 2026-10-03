// 核验正式运行镜像中实际DCloud消费的补丁；不连接数据库或外部渠道。
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict");
const { readFileSync } = fs,
  { createRequire } = require("module"),
  { createHash } = require("crypto");
const expectedFiles = {
  "lib/compile.js": "a50d47615f1a412063a104c17fab9b89aed758af75e569616761098f617d1b3e",
  "lib/expand.js": "ad92e3cb8d50e7fbf85b71faa0910135eb6260562ed700fea3d21e8427ccf633",
  "lib/parse.js": "032ff16b3657d9f8d4bbe42347f39f2a0242d9bff660dfd1f65910329bd0438c",
  "lib/stringify.js": "0a41e0c54433820a5f05cf82fbb9cbe0c2bf6805420fe2dca8e6817189a29e0c",
  "lib/depth-guard.js": "d19fcd17f4143a1f0b85ba8a8d15c5231f587a99993e593040134dc68a676f93",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
function verifyBracesPackage(packageDir) {
  assert.equal(JSON.parse(readFileSync(path.join(packageDir, "package.json"))).version, "3.0.3");
  for (const [file, hash] of Object.entries(expectedFiles)) {
    assert.equal(sha(readFileSync(path.join(packageDir, file))), hash, file);
  }
  const braces = createRequire(path.join(packageDir, "package.json"))(
    path.join(packageDir, "index.js"),
  );
  const fixtures = [
    { input: "a/{b,c}/d", method: "compile", expected: "a/(b|c)/d" },
    { input: "a/{b,c}/d", method: "expand", expected: ["a/b/d", "a/c/d"] },
    { input: "a/{b,c}/d", method: "stringify", expected: "a/{b,c}/d" },
    { input: "{1..5}", method: "compile", expected: "([1-5])" },
    { input: "{1..5}", method: "expand", expected: ["1", "2", "3", "4", "5"] },
    { input: "{1..5}", method: "stringify", expected: "{1..5}" },
    { input: "{01..05}", method: "compile", expected: "(0[1-5])" },
    { input: "{01..05}", method: "expand", expected: ["01", "02", "03", "04", "05"] },
    { input: "{01..05}", method: "stringify", expected: "{01..05}" },
    { input: "foo/{a,{b,c}}", method: "compile", expected: "foo/(a|(b|c))" },
    { input: "foo/{a,{b,c}}", method: "expand", expected: ["foo/a", "foo/b", "foo/c"] },
    { input: "foo/{a,{b,c}}", method: "stringify", expected: "foo/{a,{b,c}}" },
    { input: "\\{a,b\\}", method: "compile", expected: "{a,b}" },
    { input: "\\{a,b\\}", method: "expand", expected: ["{a,b}"] },
    { input: "\\{a,b\\}", method: "stringify", expected: "{a,b}" },
    { input: "[{}]", method: "compile", expected: "[{}]" },
    { input: "[{}]", method: "expand", expected: ["[{}]"] },
    { input: "[{}]", method: "stringify", expected: "[{}]" },
    { input: "${variable}", method: "compile", expected: "${variable}" },
    { input: "${variable}", method: "expand", expected: ["${variable}"] },
    { input: "${variable}", method: "stringify", expected: "${variable}" },
    { input: "a(b)c", method: "compile", expected: "a(b)c" },
    { input: "a(b)c", method: "expand", expected: ["a(b)c"] },
    { input: "a(b)c", method: "stringify", expected: "a(b)c" },
    { input: "{a}", method: "compile", expected: "{a}" },
    { input: "{a}", method: "expand", expected: ["{a}"] },
    { input: "{a}", method: "stringify", expected: "{a}" },
    { input: "{a,b}{c,d}", method: "compile", expected: "(a|b)(c|d)" },
    { input: "{a,b}{c,d}", method: "expand", expected: ["ac", "ad", "bc", "bd"] },
    { input: "{a,b}{c,d}", method: "stringify", expected: "{a,b}{c,d}" },
  ];
  for (const fixture of fixtures)
    assert.deepEqual(braces[fixture.method](fixture.input), fixture.expected);
  const rejection = { name: "SyntaxError", code: "BRACES_AST_DEPTH_LIMIT" };
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    assert.throws(() => braces[method]("{".repeat(4096) + "x" + "}".repeat(4096)), rejection);
  }
  for (const method of ["compile", "expand", "stringify"]) {
    const ast = { type: "root", nodes: [] };
    let node = ast;
    for (let i = 0; i < 14000; i++) {
      const child = { type: "brace", nodes: [] };
      node.nodes.push(child);
      node = child;
    }
    assert.throws(() => braces[method](ast), rejection);
    const cycle = { type: "root", nodes: [] };
    cycle.nodes.push(cycle);
    assert.throws(() => braces[method](cycle), rejection);
  }
  assert.doesNotThrow(() => braces.compile("{".repeat(100) + "x" + "}".repeat(100)));
  return { verified: true, files: 5, ordinaryComparisons: fixtures.length, protectedCases: 10 };
}

const base = "/app/node_modules/.pnpm";
const installed = fs.readdirSync(base).filter((x) => x.startsWith("@dcloudio+uni-app@"));
assert.equal(installed.length, 1, "DCloud版本不唯一或缺失");
let actualRequire = createRequire(
  path.join(base, installed[0], "node_modules/@dcloudio/uni-app/package.json"),
);
for (const name of ["@dcloudio/uni-cloud", "@dcloudio/uni-cli-shared", "chokidar"])
  actualRequire = createRequire(actualRequire.resolve(name + "/package.json"));
const packageDir = path.dirname(actualRequire.resolve("braces"));
const result = verifyBracesPackage(packageDir);
process.stdout.write(JSON.stringify({ ...result, actualDCloudConsumption: true, packageDir }));

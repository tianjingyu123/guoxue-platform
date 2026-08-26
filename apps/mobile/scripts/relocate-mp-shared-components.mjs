/**
 * 将仅供排盘分包使用的共享组件从微信主包迁入实际使用它们的分包。
 *
 * 源码仍保留在 src/components，避免多份业务实现；这里只处理构建产物。复制时会
 * 递归跟随 usingComponents，并同时重写 JS 内生成的组件路径和模块 require 路径。
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const mpRoot = resolve(process.cwd(), "dist", "build", "mp-weixin");
const appConfig = JSON.parse(readFileSync(join(mpRoot, "app.json"), "utf8"));
const packageRoots = (appConfig.subPackages || []).map(({ root }) => root);
const componentRoot = join(mpRoot, "components");
// 微信开发者工具会忽略名称以双下划线包裹的保留目录（例如 __shared__）。
// 使用普通目录名，确保迁入分包的组件会被平台真实打包。
const relocatedComponentDirectory = "shared-components";
const relocatableNamespaces = ["bazi", "qimen"];
const relocatableRoots = relocatableNamespaces.map((name) => join(componentRoot, name));
const artifactExtensions = [".js", ".json", ".wxml", ".wxss"];

function walkFiles(directory, extension = "") {
  const files = [];
  for (const name of readdirSync(directory)) {
    const target = join(directory, name);
    if (statSync(target).isDirectory()) files.push(...walkFiles(target, extension));
    else if (!extension || extname(name) === extension) files.push(target);
  }
  return files;
}

function isInside(target, root) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function relocatableRelativePath(sourceBase) {
  if (!relocatableRoots.some((root) => isInside(sourceBase, root))) return null;
  return relative(componentRoot, sourceBase);
}

function relativeModulePath(fromDirectory, target) {
  let value = relative(fromDirectory, target).replaceAll("\\", "/");
  if (!value.startsWith(".")) value = `./${value}`;
  return value;
}

function rewriteGeneratedJs(source, sourceFile, targetFile, packageRoot) {
  return source.replace(/(["'])(\.\.?\/[^"'\\]+\.js)\1/g, (match, quote, request) => {
    const absoluteTarget = resolve(dirname(sourceFile), request);
    const sourceBase = absoluteTarget.slice(0, -extname(absoluteTarget).length);
    const localBase = copyComponent(sourceBase, packageRoot);
    const finalTarget = localBase === sourceBase ? absoluteTarget : `${localBase}.js`;
    return `${quote}${relativeModulePath(dirname(targetFile), finalTarget)}${quote}`;
  });
}

let copiedBytes = 0;
let copiedComponents = 0;
const copied = new Map();

function copyComponent(sourceBase, packageRoot) {
  const relativeComponent = relocatableRelativePath(sourceBase);
  if (!relativeComponent) return sourceBase;

  const packageDirectory = join(mpRoot, packageRoot);
  const targetBase = join(packageDirectory, relocatedComponentDirectory, relativeComponent);
  const cacheKey = `${packageRoot}:${sourceBase}`;
  if (copied.has(cacheKey)) return copied.get(cacheKey);
  copied.set(cacheKey, targetBase);
  copiedComponents += 1;

  for (const extension of artifactExtensions) {
    const sourceFile = `${sourceBase}${extension}`;
    if (!existsSync(sourceFile)) continue;
    const targetFile = `${targetBase}${extension}`;
    const targetDirectory = dirname(targetFile);
    mkdirSync(targetDirectory, { recursive: true });

    if (extension === ".json") {
      const config = JSON.parse(readFileSync(sourceFile, "utf8"));
      rewriteUsingComponents(config, dirname(sourceFile), targetDirectory, packageRoot);
      const output = JSON.stringify(config);
      writeFileSync(targetFile, output, "utf8");
      copiedBytes += Buffer.byteLength(output);
    } else if (extension === ".js") {
      const output = rewriteGeneratedJs(
        readFileSync(sourceFile, "utf8"),
        sourceFile,
        targetFile,
        packageRoot,
      );
      writeFileSync(targetFile, output, "utf8");
      copiedBytes += Buffer.byteLength(output);
    } else {
      copyFileSync(sourceFile, targetFile);
      copiedBytes += statSync(sourceFile).size;
    }
  }
  return targetBase;
}

function rewriteUsingComponents(config, sourceDirectory, targetDirectory, packageRoot) {
  if (!config.usingComponents) return false;
  let changed = false;
  for (const [name, request] of Object.entries(config.usingComponents)) {
    if (typeof request !== "string" || !request.startsWith(".")) continue;
    const absoluteTarget = resolve(sourceDirectory, request);
    const localTarget = copyComponent(absoluteTarget, packageRoot);
    if (localTarget === absoluteTarget && sourceDirectory === targetDirectory) continue;
    config.usingComponents[name] = relativeModulePath(targetDirectory, localTarget);
    changed = true;
  }
  return changed;
}

let rewrittenConfigs = 0;
for (const packageRoot of packageRoots) {
  const packageDirectory = join(mpRoot, packageRoot);
  for (const jsonFile of walkFiles(packageDirectory, ".json")) {
    if (jsonFile.includes(`${sep}${relocatedComponentDirectory}${sep}`)) continue;
    const config = JSON.parse(readFileSync(jsonFile, "utf8"));
    if (!rewriteUsingComponents(config, dirname(jsonFile), dirname(jsonFile), packageRoot)) continue;
    writeFileSync(jsonFile, JSON.stringify(config), "utf8");
    rewrittenConfigs += 1;
  }
}

// 所有使用点均已改写到分包后，主包不再需要这些组件。
for (const root of relocatableRoots) rmSync(root, { recursive: true, force: true });

// 防止迁移遗漏：非分包 JSON 不得继续引用已移除的组件；所有相对依赖必须存在。
const missing = [];
for (const jsonFile of walkFiles(mpRoot, ".json")) {
  const config = JSON.parse(readFileSync(jsonFile, "utf8"));
  for (const request of Object.values(config.usingComponents || {})) {
    if (typeof request !== "string" || !request.startsWith(".")) continue;
    const target = resolve(dirname(jsonFile), request);
    if (!artifactExtensions.some((extension) => existsSync(`${target}${extension}`))) {
      missing.push(`${relative(mpRoot, jsonFile)} -> ${request}`);
    }
  }
}

for (const jsFile of walkFiles(mpRoot, ".js").filter((file) =>
  file.includes(`${sep}${relocatedComponentDirectory}${sep}`),
)) {
  const source = readFileSync(jsFile, "utf8");
  for (const match of source.matchAll(/(["'])(\.\.?\/[^"'\\]+\.js)\1/g)) {
    const target = resolve(dirname(jsFile), match[2]);
    if (!existsSync(target)) missing.push(`${relative(mpRoot, jsFile)} -> ${match[2]}`);
  }
}
if (missing.length > 0) {
  throw new Error(`微信共享组件迁移后存在无效引用：\n${missing.slice(0, 20).join("\n")}`);
}

console.log(
  `已将 ${copiedComponents} 个排盘共享组件迁入分包，改写 ${rewrittenConfigs} 个页面配置，分包新增 ${(copiedBytes / 1024).toFixed(1)} KB。`,
);

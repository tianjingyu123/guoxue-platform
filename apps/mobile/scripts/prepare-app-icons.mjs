import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

// 仅转换用户确认的原图尺寸和格式，不重绘标识，也不生成圆角。
const mobileRoot = fileURLToPath(new URL("../", import.meta.url));
const iconRoot = path.join(mobileRoot, "unpackage/res/icons");
const source = path.join(iconRoot, "source-rebu.jpg");
for (const size of [48, 72, 96, 144, 192]) {
  await sharp(source)
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
    .removeAlpha()
    .png()
    .toFile(path.join(iconRoot, `${size}x${size}.png`));
}

// 鸿蒙图标由系统遮罩；保留完整原图作为前景，背景使用原图底色。
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: { r: 234, g: 45, b: 3 } },
})
  .png()
  .toFile(path.join(iconRoot, "harmony-background.png"));
console.log("Android 五种尺寸及鸿蒙背景已准备；iOS 原图资源保持不变。");

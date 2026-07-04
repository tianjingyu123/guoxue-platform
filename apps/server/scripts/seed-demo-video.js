// Seed demo short-videos with REAL playable URLs (idempotent). ASCII-only source.
// Purpose: verify the video player actually plays (today's fix added the <video> element).
const fs = require("fs");
const path = require("path");
const { createHmac } = require("crypto");
const { PrismaClient } = require("@prisma/client");

function readEnv(file, key) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    const m = txt.split(/\r?\n/).find((l) => l.startsWith(key + "="));
    return m ? m.slice(key.length + 1).trim() : "";
  } catch { return ""; }
}
const ENC = readEnv(path.join(__dirname, "..", ".env"), "ENCRYPTION_KEY") || readEnv(path.join(__dirname, "..", "..", "..", ".env"), "ENCRYPTION_KEY");
function phoneHmac(phone) {
  return createHmac("sha256", ENC).update(phone).digest("hex");
}

// zh-CN titles as \u escapes (pipe-safe over ssh)
const VIDEOS = [
  { id: "demo-video-0001", url: "https://www.w3schools.com/html/mov_bbb.mp4",
    title: "国学讲堂：道法自然", // 国学讲堂：道法自然
    desc: "演示视频（播放器联调）", cat: "国学讲堂", dur: 10 },
  { id: "demo-video-0002", url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    title: "诗词雅集：声律之美", // 诗词雅集：声律之美
    desc: "演示视频（播放器联调）", cat: "诗词雅集", dur: 52 },
  { id: "demo-video-0003", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    title: "节气候：花开时节", // 节气候：花开时节
    desc: "演示视频（播放器联调）", cat: "节气文化", dur: 8 },
];

(async () => {
  const p = new PrismaClient();
  const user = await p.user.findUnique({ where: { phoneHash: phoneHmac("13912340099") }, select: { id: true } })
    || await p.user.findFirst({ where: { phone: "13912340099" }, select: { id: true } });
  if (!user) { console.log("test user 13912340099 not found"); process.exit(1); }
  console.log("ownerUserId=" + user.id);
  for (const v of VIDEOS) {
    await p.video.upsert({
      where: { id: v.id },
      create: {
        id: v.id, userId: user.id, title: v.title, description: v.desc,
        videoUrl: v.url, coverUrl: "/static/live/live-1.jpg", duration: v.dur,
        status: "PUBLISHED", categoryLevel1: v.cat, tags: [v.cat],
        viewCount: 0, likeCount: 0,
      },
      update: { videoUrl: v.url, title: v.title, status: "PUBLISHED" },
    });
    console.log("upsert " + v.id + " ok");
  }
  const total = await p.video.count({ where: { status: "PUBLISHED" } });
  console.log("PUBLISHED total=" + total);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });

// Seed one demo offline station (idempotent upsert). Pure ASCII source.
// Usage: node scripts/seed-demo-station.js  (run from apps/server)
// - Owner = test account phone 13912340099, resolved via User.phoneHash
//   (HMAC-SHA256 keyed by ENCRYPTION_KEY, per M4). Falls back to the
//   plaintext User.phone column when ENCRYPTION_KEY is absent/invalid.
// - Does NOT touch production: run locally only; main controller executes in prod.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Load env from apps/server/.env then repo root .env (do not override existing)
for (const rel of ["../.env", "../../../.env", "../../.env"]) {
  try {
    const txt = fs.readFileSync(path.resolve(__dirname, rel), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*["']?([^"'\r\n]*)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (e) { /* ignore missing env file */ }
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const OWNER_PHONE = "13912340099";

function phoneHmac(phone) {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || Buffer.byteLength(key, "utf8") !== 32) return null;
  return crypto.createHmac("sha256", Buffer.from(key, "utf8")).update(phone, "utf8").digest("hex");
}

async function findOwner() {
  const hash = phoneHmac(OWNER_PHONE);
  if (hash) {
    const byHash = await prisma.user.findUnique({ where: { phoneHash: hash } });
    if (byHash) return byHash;
  }
  // Fallback: plaintext phone column (M4 grey-release keeps it)
  return prisma.user.findUnique({ where: { phone: OWNER_PHONE } });
}

async function main() {
  const owner = await findOwner();
  if (!owner) {
    throw new Error("Owner user not found for phone " + OWNER_PHONE + " (checked phoneHash then plaintext phone)");
  }

  const data = {
    name: "\u660e\u5fb7\u56fd\u5b66\u9a7f\u7ad9",
    city: "\u5317\u4eac",
    address: "\u5317\u4eac\u5e02\u4e1c\u57ce\u533a\u56fd\u5b50\u76d1\u885728\u53f7",
    phone: "010-64046688",
    cover: null,
    type: "academy",
    intro: "\u4ee5\u300c\u660e\u660e\u5fb7\u300d\u4e3a\u7acb\u9986\u4e4b\u672c\uff0c\u6c47\u805a\u56fd\u5b66\u540d\u5e08\uff0c\u63d0\u4f9b\u7ecf\u5178\u7814\u8bfb\u3001\u4e66\u6cd5\u8336\u9053\u7b49\u7ebf\u4e0b\u7814\u4e60\u4e0e\u96c5\u96c6\u7a7a\u95f4\u3002",
    businessHours: [
      { day: 1, open: "09:00", close: "18:00", isOpen: true },
      { day: 2, open: "09:00", close: "18:00", isOpen: true },
      { day: 3, open: "09:00", close: "18:00", isOpen: true },
      { day: 4, open: "09:00", close: "18:00", isOpen: true },
      { day: 5, open: "09:00", close: "18:00", isOpen: true },
      { day: 6, open: "09:30", close: "17:30", isOpen: true },
      { day: 7, open: "09:30", close: "17:30", isOpen: true },
    ],
    images: [],
    tags: ["\u56fd\u5b66\u7ecf\u5178", "\u4e66\u6cd5\u8336\u9053", "\u4eb2\u5b50\u7814\u5b66"],
    facilities: ["wifi", "tea", "library", "classroom"],
    depositAmount: "5000.00",
    status: "ACTIVE",
    brandStory:
      "\u660e\u5fb7\u56fd\u5b66\u9a7f\u7ad9\u521b\u7acb\u4e8e\u4e8c\u3007\u4e8c\u3007\u5e74\uff0c\u5750\u843d\u4e8e\u5317\u4eac\u56fd\u5b50\u76d1\u8857\uff0c\u53d6\u300a\u5927\u5b66\u300b\u300c\u5927\u5b66\u4e4b\u9053\uff0c\u5728\u660e\u660e\u5fb7\u300d\u4e4b\u4e49\u4e3a\u7acb\u9986\u4e4b\u672c\u3002" +
      "\u9a7f\u7ad9\u4ee5\u7ebf\u4e0b\u7814\u4e60\u4e0e\u96c5\u96c6\u4e3a\u6838\u5fc3\uff0c\u5e38\u5e74\u5f00\u8bbe\u7ecf\u5178\u7814\u8bfb\u3001\u4e66\u6cd5\u3001\u8336\u9053\u4e0e\u53e4\u7434\u8bfe\u7a0b\uff0c" +
      "\u5e76\u8054\u5408\u4e66\u9662\u7b7e\u7ea6\u8bb2\u5e08\u5b9a\u671f\u4e3e\u529e\u516c\u76ca\u8bb2\u5ea7\uff0c\u81f4\u529b\u4e8e\u8ba9\u4f20\u7edf\u6587\u5316\u8d70\u8fdb\u65e5\u5e38\u751f\u6d3b\u3002",
    photos: [],
    featuredTeacherIds: [],
  };

  const station = await prisma.stationOffline.upsert({
    where: { ownerUserId: owner.id },
    update: data,
    create: Object.assign({ ownerUserId: owner.id }, data),
  });

  console.log("seed-demo-station OK");
  console.log("stationId=" + station.id);
  console.log("ownerUserId=" + owner.id + " status=" + station.status + " name=" + station.name);
}

main()
  .catch((e) => {
    console.error("seed-demo-station FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

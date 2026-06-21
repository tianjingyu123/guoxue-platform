const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.celebrityCase.count().then(c => {
  console.log("cases count:", c);
  if (c === 0) console.log("Need to seed");
  p.$disconnect();
}).catch(e => {
  console.error(e.message);
  p.$disconnect();
});

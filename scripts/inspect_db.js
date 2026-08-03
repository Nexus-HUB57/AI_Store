const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.$queryRawUnsafe("SELECT sql FROM sqlite_master WHERE type='table' AND name='Transaction'");
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();

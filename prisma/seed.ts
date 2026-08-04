import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();

  if (count > 0) {
    // eslint-disable-next-line no-console
    console.log(`Seed skipped: ${count} products already exist in the database.`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log("No products found. Database is empty — seed with product data as needed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

export default main;

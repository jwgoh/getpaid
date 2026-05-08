import { prisma } from "../src/server/db";
import { processOutbox } from "../src/server/email/outbox";

async function main() {
  console.log("Starting email outbox processor...");
  console.log(`Current time: ${new Date().toISOString()}`);

  const result = await processOutbox();

  console.log(
    `Outbox run complete. attempted=${result.attempted} sent=${result.sent} failed=${result.failed} pending=${result.pending}`
  );
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

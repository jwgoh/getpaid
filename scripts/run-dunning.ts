import { prisma } from "../src/server/db";
import { runDunning } from "../src/server/invoices/dunning";

async function main() {
  console.log("Starting dunning run...");
  console.log(`Current time: ${new Date().toISOString()}`);

  const result = await runDunning();

  console.log(
    `Dunning run complete. scanned=${result.scanned} transitioned=${result.transitioned} remindersQueued=${result.remindersQueued}`
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

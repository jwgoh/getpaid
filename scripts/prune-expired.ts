import { prisma } from "../src/server/db";
import { pruneExpired } from "../src/server/prune";

const DRY_RUN_FLAG = "--dry-run";

function extractDbHost(url: string | undefined): string {
  if (!url) {
    return "unset";
  }

  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

async function main() {
  const isDryRun = process.argv.includes(DRY_RUN_FLAG);

  console.log("Starting expired-row prune...");
  console.log(`Current time: ${new Date().toISOString()}`);
  console.log(`Mode: ${isDryRun ? "dry-run" : "live"}`);
  console.log(
    JSON.stringify({
      event: "prune.run.banner",
      host: extractDbHost(process.env.DATABASE_URL),
      mode: isDryRun ? "dry-run" : "live",
    })
  );

  const report = await pruneExpired(prisma, { dryRun: isDryRun });

  console.log(
    JSON.stringify({
      event: "prune.idempotencyKeys.complete",
      ...report.idempotencyKeys,
      dryRun: isDryRun,
    })
  );
  console.log(
    JSON.stringify({
      event: "prune.emailOutboxSent.complete",
      ...report.emailOutboxSent,
      dryRun: isDryRun,
    })
  );
  console.log(
    JSON.stringify({
      event: "prune.emailOutboxFailed.complete",
      ...report.emailOutboxFailed,
      dryRun: isDryRun,
    })
  );
  console.log(
    JSON.stringify({
      event: "prune.waitlistEntries.complete",
      ...report.waitlistEntries,
      dryRun: isDryRun,
    })
  );
  console.log(JSON.stringify({ event: "prune.run.summary", ...report }));

  if (report.hasError) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

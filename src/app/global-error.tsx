"use client";

import { GlobalErrorScreen } from "@app/shared/ui/global-error-screen";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <GlobalErrorScreen onReset={reset} />
      </body>
    </html>
  );
}

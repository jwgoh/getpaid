"use client";

import { ErrorScreen } from "@app/shared/ui/error-screen";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen onReset={reset} />;
}

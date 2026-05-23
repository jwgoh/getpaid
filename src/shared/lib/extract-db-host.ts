export function extractDbHost(url: string | undefined): string {
  if (!url) {
    return "unset";
  }

  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

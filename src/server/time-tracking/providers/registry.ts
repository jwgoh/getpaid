import type { TimeTrackingProvider } from "./types";

const providers = new Map<string, TimeTrackingProvider>();

export class UnknownProviderError extends Error {
  constructor(public readonly providerId: string) {
    super(`Time tracking provider "${providerId}" is not registered`);
    this.name = "UnknownProviderError";
  }
}

export function registerProvider(provider: TimeTrackingProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): TimeTrackingProvider {
  const provider = providers.get(id);

  if (!provider) {
    throw new UnknownProviderError(id);
  }

  return provider;
}

export function getAllProviders(): TimeTrackingProvider[] {
  return Array.from(providers.values());
}

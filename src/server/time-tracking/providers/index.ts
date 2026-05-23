import { TogglApiError, togglProvider } from "./toggl";
import type { TimeTrackingProvider } from "./types";

export { TogglApiError };

const PROVIDERS = [togglProvider] as const;

export class UnknownProviderError extends Error {
  constructor(public readonly providerId: string) {
    super(`Time tracking provider "${providerId}" is not registered`);
    this.name = "UnknownProviderError";
  }
}

export function getProvider(id: string): TimeTrackingProvider {
  switch (id) {
    case togglProvider.id:
      return togglProvider;
    default:
      throw new UnknownProviderError(id);
  }
}

export function getAllProviders(): TimeTrackingProvider[] {
  return [...PROVIDERS];
}

export type {
  BreakdownOption,
  NormalizedClient,
  NormalizedProject,
  NormalizedWorkspace,
  ProviderCallContext,
  ProviderCapabilities,
  RoundingDirection,
  TimeEntriesQuery,
  TimeEntriesResult,
  TimeEntryGroup,
  TimeEntryItem,
  TimeTrackingProvider,
} from "./types";

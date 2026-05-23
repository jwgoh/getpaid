import { registerProvider } from "./registry";
import { togglProvider } from "./toggl";

registerProvider(togglProvider);

export { getAllProviders, getProvider, registerProvider, UnknownProviderError } from "./registry";
export type {
  BreakdownOption,
  NormalizedClient,
  NormalizedProject,
  NormalizedWorkspace,
  ProviderCapabilities,
  RoundingDirection,
  TimeEntriesQuery,
  TimeEntriesResult,
  TimeEntryGroup,
  TimeEntryItem,
  TimeTrackingProvider,
} from "./types";

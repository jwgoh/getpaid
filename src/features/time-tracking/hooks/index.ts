import { useEffect } from "react";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@app/shared/api/base";
import { API_ERROR_CODES } from "@app/shared/api/error-codes";
import { queryKeys, STALE_TIME } from "@app/shared/config/query";

import { type TimeEntriesSearchInput, timeTrackingApi } from "../api";

function isDecryptFailure(error: unknown): boolean {
  return error instanceof ApiError && error.code === API_ERROR_CODES.CONNECTION_DECRYPT_FAILED;
}

function invalidateConnections(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.timeTrackingConnections });
}

function useInvalidateOnDecryptFailure(error: unknown): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isDecryptFailure(error)) {
      invalidateConnections(queryClient);
    }
  }, [error, queryClient]);
}

export function useTimeTrackingProviders() {
  return useQuery({
    queryKey: queryKeys.timeTrackingProviders,
    queryFn: timeTrackingApi.getProviders,
    staleTime: STALE_TIME.long,
  });
}

export function useTimeTrackingConnections() {
  return useQuery({
    queryKey: queryKeys.timeTrackingConnections,
    queryFn: timeTrackingApi.getConnections,
    staleTime: STALE_TIME.medium,
  });
}

export function useConnectProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, token }: { provider: string; token: string }) =>
      timeTrackingApi.connect(provider, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTrackingConnections });
    },
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => timeTrackingApi.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTrackingConnections });
    },
  });
}

export function useWorkspaces(provider: string | null) {
  const query = useQuery({
    queryKey: queryKeys.timeTrackingWorkspaces(provider ?? ""),
    queryFn: () => timeTrackingApi.getWorkspaces(provider as string),
    enabled: !!provider,
    staleTime: STALE_TIME.long,
  });

  useInvalidateOnDecryptFailure(query.error);

  return query;
}

export function useProjects(provider: string | null, workspaceId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.timeTrackingProjects(provider ?? "", workspaceId ?? ""),
    queryFn: () => timeTrackingApi.getProjects(provider as string, workspaceId as string),
    enabled: !!provider && !!workspaceId,
    staleTime: STALE_TIME.medium,
  });

  useInvalidateOnDecryptFailure(query.error);

  return query;
}

export function useSearchTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TimeEntriesSearchInput) => timeTrackingApi.searchTimeEntries(input),
    onError: (error) => {
      if (isDecryptFailure(error)) {
        invalidateConnections(queryClient);
      }
    },
  });
}

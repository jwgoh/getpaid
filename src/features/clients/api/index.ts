import { fetchApi } from "@app/shared/api/base";
import type { CreateClientInput, UpdateClientInput } from "@app/shared/schemas";
import {
  type Client,
  clientListSchema,
  clientSchema,
  successAckSchema,
} from "@app/shared/schemas/api";

export const clientsApi = {
  list: () => fetchApi<Client[]>("/api/clients", undefined, clientListSchema),

  get: (id: string) => fetchApi<Client>(`/api/clients/${id}`, undefined, clientSchema),

  create: (data: CreateClientInput) =>
    fetchApi<Client>(
      "/api/clients",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      clientSchema
    ),

  update: (id: string, data: UpdateClientInput) =>
    fetchApi<Client>(
      `/api/clients/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      clientSchema
    ),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(
      `/api/clients/${id}`,
      {
        method: "DELETE",
      },
      successAckSchema
    ),
};

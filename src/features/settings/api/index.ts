import { fetchApi } from "@app/shared/api/base";
import type { SenderProfileInput } from "@app/shared/schemas";
import type { SenderProfile } from "@app/shared/schemas/api";

export const senderProfileApi = {
  get: () => fetchApi<SenderProfile>("/api/sender-profile"),

  create: (data: SenderProfileInput) =>
    fetchApi<SenderProfile>("/api/sender-profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (data: SenderProfileInput) =>
    fetchApi<SenderProfile>("/api/sender-profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

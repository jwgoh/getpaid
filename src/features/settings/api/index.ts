import { fetchApi } from "@app/shared/api/base";
import type { SenderProfileInput } from "@app/shared/schemas";
import { type SenderProfile, senderProfileResponseSchema } from "@app/shared/schemas/api";

export const senderProfileApi = {
  get: () => fetchApi<SenderProfile>("/api/sender-profile", undefined, senderProfileResponseSchema),

  create: (data: SenderProfileInput) =>
    fetchApi<SenderProfile>(
      "/api/sender-profile",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      senderProfileResponseSchema
    ),

  update: (data: SenderProfileInput) =>
    fetchApi<SenderProfile>(
      "/api/sender-profile",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      senderProfileResponseSchema
    ),
};

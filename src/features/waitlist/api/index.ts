import { fetchApi } from "@app/shared/api/base";
import type { WaitlistCheckResponse, WaitlistInput } from "@app/shared/schemas";
import { messageAckSchema } from "@app/shared/schemas/api";
import { waitlistCheckResponseSchema } from "@app/shared/schemas/waitlist";

export const waitlistApi = {
  join: (data: WaitlistInput) =>
    fetchApi<{ message: string }>(
      "/api/waitlist",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      messageAckSchema
    ),

  checkStatus: (data: WaitlistInput) =>
    fetchApi<WaitlistCheckResponse>(
      "/api/waitlist/check",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      waitlistCheckResponseSchema
    ),
};

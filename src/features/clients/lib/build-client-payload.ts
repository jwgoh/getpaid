import { type ClientFormInput } from "@app/shared/schemas";
import { type Cents, fromDollars } from "@app/shared/types/money";

export interface ClientPayload {
  name: string;
  email: string;
  defaultRate: Cents | undefined;
}

export function buildClientPayload(formData: ClientFormInput): ClientPayload {
  return {
    ...formData,
    defaultRate: formData.defaultRate ? fromDollars(formData.defaultRate) : undefined,
  };
}

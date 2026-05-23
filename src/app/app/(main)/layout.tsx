import { redirect } from "next/navigation";

import { asUserId } from "@app/shared/types/ids";

import { auth } from "@app/server/auth";
import { getSenderProfile } from "@app/server/sender-profile";

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const senderProfile = await getSenderProfile(asUserId(session.user.id));

  if (!senderProfile) {
    redirect("/app/onboarding");
  }

  return <>{children}</>;
}

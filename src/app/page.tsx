import { redirect } from "next/navigation";

import { LandingPage } from "@app/features/landing/components";

import { auth } from "@app/server/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  return <LandingPage />;
}

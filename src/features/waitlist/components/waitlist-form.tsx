"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { authApi } from "@app/shared/api/auth";
import { extractApiErrorMessage } from "@app/shared/api/error-message";
import { useToast } from "@app/shared/hooks/use-toast";
import { type SignUpInput, WAITLIST_STATUS, type WaitlistInput } from "@app/shared/schemas";

import { waitlistApi } from "../api";
import { WaitlistEmailStep } from "./waitlist-email-step";
import { WaitlistJoinStep } from "./waitlist-join-step";
import { WaitlistPendingStep } from "./waitlist-pending-step";
import { WaitlistRegisterStep } from "./waitlist-register-step";
import { WaitlistSubmittedStep } from "./waitlist-submitted-step";

type Step = "email_check" | "register" | "pending" | "join_waitlist" | "submitted";

const FALLBACK_ERROR = "An unexpected error occurred";

export function WaitlistForm() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = React.useState<Step>("email_check");
  const [checkedEmail, setCheckedEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCheckEmail = async (data: WaitlistInput) => {
    setIsLoading(true);

    try {
      const result = await waitlistApi.checkStatus(data);

      setCheckedEmail(data.email);

      switch (result.status) {
        case WAITLIST_STATUS.APPROVED:
          setStep("register");
          break;
        case WAITLIST_STATUS.PENDING:
          setStep("pending");
          break;
        case WAITLIST_STATUS.NOT_FOUND:
          setStep("join_waitlist");
          break;
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, FALLBACK_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: SignUpInput) => {
    setIsLoading(true);

    try {
      await authApi.signUp(data);

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.success("Account created! Please sign in.");
        router.push("/auth/sign-in");

        return;
      }

      toast.success("Welcome to GetPaid!");
      router.push("/app");
      router.refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, FALLBACK_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setIsLoading(true);

    try {
      await waitlistApi.join({ email: checkedEmail });
      setStep("submitted");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, FALLBACK_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "submitted") {
    return <WaitlistSubmittedStep email={checkedEmail} />;
  }

  if (step === "pending") {
    return <WaitlistPendingStep email={checkedEmail} />;
  }

  if (step === "join_waitlist") {
    return (
      <WaitlistJoinStep
        email={checkedEmail}
        isLoading={isLoading}
        onJoin={handleJoinWaitlist}
        onUseDifferentEmail={() => setStep("email_check")}
      />
    );
  }

  if (step === "register") {
    return (
      <WaitlistRegisterStep email={checkedEmail} isLoading={isLoading} onSubmit={handleRegister} />
    );
  }

  return <WaitlistEmailStep isLoading={isLoading} onSubmit={handleCheckEmail} />;
}

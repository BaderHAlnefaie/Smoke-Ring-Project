"use client";

import { useActionState, useState } from "react";
import { requestOtp, verifyOtp, type SignInState } from "./actions";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type Props = {
  next: string;
  mode: "phone" | "email";
  dict: Dictionary["auth"];
};

const initial: SignInState = { step: "request" };

export function SignInForm({ next, mode, dict }: Props) {
  const [requestState, requestAction, requestPending] = useActionState(
    requestOtp,
    initial,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtp,
    initial,
  );

  const [identifier, setIdentifier] = useState("");

  const step = verifyState.step ?? requestState.step ?? "request";
  const activeIdentifier =
    verifyState.identifier ?? requestState.identifier ?? identifier;

  if (step === "verify") {
    return (
      <form action={verifyAction} className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {dict.codeSentTo} <span className="font-medium">{activeIdentifier}</span>
        </p>
        <input type="hidden" name="identifier" value={activeIdentifier} />
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{dict.codeLabel}</span>
          <input
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className="w-full rounded-md border border-black/[.12] dark:border-white/[.12] bg-white dark:bg-zinc-950 px-3 py-2 text-base tabular-nums tracking-widest"
          />
        </label>
        {verifyState.error && (
          <p className="text-sm text-red-600">{verifyState.error}</p>
        )}
        <button
          type="submit"
          disabled={verifyPending}
          className="w-full rounded-full bg-foreground px-5 py-3 text-base font-medium text-background disabled:opacity-60"
        >
          {verifyPending ? dict.verifying : dict.verify}
        </button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">
          {mode === "phone" ? dict.phoneLabel : dict.emailLabel}
        </span>
        <input
          name="identifier"
          type={mode === "phone" ? "tel" : "email"}
          inputMode={mode === "phone" ? "tel" : "email"}
          autoComplete={mode === "phone" ? "tel" : "email"}
          placeholder={mode === "phone" ? "+9665XXXXXXXX" : "you@example.com"}
          defaultValue={requestState.identifier ?? ""}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className="w-full rounded-md border border-black/[.12] dark:border-white/[.12] bg-white dark:bg-zinc-950 px-3 py-2 text-base"
        />
      </label>
      {requestState.error && (
        <p className="text-sm text-red-600">{requestState.error}</p>
      )}
      <button
        type="submit"
        disabled={requestPending}
        className="w-full rounded-full bg-foreground px-5 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {requestPending ? dict.sending : dict.sendCode}
      </button>
    </form>
  );
}

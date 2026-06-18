"use client";

import { useActionState, useState } from "react";
import { requestOtp, verifyOtp, type SignInState } from "./actions";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type Props = {
  next: string;
  mode: "phone" | "email";
  dict: Dictionary["auth"];
};

const requestInitial: SignInState = { step: "request" };
const verifyInitial: SignInState = {};

const inputClass =
  "w-full rounded-xl border border-line bg-panel px-3.5 py-3 text-base text-ink placeholder:text-faint focus:border-ember focus:outline-none";
const primaryBtn =
  "w-full rounded-2xl bg-ember px-5 py-3.5 text-base font-bold text-cream shadow-lg shadow-ember/30 disabled:opacity-60";
const labelClass =
  "text-[11.5px] font-bold uppercase tracking-wider text-faint";

export function SignInForm({ next, mode, dict }: Props) {
  const [requestState, requestAction, requestPending] = useActionState(
    requestOtp,
    requestInitial,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtp,
    verifyInitial,
  );

  const [identifier, setIdentifier] = useState("");

  const step = verifyState.step ?? requestState.step ?? "request";
  const activeIdentifier =
    verifyState.identifier ?? requestState.identifier ?? identifier;

  if (step === "verify") {
    return (
      <form action={verifyAction} className="space-y-4">
        <p className="text-sm text-ink-soft">
          {dict.codeSentTo} <span className="font-semibold text-ink">{activeIdentifier}</span>
        </p>
        <input type="hidden" name="identifier" value={activeIdentifier} />
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-2">
          <span className={labelClass}>{dict.codeLabel}</span>
          <input
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{4,10}"
            maxLength={10}
            required
            className={`${inputClass} text-center text-lg tracking-[0.4em] tabular-nums`}
          />
        </label>
        {verifyState.error && <p className="text-sm text-rust">{verifyState.error}</p>}
        <button type="submit" disabled={verifyPending} className={primaryBtn}>
          {verifyPending ? dict.verifying : dict.verify}
        </button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-2">
        <span className={labelClass}>
          {mode === "phone" ? dict.phoneLabel : dict.emailLabel}
        </span>
        <input
          name="identifier"
          type={mode === "phone" ? "tel" : "email"}
          inputMode={mode === "phone" ? "tel" : "email"}
          autoComplete={mode === "phone" ? "tel" : "email"}
          placeholder={mode === "phone" ? "05XXXXXXXX" : "you@example.com"}
          defaultValue={requestState.identifier ?? ""}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      {requestState.error && <p className="text-sm text-rust">{requestState.error}</p>}
      <button type="submit" disabled={requestPending} className={primaryBtn}>
        {requestPending ? dict.sending : dict.sendCode}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form-controls";

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);

  if (state?.success) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="grid gap-4">
      <Field label="Your name">
        <input name="name" autoComplete="name" required minLength={2} maxLength={60} className={inputClass} />
      </Field>
      <Field label="Work email">
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating your workspace…" className="w-full">
        Create workspace
      </SubmitButton>
    </form>
  );
}

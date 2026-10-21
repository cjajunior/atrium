"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form-controls";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Email">
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

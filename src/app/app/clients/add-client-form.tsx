"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form-controls";
import { addClient } from "./actions";

export function AddClientForm() {
  const [state, action] = useActionState(addClient, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <Field label="Company name">
        <input name="name" required minLength={2} maxLength={80} className={inputClass} />
      </Field>
      <Field label="Contact email" hint="Optional.">
        <input name="contactEmail" type="email" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form-controls";
import { createRequest } from "../actions";

type ProjectOption = { id: string; name: string; company: string };

export function NewRequestForm({
  projects,
  defaultProjectId,
  showCompany,
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
  showCompany: boolean;
}) {
  const [state, action] = useActionState(createRequest, undefined);

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      <Field label="Project">
        <select name="projectId" required defaultValue={defaultProjectId ?? ""} className={inputClass}>
          <option value="" disabled>
            Choose a project
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {showCompany ? `${project.company}: ${project.name}` : project.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="What do you need?" hint="One short sentence, like “Update the opening hours in the footer”.">
        <input name="title" required minLength={3} maxLength={140} className={inputClass} />
      </Field>

      <Field label="Details" hint="Links, screenshots described in words, where it happens. Optional.">
        <textarea name="description" rows={6} maxLength={4000} className={inputClass} />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-[0.95rem] font-semibold">How urgent is it?</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "low", label: "Whenever you can" },
            { value: "normal", label: "This week" },
            { value: "high", label: "It's blocking us" },
          ].map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border border-line-strong bg-paper px-3.5 py-2 text-[0.95rem] has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-open"
            >
              <input type="radio" name="priority" value={option.value} defaultChecked={option.value === "normal"} className="sr-only" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
      </div>
    </form>
  );
}

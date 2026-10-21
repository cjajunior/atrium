"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form-controls";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS, type RequestPriority, type RequestStatus } from "@/lib/format";
import { addMessage, updateRequest } from "../actions";

export function ReplyForm({
  requestId,
  canWriteInternal,
  internalNotesIncluded,
  isAdmin,
}: {
  requestId: string;
  canWriteInternal: boolean;
  internalNotesIncluded: boolean;
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(addMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 rounded-xl border border-line bg-paper p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="grid gap-1.5">
        <span className="font-semibold">Reply</span>
        <textarea name="body" rows={4} required maxLength={4000} className={inputClass} />
      </label>

      {canWriteInternal ? (
        internalNotesIncluded ? (
          <label className="flex items-start gap-2 text-[0.95rem]">
            <input type="checkbox" name="internal" className="mt-1 size-4 accent-progress" />
            <span>
              Internal note <span className="text-muted">(only your team sees it, never the client)</span>
            </span>
          </label>
        ) : (
          <p className="text-sm text-muted">
            Internal notes, visible only to your team, are part of Pro.{" "}
            {isAdmin ? (
              <Link href="/app/billing" className="font-semibold text-ink underline underline-offset-4">
                See plans
              </Link>
            ) : (
              "Ask your admin to upgrade."
            )}
          </p>
        )
      ) : null}

      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Sending…">Send reply</SubmitButton>
      </div>
    </form>
  );
}

export function RequestControls({
  requestId,
  status,
  priority,
  assigneeId,
  staff,
}: {
  requestId: string;
  status: RequestStatus;
  priority: RequestPriority;
  assigneeId: string | null;
  staff: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(updateRequest, undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <Field label="Status">
        <select name="status" defaultValue={status} className={inputClass}>
          {(Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((value) => (
            <option key={value} value={value}>
              {REQUEST_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Priority">
        <select name="priority" defaultValue={priority} className={inputClass}>
          {(Object.keys(PRIORITY_LABELS) as RequestPriority[]).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Assigned to">
        <select name="assigneeId" defaultValue={assigneeId ?? ""} className={inputClass}>
          <option value="">Nobody yet</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}

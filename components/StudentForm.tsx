"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/ui";

type Values = {
  name: string;
  fatherName: string;
  className: string;
  phoneNumber: string;
  monthlyFee: string;
  admissionFee: string;
  admissionDate: string;
};
type FieldErrors = Partial<Record<keyof Values, string>>;

// Shared by Add Student (POST, both roles) and Edit Student (PATCH, Admin).
// `redirectTo` may contain ":id", replaced with the saved student's id (e.g. "/manager/students/:id?added=1").
export default function StudentForm({
  initial,
  action,
  method,
  redirectTo,
  submitLabel,
}: {
  initial: Values;
  action: string;
  method: "POST" | "PATCH";
  redirectTo: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFields({});
    setSaving(true);
    try {
      const res = await fetch(action, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        setFields(data.fields ?? {});
        setSaving(false);
        return;
      }
      router.push(redirectTo.replace(":id", data.student?.id ?? ""));
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setSaving(false);
    }
  }

  const field = (name: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, help?: string) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        defaultValue={initial[name]}
        aria-invalid={!!fields[name]}
        aria-describedby={`${name}-msg`}
        className={`${inputClass} ${fields[name] ? "border-warn" : ""}`}
        {...props}
      />
      <p id={`${name}-msg`} className={`min-h-4 text-xs ${fields[name] ? "text-warn" : "text-muted"}`}>
        {fields[name] ?? help}
      </p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-2 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-6">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {field("name", "Student name", { required: true, autoComplete: "off" })}
        {field("fatherName", "Father's name", { required: true, autoComplete: "off" })}
        {field("className", "Class", { required: true, autoComplete: "off", maxLength: 50 }, "Required. Type it any way, e.g. Class 5, Nursery, 8-B.")}
        {field("phoneNumber", "Phone number", { type: "tel", required: true, autoComplete: "off" })}
        {field("admissionDate", "Admission date", { type: "date" }, "Monthly billing starts from this month.")}
        {field("monthlyFee", "Monthly fee (Rs)", { inputMode: "numeric", required: true }, "Required. Whole rupees.")}
        {field("admissionFee", "Admission fee (Rs)", { inputMode: "numeric" }, "Optional — leave blank if none.")}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      <div className="pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

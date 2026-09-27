"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/ui";

type Fields = Partial<Record<"name" | "username" | "password" | "phone", string>>;

export default function AddManagerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFields({});
    setSaving(true);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create the manager.");
        setFields(data.fields ?? {});
        setSaving(false);
        return;
      }
      router.push(`/admin/managers?created=${encodeURIComponent(data.manager.username)}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setSaving(false);
    }
  }

  const field = (
    name: keyof Fields,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    help?: string
  ) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={!!fields[name]}
        aria-describedby={`${name}-msg`}
        className={`${inputClass} ${fields[name] ? "border-warn" : ""}`}
        {...props}
      />
      <p id={`${name}-msg`} className={`text-xs ${fields[name] ? "text-warn" : "text-muted"}`}>
        {fields[name] ?? help}
      </p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-6" noValidate>
      {field("name", "Full name", { required: true, autoComplete: "off", autoFocus: true })}
      {field("username", "Username", { required: true, autoComplete: "off", autoCapitalize: "none", spellCheck: false },
        "Used to log in. Lowercase letters, numbers, . _ -")}
      {field("password", "Password", { type: "password", required: true, autoComplete: "new-password" }, "At least 6 characters.")}
      {field("phone", "Phone (optional)", { type: "tel", autoComplete: "off" })}

      {error && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? "Creating…" : "Create manager"}
      </button>
    </form>
  );
}

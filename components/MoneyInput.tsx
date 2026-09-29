"use client";

import { forwardRef } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">;

// Whole-rupee input: only digits can be typed or pasted (no "-", ".", "e", letters), so a
// negative or decimal amount can't even be entered. The server re-checks with lib/money.ts.
// Works both controlled (value/onChange) and uncontrolled (defaultValue + FormData).
const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput({ onChange, onKeyDown, ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      {...rest}
      onKeyDown={(e) => {
        if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        const clean = e.target.value.replace(/[^0-9]/g, "");
        if (clean !== e.target.value) e.target.value = clean; // e.g. pasted "2,500" → "2500"
        onChange?.(e);
      }}
      onPaste={(e) => {
        // Strip commas/spaces from pasted amounts; refuse anything with a sign or decimal point.
        const text = e.clipboardData.getData("text");
        if (/[-.]/.test(text)) e.preventDefault();
      }}
    />
  );
});

export default MoneyInput;

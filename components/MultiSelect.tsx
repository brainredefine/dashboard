"use client";

import { useMemo, useState } from "react";

export default function MultiSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options.slice(0, 30);
    return options.filter(o => o.toLowerCase().includes(s)).slice(0, 30);
  }, [q, options]);

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  }

  function remove(v: string) {
    onChange(value.filter(x => x !== v));
  }

  return (
    <div className="relative">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>

      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => remove(v)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
              title="Remove"
            >
              {v} ×
            </button>
          ))}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full outline-none text-sm text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-zinc-500">No matches</div>
        ) : (
          filtered.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 ${
                value.includes(o) ? "bg-sky-50 text-sky-900" : "text-zinc-800"
              }`}
            >
              {o}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

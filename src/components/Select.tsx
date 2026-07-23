import { useEffect, useRef } from "react";

export interface Option {
  value: string;
  label: string;
}

/**
 * One dropdown for the whole app, built on the header menu's popover look so
 * every "pick one" control matches. Controlled, keyboard operable (Enter/Space
 * to open, arrows to move, Esc to close), closes on outside click and choose.
 */
export default function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.removeAttribute("open");
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const choose = (v: string) => {
    onChange(v);
    ref.current?.removeAttribute("open");
    ref.current?.querySelector("summary")?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDetailsElement>) => {
    const d = ref.current;
    if (!d) return;
    if (e.key === "Escape") {
      d.removeAttribute("open");
      d.querySelector("summary")?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!d.open) return d.setAttribute("open", "");
      const items = Array.from(d.querySelectorAll<HTMLButtonElement>(".select-pop button"));
      const idx = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "ArrowDown" ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
      items[next < 0 ? 0 : next]?.focus();
    }
  };

  return (
    <details className="select" ref={ref} onKeyDown={onKeyDown}>
      <summary role="button" aria-label={ariaLabel} aria-haspopup="listbox">
        {current?.label ?? "Select"}
      </summary>
      <div className="select-pop" role="listbox">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            className={o.value === value ? "sel" : ""}
            onClick={() => choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </details>
  );
}

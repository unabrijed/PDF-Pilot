/** The one colour swatch in the app. Native input, labelled inline. */
export default function ColorPicker({ value, onChange, label = "Color" }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-2 text-xs">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-8 cursor-pointer rounded-md border bg-transparent p-0"
      />
    </label>
  );
}

import { categories, toolBySlug } from "../tools/registry";

/** Category eyebrow + icon tile + title + subtitle. Shared so every tool page opens the same way. */
export default function ToolHeader({ slug, sub }: { slug: string; sub?: string }) {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  const Icon = tool.icon;
  const category = categories.find((c) => c.id === tool.category)!;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <span className="bg-card text-primary flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-xs">
          <Icon className="size-5" />
        </span>
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">{category.label}</span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{tool.title}</h1>
      <p className="text-muted-foreground mt-2">{sub ?? tool.desc}</p>
    </div>
  );
}

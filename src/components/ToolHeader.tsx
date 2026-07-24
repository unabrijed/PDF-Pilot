import { toolBySlug } from "../tools/registry";

/** Icon tile + title + subtitle. Shared so every tool page opens the same way. */
export default function ToolHeader({ slug, sub }: { slug: string; sub?: string }) {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  const Icon = tool.icon;

  return (
    <div className="mb-7 flex items-start gap-3">
      <span className="bg-[image:var(--gradient-soft)] text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{tool.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{sub ?? tool.desc}</p>
      </div>
    </div>
  );
}

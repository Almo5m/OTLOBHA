const STAGES = [
  { key: "new", label: "جديدة" },
  { key: "in_progress", label: "جارٍ الشراء" },
  { key: "on_the_way", label: "في الطريق" },
  { key: "completed", label: "تم التسليم" }
];

export default function PipelineStrip({
  values
}: {
  values: { new: number; in_progress: number; on_the_way: number; completed: number };
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex divide-x divide-x-reverse divide-borderc">
        {STAGES.map((s) => (
          <div key={s.key} className="flex-1 px-3 py-4 text-center sm:px-4">
            <p className="numeric text-2xl font-bold sm:text-3xl">{(values as any)[s.key] ?? 0}</p>
            <p className="mt-1 truncate text-[11px] text-textSecondary sm:text-xs">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

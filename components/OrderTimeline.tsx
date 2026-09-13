import Icon from "./Icon";
import { Badge } from "./Badge";

const STAGES = [
  { key: "received", label: "تم الاستلام", icon: "orders" as const, statuses: ["review", "accepted"] },
  { key: "preparing", label: "جارٍ التجهيز", icon: "cart" as const, statuses: ["shopping", "invoice_preparation", "invoice_approved", "ready_for_delivery"] },
  { key: "on_the_way", label: "في الطريق", icon: "delivery" as const, statuses: ["assigned", "on_the_way"] },
  { key: "delivered", label: "تم التسليم", icon: "check" as const, statuses: ["delivered"] }
];

export default function OrderTimeline({ status }: { status: string }) {
  if (status === "rejected" || status.startsWith("canceled")) {
    return (
      <div className="card flex items-center gap-3" style={{ borderColor: "var(--color-error)" }}>
        <Icon name="close" size={20} className="text-error shrink-0" />
        <div>
          <p className="font-medium text-error">
            {status === "rejected" ? "تم رفض الطلب" : "تم إلغاء الطلب"}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.statuses.includes(status));
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className="h-0.5 flex-1 transition-colors duration-slow"
                    style={{ backgroundColor: done || current ? "var(--color-accent)" : "var(--color-border)" }}
                  />
                )}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-slow"
                  style={{
                    backgroundColor: done ? "var(--color-accent)" : current ? "var(--color-accent-soft)" : "var(--color-surface-elevated)",
                    color: done ? "#fff" : current ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                    border: current ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    boxShadow: current
                      ? "0 0 0 4px color-mix(in srgb, var(--color-accent-neon) 20%, transparent), 0 0 16px color-mix(in srgb, var(--color-accent-neon) 35%, transparent)"
                      : "none"
                  }}
                >
                  <Icon name={done ? "check" : stage.icon} size={16} />
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className="h-0.5 flex-1 transition-colors duration-slow"
                    style={{ backgroundColor: done ? "var(--color-accent)" : "var(--color-border)" }}
                  />
                )}
              </div>
              <span className="text-center text-xs" style={{ color: current ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

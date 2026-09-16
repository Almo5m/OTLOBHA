import Link from "next/link";
import { OrderStatusBadge } from "./Badge";

type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  users?: { full_name: string } | null;
};

export default function RecentOrdersList({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-textSecondary">لا توجد طلبات حتى الآن.</p>;
  }

  return (
    <div className="card p-0">
      {orders.map((o, i) => (
        <Link
          key={o.id}
          href={`/admin/orders/${o.id}`}
          className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surfaceElevated ${i > 0 ? "border-t border-borderc" : ""}`}
        >
          <div className="min-w-0">
            <p className="numeric font-medium">{o.order_number}</p>
            <p className="truncate text-xs text-textSecondary">{o.users?.full_name ?? "—"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <OrderStatusBadge status={o.status} />
            <span className="numeric hidden text-xs text-textSecondary sm:inline">
              {new Date(o.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

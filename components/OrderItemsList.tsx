import { Badge } from "./Badge";

type OrderItem = {
  id: string;
  quantity: number | null;
  target_price: number | null;
  actual_price: number | null;
  is_available: boolean | null;
  products?: { name: string } | null;
  manual_name?: string | null;
  sale_units?: { name: string } | null;
};

export default function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <div className="card">
      <h2 className="mb-3 font-medium">الأصناف</h2>
      <div>
        {items.map((it, i) => {
          const unavailable = it.is_available === false;
          return (
            <div key={it.id} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-borderc" : ""}`}>
              <div className={unavailable ? "opacity-50" : ""}>
                <p className={unavailable ? "line-through" : ""}>{it.products?.name ?? it.manual_name}</p>
                <p className="numeric text-xs text-textSecondary">
                  {it.target_price ? `بميزانية تقريبية ${it.target_price} ج.م` : `${it.quantity} × ${it.sale_units?.name}`}
                </p>
              </div>
              {unavailable ? (
                <Badge variant="neutral">غير متوفر</Badge>
              ) : it.actual_price != null ? (
                <span className="numeric font-medium">{it.actual_price} ج.م</span>
              ) : (
                <span className="text-xs text-textSecondary">لم يُشترى بعد</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

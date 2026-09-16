import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import CategoryForm from "@/components/CategoryForm";
import CategoryToggle from "@/components/CategoryToggle";
import CategoryImageEditor from "@/components/CategoryImageEditor";
import CategoryMoveButtons from "@/components/CategoryMoveButtons";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";

export default async function AdminCategoriesPage() {
  const supabase = createServerSupabase();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");
  const list = categories ?? [];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="market" size={20} className="text-textSecondary" /> التصنيفات
        </h1>
        <p className="mb-4 text-xs text-textSecondary">
          إضافة تصنيف جديد صلاحية Super Admin فقط. الصورة والترتيب والتفعيل يمكن تعديلهم مباشرة من القائمة تحت.
        </p>

        <CategoryForm />

        <div className="mt-6 space-y-2">
          {list.map((c, i) => (
            <div key={c.id} className="card flex items-center gap-3 text-sm">
              <CategoryMoveButtons
                categoryId={c.id}
                sortOrder={c.sort_order}
                prevSibling={i > 0 ? { id: list[i - 1].id, sort_order: list[i - 1].sort_order } : null}
                nextSibling={i < list.length - 1 ? { id: list[i + 1].id, sort_order: list[i + 1].sort_order } : null}
              />
              <CategoryImageEditor categoryId={c.id} imageUrl={c.image_url} />
              <span className="flex-1 font-medium">{c.name}</span>
              <Badge variant={c.is_active ? "success" : "neutral"}>
                {c.is_active ? "نشط" : "غير نشط"}
              </Badge>
              <CategoryToggle categoryId={c.id} isActive={c.is_active} />
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-textSecondary">لا توجد تصنيفات بعد.</p>}
        </div>
      </main>
    </>
  );
}

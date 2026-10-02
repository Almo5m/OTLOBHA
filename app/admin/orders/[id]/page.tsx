import AdminNav from "@/components/AdminNav";
import StaffOrderDetail from "@/components/StaffOrderDetail";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AdminNav />
      <StaffOrderDetail id={id} isAdmin />
    </>
  );
}

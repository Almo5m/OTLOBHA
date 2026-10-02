import AgentNav from "@/components/AgentNav";
import StaffOrderDetail from "@/components/StaffOrderDetail";

export default async function AgentOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AgentNav />
      <StaffOrderDetail id={id} isAdmin={false} />
    </>
  );
}

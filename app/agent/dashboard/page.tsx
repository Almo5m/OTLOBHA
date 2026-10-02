import AgentNav from "@/components/AgentNav";
import OpenOrdersBoard from "@/components/OpenOrdersBoard";

export default function AgentDashboard() {
  return (
    <>
      <AgentNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <OpenOrdersBoard basePath="/agent/orders" />
      </main>
    </>
  );
}

import { Suspense } from "react";
import CustomerNav from "@/components/CustomerNav";
import ComplaintForm from "@/components/ComplaintForm";

export default function ComplaintsPage() {
  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <Suspense fallback={null}>
          <ComplaintForm />
        </Suspense>
      </main>
    </>
  );
}

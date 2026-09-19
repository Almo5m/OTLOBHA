import { Suspense } from "react";
import CustomerNav from "@/components/CustomerNav";
import ComplaintForm from "@/components/ComplaintForm";
import ContactSupportLink from "@/components/ContactSupportLink";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default function ComplaintsPage() {
  return (
    <>
      <CustomerNav />
      <RealtimeRefresher tables={["complaints"]} channelName="customer-complaints" />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">الشكاوى والاستفسارات</h1>
          <ContactSupportLink variant="button" label="تواصل مباشر" />
        </div>
        <Suspense fallback={null}>
          <ComplaintForm />
        </Suspense>
      </main>
    </>
  );
}

import AdminNav from "@/components/AdminNav";
import AdminSettingsForm from "@/components/AdminSettingsForm";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <AdminSettingsForm />
      </main>
    </>
  );
}

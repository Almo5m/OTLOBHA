import ContactSupportLink from "@/components/ContactSupportLink";

export default function BlockedPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-bold text-error">الحساب موقوف</h1>
      <p className="mb-4 text-sm text-textSecondary">
        حسابك موقوف حاليًا. للاستفسار أو حل المشكلة، يرجى التواصل مع خدمة العملاء.
      </p>
      <ContactSupportLink
        variant="button"
        message="مرحبًا، حسابي في المنيب جو موقوف وعايز أستفسر عن السبب."
      />
    </main>
  );
}

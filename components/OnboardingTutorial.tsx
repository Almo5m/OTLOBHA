"use client";

import { useEffect, useState } from "react";
import IconBadge from "./IconBadge";

const STEPS = [
  {
    icon: "market" as const,
    title: "تصفّح واختار",
    desc: "من التصنيفات أو حتى منتج مش موجود عندنا — أضِفه يدويًا من السلة."
  },
  {
    icon: "wallet" as const,
    title: "ادفع بالطريقة اللي تريحك",
    desc: "كاش عند الاستلام، أو حوّل أونلاين ونأكد التحويل بسرعة."
  },
  {
    icon: "delivery" as const,
    title: "تابع طلبك أول بأول",
    desc: "من لحظة القبول لحد التسليم، هتعرف طلبك وصل لفين بالظبط."
  }
];

const STORAGE_KEY = "otlobha-onboarding-seen";

export default function OnboardingTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={close}>
      <div
        className="surface-elevated w-full max-w-sm animate-slideUp rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <IconBadge name={current.icon} tone="accent" size="lg" />
          <h2 className="mt-4 text-lg font-bold">{current.title}</h2>
          <p className="mt-1.5 text-sm text-textSecondary">{current.desc}</p>
        </div>

        <div className="mb-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-base ${i === step ? "w-5 bg-accent" : "w-1.5 bg-borderc"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={close} className="text-sm text-textSecondary">تخطي</button>
          <button
            onClick={() => (isLast ? close() : setStep((s) => s + 1))}
            className="btn-primary"
          >
            {isLast ? "يلّا نبدأ" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}

type IconName =
  | "market" | "cleaning" | "medical" | "vegetables"
  | "orders" | "cart" | "delivery" | "location"
  | "customer" | "agent" | "invoice" | "payment" | "wallet"
  | "complaints" | "rating" | "products" | "reports"
  | "notifications" | "settings" | "dashboard" | "search" | "account"
  | "check" | "close" | "chevron" | "plus" | "moon" | "sun" | "debt" | "logout" | "menu"
  | "eye" | "eyeOff" | "externalLink";

const STROKE = 1.75;

/**
 * نظام الأيقونات المخصص لـ«المنيب جو» — Soft Rounded + Geometric.
 * كل أيقونة: viewBox 24x24، stroke بنفس السُمك، زوايا ناعمة (linecap/linejoin round).
 * لا يعتمد على أي Icon Library خارجية.
 */
export default function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className
  };

  switch (name) {
    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.8-7 9.5-7 9.5 7 9.5 7-3.8 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2A9.7 9.7 0 0 1 12 5c5.7 0 9.5 7 9.5 7a15.6 15.6 0 0 1-3.3 4.1M6.2 6.9C3.6 8.8 2.5 12 2.5 12s3.8 7 9.5 7c1.3 0 2.5-.3 3.6-.8" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case "externalLink":
      return (
        <svg {...common}>
          <path d="M9 4.5H5.5A1.5 1.5 0 0 0 4 6v12.5A1.5 1.5 0 0 0 5.5 20H18a1.5 1.5 0 0 0 1.5-1.5V15" />
          <path d="M14.5 4h5.5v5.5" />
          <path d="M20 4l-9.5 9.5" />
        </svg>
      );
    case "market":
      return (
        <svg {...common}>
          <path d="M4 8.5h16l-1.3 9.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4 8.5Z" />
          <path d="M8.5 8.5V6.5a3.5 3.5 0 0 1 7 0v2" />
        </svg>
      );
    case "cleaning":
      return (
        <svg {...common}>
          <path d="M9.5 3.5h5l.6 3.2H8.9l.6-3.2Z" />
          <path d="M8.2 6.7h7.6l1 12.3a1.6 1.6 0 0 1-1.6 1.8H8.8a1.6 1.6 0 0 1-1.6-1.8l1-12.3Z" />
          <path d="M9.5 11.5c1.2 1 1.2 2 0 3s-1.2 2 0 3" />
        </svg>
      );
    case "medical":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "vegetables":
      return (
        <svg {...common}>
          <path d="M12 21c-4.4 0-7-3.4-7-7.4 0-4 3.2-6.6 7-6.6s7 2.6 7 6.6c0 4-2.6 7.4-7 7.4Z" />
          <path d="M12 7c0-2 1-3.5 3-4M12 7c0-1.6-.8-2.8-2.2-3.4" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
          <path d="M9 3.5V5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3.5" />
          <path d="m8.5 12 2 2 4-4M8.5 16.5h4" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M4 5h2l1.8 10.2a2 2 0 0 0 2 1.6h6.6a2 2 0 0 0 2-1.6L20 8H7" />
          <circle cx="10" cy="20" r="1.3" />
          <circle cx="17" cy="20" r="1.3" />
        </svg>
      );
    case "delivery":
      return (
        <svg {...common}>
          <rect x="3.5" y="7.5" width="11" height="9" rx="1.8" />
          <path d="M14.5 10.5H18l2.5 3v3h-2" />
          <circle cx="8" cy="18.5" r="1.6" />
          <circle cx="17" cy="18.5" r="1.6" />
        </svg>
      );
    case "location":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
      );
    case "customer":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.3" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
      );
    case "agent":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 20c0-3.4 2.9-5.7 6.5-5.7s6.5 2.3 6.5 5.7" />
          <path d="M9 20.5v-2.8M15 20.5v-2.8" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          <path d="M6.5 3.5h11v17l-2.5-1.6-2.5 1.6-2.5-1.6-2.5 1.6v-17Z" />
          <path d="M9 8h6M9 11.5h6M9 15h3.5" />
        </svg>
      );
    case "payment":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.3" />
          <path d="M3.5 9.5h17" />
          <path d="M7 14.5h4" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a2 2 0 0 1 2 2v1" />
          <rect x="4" y="7.5" width="16" height="11.5" rx="2.3" />
          <circle cx="15.5" cy="13" r="1.3" />
        </svg>
      );
    case "complaints":
      return (
        <svg {...common}>
          <path d="M4 5.5h16v10.5H9.5L6 19.5v-3.5H4V5.5Z" />
          <path d="M12 8.3v3M12 13.5h.01" />
        </svg>
      );
    case "rating":
      return (
        <svg {...common}>
          <path d="M12 3.8 14.3 9l5.7.5-4.3 3.8L17 19l-5-3-5 3 1.3-5.7L4 9.5 9.7 9 12 3.8Z" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
          <path d="M4 8l8 4.5L20 8M12 12.5V21" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M5 20.5V9M12 20.5V4M19 20.5v-7" />
          <path d="M3.5 20.5h17" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8" />
          <rect x="13" y="3.5" width="7.5" height="4.7" rx="1.8" />
          <rect x="13" y="10.3" width="7.5" height="10.2" rx="1.8" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.3-4.3" />
        </svg>
      );
    case "account":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="6" />
          <circle cx="12" cy="10" r="2.6" />
          <path d="M7.3 17.5c.8-2.2 2.5-3.3 4.7-3.3s3.9 1.1 4.7 3.3" />
        </svg>
      );
    case "debt":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9M14.7 9.8c0-1.3-1.2-2.1-2.7-2.1S9.3 8.5 9.3 9.8c0 2.6 5.4 1.4 5.4 4 0 1.3-1.3 2.1-2.7 2.1s-2.7-.8-2.7-2.1" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H9" />
          <path d="M15.5 8 20 12l-4.5 4M20 12H9.5" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      );
    default:
      return null;
  }
}

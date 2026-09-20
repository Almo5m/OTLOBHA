"use client";

import { useState } from "react";
import IconBadge from "@/components/IconBadge";

export default function ProductThumb({ src, size = 44 }: { src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <IconBadge name="products" size="sm" />;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

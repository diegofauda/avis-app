"use client";

import { useState } from "react";

export default function AvisLogo({ size = 40 }: { size?: number }) {
  const [err, setErr] = useState(false);
  if (!err) {
    // Logo transparente sobre un círculo blanco (para que se lea completo en la barra negra).
    const pad = Math.round(size * 0.08);
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-white"
        style={{ width: size, height: size, padding: pad }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avis-logo.png" width={size - pad * 2} height={size - pad * 2} alt="AVIS" onError={() => setErr(true)} style={{ objectFit: "contain" }} />
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="AVIS">
      <circle cx="50" cy="50" r="49" fill="#0b1e3f" />
      <circle cx="50" cy="50" r="41" fill="#ffffff" />
      <text x="50" y="60" textAnchor="middle" fontSize="30" fontWeight="800" fill="#1d4ed8" fontFamily="Arial, sans-serif" letterSpacing="1">AVIS</text>
    </svg>
  );
}

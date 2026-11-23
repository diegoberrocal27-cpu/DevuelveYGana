// Íconos de las 4 categorías y otros de apoyo del rediseño (SVG simple, sin librerías).

type Props = { className?: string };

const comunes = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoCategoria({ categoria, className = "h-7 w-7" }: Props & { categoria: string }) {
  switch (categoria) {
    case "celular":
      return (
        <svg {...comunes} className={className}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...comunes} className={className}>
          <rect x="4" y="5" width="16" height="11" rx="1.5" />
          <path d="M2 19h20" />
        </svg>
      );
    case "cartera":
      return (
        <svg {...comunes} className={className}>
          <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Z" />
          <path d="M4 7l11-3v3" />
          <path d="M16 13.5h.01" />
        </svg>
      );
    case "dni":
      return (
        <svg {...comunes} className={className}>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M5.5 16a3 3 0 0 1 6 0" />
          <path d="M14 10h4.5M14 13.5h3" />
        </svg>
      );
    default:
      return (
        <svg {...comunes} className={className}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
  }
}

export function IconoUbicacion({ className = "h-7 w-7" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconoCamara({ className = "h-6 w-6" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function IconoFlecha({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconoEscudo({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconoReloj({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconoAtras({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function IconoMas({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

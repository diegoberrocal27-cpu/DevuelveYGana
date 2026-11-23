// Íconos simples en SVG para el menú inferior (sin librerías externas).

type Props = { className?: string };

const comunes = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoInicio({ className = "h-6 w-6" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

export function IconoPerdi({ className = "h-6 w-6" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
      <path d="M11 8v3.5" />
      <path d="M11 14h.01" />
    </svg>
  );
}

export function IconoEncontre({ className = "h-6 w-6" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <path d="m9 10 2 2 4-4" />
    </svg>
  );
}

export function IconoPerfil({ className = "h-6 w-6" }: Props) {
  return (
    <svg {...comunes} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

type PropiedadesDeMarca = {
  oscura?: boolean;
};

export function Marca({ oscura = false }: PropiedadesDeMarca) {
  const colorBase = oscura ? "text-white" : "text-tinta";

  return (
    <span
      className={`font-titulo text-base font-bold tracking-tight sm:text-xl ${colorBase}`}
    >
      Devuelve
      <span className="text-turquesa">y</span>
      Gana
    </span>
  );
}

export function SimboloDePin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label="Pin de ubicación con una marca de verificación"
    >
      <path
        d="M60 8C32 8 12 28 12 54c0 30 48 78 48 78s48-48 48-78C108 28 88 8 60 8Z"
        fill="#1b2535"
      />
      <path d="M49 108 60 132l11-24Z" fill="#5ba8a0" />
      <circle cx="60" cy="54" r="27" fill="#ffffff" />
      <path
        d="m46 55 10 10 20-23"
        fill="none"
        stroke="#5ba8a0"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { CATEGORIAS } from "@/lib/catalogos";
import { estiloError, estiloEtiqueta } from "./estilosCampo";
import { IconoCategoria } from "./iconosCategoria";

type Props = {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  error?: string;
  name?: string;
};

/** Las 4 categorías como opciones grandes para tocar (radio accesible con teclado). */
export default function SelectorCategoriaVisual({ etiqueta, valor, onCambiar, error, name = "categoria" }: Props) {
  const idError = error ? `${name}-error` : undefined;

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={idError}>
      <legend className={`${estiloEtiqueta} mb-2`}>
        {etiqueta}
        <span className="text-error"> *</span>
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIAS.map((categoria) => {
          const elegida = valor === categoria.valor;
          return (
            <label
              key={categoria.valor}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-superficie px-3 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-turquesa ${
                elegida ? "border-turquesa-oscuro bg-turquesa-claro" : error ? "border-error" : "border-borde hover:border-turquesa"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={categoria.valor}
                checked={elegida}
                onChange={() => onCambiar(categoria.valor)}
                className="sr-only"
              />
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  elegida ? "bg-turquesa-oscuro text-white" : "bg-turquesa-claro text-turquesa-oscuro"
                }`}
              >
                <IconoCategoria categoria={categoria.valor} className="h-6 w-6" />
              </span>
              <span className="font-semibold">{categoria.etiqueta}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={idError} className={estiloError}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

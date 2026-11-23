import { useState, type ChangeEvent, type FormEvent } from "react";
import { hayErrores, validar, type Errores, type Regla } from "./validacion";

type Elemento = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Formulario base: guarda los valores, valida con las reglas y muestra los errores.
 * Lo usan HU-02 (pérdida) y HU-03 (hallazgo).
 */
export function useFormulario<Campo extends string>(
  valoresIniciales: Record<Campo, string>,
  reglas: Partial<Record<Campo, Regla[]>>,
) {
  const [valores, setValores] = useState(valoresIniciales);
  const [errores, setErrores] = useState<Errores<Campo>>({});

  function cambiar(evento: ChangeEvent<Elemento>) {
    const campo = evento.target.name as Campo;
    const valor = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    // Al corregir un campo, su error desaparece.
    if (errores[campo]) {
      setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
    }
  }

  function enviar(alSerValido: (valores: Record<Campo, string>) => void) {
    return (evento: FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const nuevosErrores = validar(valores, reglas);
      setErrores(nuevosErrores);
      if (!hayErrores(nuevosErrores)) alSerValido(valores);
    };
  }

  function reiniciar() {
    setValores(valoresIniciales);
    setErrores({});
  }

  return { valores, errores, cambiar, enviar, reiniciar };
}

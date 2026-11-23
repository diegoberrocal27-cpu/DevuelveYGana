const MINUTO_MS = 60_000;

export const POLITICA_POR_DEFECTO = {
  vigenciaMs: 5 * MINUTO_MS,
  maximoDeErrores: 3,
  bloqueoMs: 15 * MINUTO_MS,
  esperaEntreEnviosMs: MINUTO_MS,
};

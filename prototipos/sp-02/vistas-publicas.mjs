const CAMPOS_PUBLICOS_HALLAZGO = ["id", "categoria", "distrito", "dia", "estado"];
const CAMPOS_PUBLICOS_PERDIDA = ["id", "categoria", "distrito", "fecha", "estado"];

function elegirCampos(registro, campos) {
  return Object.fromEntries(campos.map((campo) => [campo, registro[campo]]));
}

export const vistaPublicaDeHallazgo = (hallazgo) => elegirCampos(hallazgo, CAMPOS_PUBLICOS_HALLAZGO);
export const vistaPublicaDePerdida = (perdida) => elegirCampos(perdida, CAMPOS_PUBLICOS_PERDIDA);

const CATEGORIAS = ["celular", "laptop", "cartera", "dni"];
const ETIQUETAS = ["correcto", "incorrecto"];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const LARGO_MINIMO_DESCRIPCION = 20;
const MAXIMO_DIAS_ENTRE_PERDIDA_Y_HALLAZGO = 2;
const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

const TOTAL_DE_PARES = 30;
const CORRECTOS_ESPERADOS = 15;
const INCORRECTOS_ESPERADOS = 15;
const MINIMO_DE_CARTERAS_SIN_MARCA = 2;

const DATOS_PERSONALES = [/\d{8,}/, /\S+@\S+\.\S+/];

export function crearVecindad(listaDeVecinos) {
  const clave = (a, b) => [a, b].sort().join("|");
  const vecinos = new Set(listaDeVecinos.map(([a, b]) => clave(a, b)));
  return (a, b) => a === b || vecinos.has(clave(a, b));
}

function esFechaReal(texto) {
  if (typeof texto !== "string" || !FORMATO_FECHA.test(texto)) return false;
  return new Date(`${texto}T00:00:00Z`).toISOString().slice(0, 10) === texto;
}

function diasEntre(fechaInicial, fechaFinal) {
  const inicio = Date.parse(`${fechaInicial}T00:00:00Z`);
  const fin = Date.parse(`${fechaFinal}T00:00:00Z`);
  return (fin - inicio) / MILISEGUNDOS_POR_DIA;
}

function esTextoNoVacio(valor) {
  return typeof valor === "string" && valor.trim() !== "";
}

function validarObjeto(objeto, lugar) {
  if (typeof objeto !== "object" || objeto === null) return [`${lugar}: falta el objeto`];
  const errores = [];
  const { marca, color, distrito, fecha, descripcion } = objeto;
  if (marca !== null && !esTextoNoVacio(marca)) errores.push(`${lugar}: la marca debe ser texto o null`);
  if (!esTextoNoVacio(color)) errores.push(`${lugar}: falta el color`);
  if (!esTextoNoVacio(distrito)) errores.push(`${lugar}: falta el distrito`);
  if (!esFechaReal(fecha)) errores.push(`${lugar}: la fecha no es válida (AAAA-MM-DD)`);
  if (!esTextoNoVacio(descripcion) || descripcion.length < LARGO_MINIMO_DESCRIPCION) {
    errores.push(`${lugar}: la descripción es muy corta`);
  } else if (DATOS_PERSONALES.some((patron) => patron.test(descripcion))) {
    errores.push(`${lugar}: la descripción parece tener un dato personal`);
  }
  return errores;
}

function validarEstructura(par) {
  const errores = [];
  if (!esTextoNoVacio(par.id)) errores.push("hay un par sin id");
  if (!ETIQUETAS.includes(par.etiqueta)) errores.push(`${par.id}: la etiqueta debe ser correcto o incorrecto`);
  if (!CATEGORIAS.includes(par.categoria)) errores.push(`${par.id}: la categoría no es válida`);
  errores.push(...validarObjeto(par.perdida, `${par.id} pérdida`));
  errores.push(...validarObjeto(par.hallazgo, `${par.id} hallazgo`));
  return errores;
}

function validarOrdenDeFechas(par) {
  const { perdida, hallazgo } = par;
  if (!esFechaReal(perdida?.fecha) || !esFechaReal(hallazgo?.fecha)) return [];
  if (diasEntre(perdida.fecha, hallazgo.fecha) < 0) {
    return [`${par.id}: el hallazgo tiene fecha anterior a la pérdida`];
  }
  return [];
}

function diferenciasEntre(par, sonVecinos) {
  const { perdida, hallazgo } = par;
  const diferencias = [];
  if (perdida.color !== hallazgo.color) diferencias.push("color");
  if (perdida.marca !== null && hallazgo.marca !== null && perdida.marca !== hallazgo.marca) {
    diferencias.push("marca");
  }
  if (!sonVecinos(perdida.distrito, hallazgo.distrito)) diferencias.push("distrito");
  return diferencias;
}

function validarEtiqueta(par, sonVecinos) {
  const diferencias = diferenciasEntre(par, sonVecinos);
  if (par.etiqueta === "incorrecto" && diferencias.length === 0) {
    return [`${par.id}: está marcado incorrecto pero no difiere en color, marca ni distrito`];
  }
  if (par.etiqueta !== "correcto") return [];

  const errores = [];
  if (diferencias.length > 0) {
    errores.push(`${par.id}: está marcado correcto pero difiere en ${diferencias.join(", ")}`);
  }
  const dias = diasEntre(par.perdida.fecha, par.hallazgo.fecha);
  if (dias > MAXIMO_DIAS_ENTRE_PERDIDA_Y_HALLAZGO) {
    errores.push(`${par.id}: está marcado correcto pero pasan ${dias} días entre pérdida y hallazgo`);
  }
  return errores;
}

const REGLAS_DE_PAR = [
  (par) => validarEstructura(par),
  (par) => validarOrdenDeFechas(par),
];

const REGLAS_DE_PAR_CON_VECINDAD = [validarEtiqueta];

function contar(pares, condicion) {
  return pares.filter(condicion).length;
}

function validarCantidades(pares) {
  const errores = [];
  const correctos = contar(pares, (par) => par.etiqueta === "correcto");
  const incorrectos = contar(pares, (par) => par.etiqueta === "incorrecto");
  if (pares.length !== TOTAL_DE_PARES) errores.push(`se esperaban ${TOTAL_DE_PARES} pares y hay ${pares.length}`);
  if (correctos !== CORRECTOS_ESPERADOS) errores.push(`se esperaban ${CORRECTOS_ESPERADOS} correctos y hay ${correctos}`);
  if (incorrectos !== INCORRECTOS_ESPERADOS) errores.push(`se esperaban ${INCORRECTOS_ESPERADOS} incorrectos y hay ${incorrectos}`);
  return errores;
}

function validarIdsUnicos(pares) {
  const vistos = new Set();
  const repetidos = new Set();
  for (const { id } of pares) {
    if (vistos.has(id)) repetidos.add(id);
    vistos.add(id);
  }
  return [...repetidos].map((id) => `el id ${id} está repetido`);
}

function validarCategorias(pares) {
  const errores = [];
  for (const categoria of CATEGORIAS) {
    for (const etiqueta of ETIQUETAS) {
      const hay = pares.some((par) => par.categoria === categoria && par.etiqueta === etiqueta);
      if (!hay) errores.push(`no hay ningún par ${etiqueta} de ${categoria}`);
    }
  }
  return errores;
}

function validarCarterasSinMarca(pares) {
  const sinMarca = contar(
    pares,
    (par) => par.categoria === "cartera" && (par.perdida?.marca === null || par.hallazgo?.marca === null),
  );
  if (sinMarca >= MINIMO_DE_CARTERAS_SIN_MARCA) return [];
  return [`se necesitan al menos ${MINIMO_DE_CARTERAS_SIN_MARCA} pares de cartera sin marca y hay ${sinMarca}`];
}

const REGLAS_DEL_CONJUNTO = [
  validarCantidades,
  validarIdsUnicos,
  validarCategorias,
  validarCarterasSinMarca,
];

export function validarPares(pares, sonVecinos) {
  const errores = [];
  for (const par of pares) {
    const erroresDeEstructura = REGLAS_DE_PAR.flatMap((regla) => regla(par));
    errores.push(...erroresDeEstructura);
    if (erroresDeEstructura.length === 0) {
      errores.push(...REGLAS_DE_PAR_CON_VECINDAD.flatMap((regla) => regla(par, sonVecinos)));
    }
  }
  errores.push(...REGLAS_DEL_CONJUNTO.flatMap((regla) => regla(pares)));
  return errores;
}

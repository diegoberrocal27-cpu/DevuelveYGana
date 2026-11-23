export function crearAlmacenEnMemoria({ perdidas = [], rasgos = [], hallazgos = [] } = {}) {
  const alertas = [];

  return {
    listarPerdidas: () => perdidas,
    listarHallazgos: () => hallazgos,
    listarAlertas: () => alertas,
    buscarHallazgo: (id) => hallazgos.find((hallazgo) => hallazgo.id === id),
    guardarHallazgo: (hallazgo) => hallazgos.push(hallazgo),
    guardarAlerta: (alerta) => alertas.push(alerta),
    buscarPerdidasPorDniHmac: (hmac) =>
      rasgos
        .filter((rasgo) => rasgo.tipo === "dni_hmac" && rasgo.valor === hmac)
        .map((rasgo) => perdidas.find((perdida) => perdida.id === rasgo.perdida_id))
        .filter(Boolean),
  };
}

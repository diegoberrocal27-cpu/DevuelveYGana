export function crearEnviadorEnMemoria() {
  const enviados = [];

  return {
    enviar: async (mensaje) => void enviados.push(mensaje),
    enviados,
    ultimoCodigo: () => enviados.at(-1)?.codigo,
  };
}

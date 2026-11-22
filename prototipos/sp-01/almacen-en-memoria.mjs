export function crearAlmacenEnMemoria() {
  const registros = new Map();

  return {
    buscar: async (celular) => registros.get(celular),
    guardar: async (celular, registro) => void registros.set(celular, registro),
    borrar: async (celular) => void registros.delete(celular),
    verTodo: () => [...registros.values()],
  };
}

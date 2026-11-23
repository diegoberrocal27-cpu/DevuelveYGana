/**
 * Reduce la foto en el celular antes de enviarla (lado mayor de 1600 px, JPEG).
 * - Una foto de celular pesa de 3 a 6 MB; reducida queda en unos cientos de KB.
 * - Al redibujarla se pierden los metadatos, incluida la ubicación GPS.
 * - NO la difumina: eso lo hace el servidor (HU-03).
 * Si el navegador no puede procesarla, devuelve el archivo tal cual y el servidor decide.
 */
export async function reducirFoto(archivo: File, ladoMaximo = 1600, calidad = 0.85): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();

    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("sin imagen"))), "image/jpeg", calidad),
    );
  } catch {
    return archivo;
  }
}

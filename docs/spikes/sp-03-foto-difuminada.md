# SP-03 Foto difuminada en el servidor

Jira: SCRUM-37 · Sprint 0 · para HU-03

## Decisión

La copia que ve el dueño emparejado se genera en el servidor con `sharp`: se reduce a **320 px de ancho**, se aplica un **difuminado de 10** y se guarda como JPEG de calidad 55. La función es `difuminarFoto()` en `prototipos/sp-03/difuminar.mjs`.

- El público no ve ninguna foto.
- La original va al bucket privado `fotos-originales` y la copia al bucket `fotos-difuminadas`.
- La copia no trae metadatos: se pierden la ubicación y el modelo del celular que guarda la foto original.

## Qué se midió

Foto de prueba de 5.8 MB (4000 x 3000), 10 repeticiones.

| Medida | Resultado | Meta |
|---|---|---|
| Tiempo por foto | mediana 67 a 109 ms, peor caso 123 ms | pocos segundos |
| Peso de la copia | de 2 a 4 KB según la foto | cientos de KB |

El tiempo es del servidor de pruebas. En Vercel dependerá de la memoria de la función, pero hay margen de más de 20 veces.

## Se puede leer algo de la copia

Se probó con una foto con texto (número de DNI e IMEI) y otra con un rostro. Los resultados salen de `comprobar_legibilidad.py`.

| Ancho | Difuminado | OCR lee los números | Detector encuentra la cara | Peso con cara |
|---|---|---|---|---|
| 640 | 0 | sí | sí | 31 KB |
| 640 | 8 | no | sí | 14 KB |
| 640 | 14 | no | sí | 11 KB |
| 640 | 20 | no | no | 10 KB |
| 320 | 0 | sí | sí | 11 KB |
| 320 | 6 | no | sí | 5 KB |
| **320** | **10** | **no** | **no** | **4 KB** |

Dos aprendizajes:

1. **Reducir el tamaño solo no alcanza.** Con 320 px y sin difuminar, el OCR sigue leyendo el DNI.
2. **Que el OCR falle no prueba que una persona no pueda leer.** Mirando las imágenes, con 640 px y difuminado 8 todavía se adivinan los primeros dígitos. Por eso se eligió 320 px con 10: es la primera combinación donde el texto no se lee a simple vista, el OCR no lee nada y el detector no encuentra la cara.

Con la copia elegida el objeto se reconoce por forma y color, que es lo que necesita el dueño. De una persona se ve la silueta y el cabello, pero no los rasgos.

## Qué no se pudo comprobar

- **Las fotos de prueba no son fotos reales de celular.** Una es generada con ruido y la otra es una foto de archivo de dominio público. Antes de cerrar HU-03 conviene repetir la prueba con 5 fotos reales del equipo (un celular, una cartera, un DNI, una laptop y una con rostro).
- **El detector de rostros es básico** (Haar, de OpenCV). No se pudo bajar uno más fuerte porque la descarga estaba bloqueada. Un detector moderno podría encontrar una silueta donde este no.
- **El acceso a la foto original no se probó en Supabase real.** En T-02 los dos buckets son privados y no tienen políticas para usuarios, y eso se probó contra PostgreSQL común con un simulador de Supabase. La prueba de abrir la ruta de la original sin permiso queda para cuando haya un proyecto Supabase de desarrollo.

## A confirmar con el equipo

El bucket `fotos-originales` de T-02 acepta archivos de hasta **5 MB**, pero una foto de celular pesa de 3 a 6 MB. Una foto de 6 MB sería rechazada. Propuesta: subir el límite a 10 MB en una migración nueva dentro de HU-03, sin tocar la de T-02.

## Para HU-03

1. Validar tipo de archivo y peso antes de procesar.
2. Procesar con `difuminarFoto()`, que ya rechaza archivos que no son imagen y fotos de más de 60 millones de píxeles.
3. Guardar primero la original y después la copia. Si falla la copia, no publicar el hallazgo.
4. Las rutas se arman con el identificador del hallazgo, nunca con el nombre que trae el archivo.

## Cómo correrlo

```
cd prototipos/sp-03
npm install
npm test
npm run medir
```

La comprobación de legibilidad necesita Python con `opencv-python`, `pytesseract`, `scikit-image` y el programa `tesseract`:

```
python3 preparar_cara.py /tmp/sp03
node variantes.mjs /tmp/sp03
python3 comprobar_legibilidad.py /tmp/sp03 <ruta a haarcascade_frontalface_default.xml>
```

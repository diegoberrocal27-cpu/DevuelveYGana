# Pares de prueba para el emparejamiento (T-05)

Material con el que SP-04 y HU-04 comprueban el algoritmo. Todos los datos son inventados y no identifican a nadie.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `pares.json` | Los 30 pares pérdida–hallazgo con su etiqueta |
| `distritos.json` | Distritos que se consideran vecinos |
| `validador.mjs` | Reglas que revisan los pares |
| `validar.mjs` | Corre el validador sobre `pares.json` |
| `validador.test.mjs` | Pruebas del validador |

## Cómo usarlo

```
node datos/pares-de-prueba/validar.mjs
node --test datos/pares-de-prueba/validador.test.mjs
```

## Formato de cada par

```json
{
  "id": "celular-01",
  "etiqueta": "correcto",
  "categoria": "celular",
  "perdida":  { "marca": "Samsung", "color": "negro", "distrito": "Ayacucho", "fecha": "2026-11-03", "descripcion": "..." },
  "hallazgo": { "marca": "Samsung", "color": "negro", "distrito": "San Juan Bautista", "fecha": "2026-11-04", "descripcion": "..." }
}
```

`marca` es `null` cuando el objeto no tiene marca visible. En DNI, `color` es el de la funda o el portadocumentos.

## Reparto

| Categoría | Correctos | Incorrectos |
|---|---|---|
| celular | 4 | 4 |
| laptop | 4 | 4 |
| cartera | 4 | 4 |
| dni | 3 | 3 |
| Total | 15 | 15 |

Cinco pares de cartera tienen alguna marca vacía: `cartera-01`, `02`, `04`, `05` y `06`.

## Qué comprueba el validador

- Un par **correcto** tiene el mismo color, marca compatible, distrito igual o vecino, y como máximo 2 días entre pérdida y hallazgo.
- Un par **incorrecto** difiere al menos en color, en marca (solo si ambas están declaradas) o en distrito no vecino.
- El hallazgo no puede ser anterior a la pérdida.
- Las descripciones no llevan números largos ni correos.
- Hay 30 pares, 15 y 15, con ids únicos, ambas etiquetas en cada categoría y al menos 2 pares de cartera sin marca.

El validador solo revisa las reglas objetivas. Que la descripción de un par correcto se lea como el mismo objeto es algo que decide quien revisa.

## Revisión de las etiquetas

Se leyeron los 30 pares completos y las etiquetas son razonables: los correctos describen el mismo objeto con otras palabras, y los incorrectos se parecen pero difieren en color, marca o distrito.

- Revisaron: Any Andrea Ucharima Quispe y Claude, por decisión de Any de hacer la revisión entre ellas.
- Fecha: 2026-11-22

La lista de distritos vecinos de `distritos.json` es una propuesta. Si el equipo conoce mejor la zona, se corrige ahí y el validador la usa sin más cambios.

import { costoPorUsuarioEnSoles, usuariosQueEntranEnElPresupuesto } from "./costos.mjs";

const CANALES = ["sms", "whatsapp", "correo"];

console.log("canal      soles por usuario   usuarios por mes con S/ 150   con la mitad (S/ 75)");
for (const canal of CANALES) {
  const porUsuario = costoPorUsuarioEnSoles(canal).toFixed(2).padStart(10);
  const completo = String(usuariosQueEntranEnElPresupuesto(canal)).padStart(12);
  const mitad = String(usuariosQueEntranEnElPresupuesto(canal, 75)).padStart(20);
  console.log(`${canal.padEnd(10)} ${porUsuario} ${completo} ${mitad}`);
}

# SCRUM-12 · Activar el registro en desarrollo

1. En Supabase de **desarrollo**, aplica las migraciones de T-02 y luego `supabase/migrations/20261123000001_registro.sql`. Si T-02 ya está aplicado, ejecuta solamente el archivo nuevo en SQL Editor.
2. En Authentication habilita acceso con correo y enlaces mágicos. Añade `http://localhost:3000/perfil` (y la URL de desarrollo en Vercel con /perfil) a las URL de redirección autorizadas. Configura SMTP para entregar enlaces a los correos del equipo. La plantilla del enlace debe conservar `{{ .ConfirmationURL }}`.
3. En Twilio configura un remitente WhatsApp y una plantilla de autenticación aprobada con una variable para el código. En la plantilla indica cinco minutos de vigencia.
4. Crea `web/.env.local` con los valores siguientes. Configura los equivalentes del entorno de desarrollo en Vercel. Las dos claves NEXT_PUBLIC son públicas. Mantén las demás en el servidor.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OTP_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+
TWILIO_CONTENT_SID=
```

Genera OTP_SECRET una vez por entorno con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Usa la clave publicable o anon de Supabase como NEXT_PUBLIC_SUPABASE_ANON_KEY. Completa el remitente con el número autorizado en Twilio.

5. Desde `web`, ejecuta `npm ci`, `npm test`, `npm run lint` y `npm run dev`. Abre **Mi perfil**. Registra correo, celular y distrito. Abre el enlace de acceso en el mismo navegador para continuar con los datos ingresados. Si lo abres en otro navegador, confirma el celular y distrito allí. Introduce el código recibido por WhatsApp. Para volver a entrar usa **Ya tengo una cuenta**.

## Integración con las demás historias

La sesión es de Supabase Auth. El enlace de correo permite entrar en estado pendiente. Solo el código enviado al celular establece `usuarios.verificado`. Los intentos y vencimientos se controlan en PostgreSQL; la cuenta puede retomar la verificación tras volver a iniciar sesión. La clave única de T-02 impide asociar el celular a dos perfiles.

Las inserciones de pérdidas y hallazgos con el JWT del usuario están protegidas por RLS. T-02 todavía no trae una tabla ni una operación de reclamos. Al crearla, usa `public.cuenta_habilitada()` como condición de inserción en RLS. En cualquier operación con service_role que publique o reclame, valida la sesión de la persona y exige la misma condición con su JWT antes de escribir: service_role omite RLS. No expongas service_role al navegador.

Las pruebas automáticas usan PostgreSQL embebido y datos ficticios. Para verificar la entrega real, usa las cuentas de desarrollo y un celular autorizado del equipo.

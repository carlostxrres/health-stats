# Próximos pasos

Este documento recoge el plan para las secciones 2-5 de `docs/todo.md` (IA en `/log`, sync con URL query, dividir el registro de sueño, ideas de automatización), que quedaron fuera de la primera pasada de implementación (rutas, navegación y acceso público — ya construida).

Da por hecho el estado actual del código:

- `/log` y `/log/:id` (`src/pages/LogPage.tsx`) ya soportan crear y **editar** cualquiera de los 7 tipos de entrada, con el mismo mecanismo: el formulario recibe `initialData` y `entryId`, y si hay `entryId` hace `PATCH` en vez de `POST`.
- Cada formulario (`src/components/forms/*Form.tsx`) ya sabe convertir un objeto `XInitialData` en `defaultValues` de `react-hook-form`. **Este mismo mecanismo es el punto de enganche natural tanto para la IA como para el sync con URL** — ambas features, en el fondo, solo necesitan producir un objeto con esa forma y pasarlo como `initialData`.
- `GET /api/entries` (listado unificado) y `GET /api/entries/:id` (resuelve el tipo automáticamente) ya existen — útiles como referencia de "un objeto por tipo" para diseñar payloads.
- `db/schema/sources.ts` ya modela la procedencia del dato (`manual` | `api` | `import`) con `source`/`externalId` en las 7 tablas de dominio, pensado exactamente para automatizaciones futuras (upsert idempotente por `(source, externalId)`).

---

## Fase B — IA en `/log`

**Qué pide el todo:** un input flotante en `/log` donde escribes texto libre ("peso 87,75kg", "he comido tal") y la IA rellena el formulario. El usuario sigue siendo quien hace submit — la IA nunca guarda directamente.

**Decisiones a tomar (no bloqueantes, pero conviene fijarlas antes de picar código):**

1. **¿La IA también elige el tipo de entrada, o solo rellena campos del tipo ya seleccionado?** Los dos ejemplos del todo (peso → métrica, comida → meal) sugieren que sí debe elegir el tipo — es decir, la IA hace de clasificador + extractor a la vez, no solo extractor. Esto es más ambicioso que "autocompletar un formulario fijo": el prompt debe listar los 7 tipos con sus schemas y dejar que el modelo elija.
2. **Proveedor de IA:** hoy no hay ninguna SDK ni variable de entorno de IA en el proyecto (`.env.example` solo tiene Supabase/Postgres). Recomendación: Anthropic (Claude), usando **tool use / structured output** para forzar que la respuesta encaje con el zod schema del tipo elegido, en vez de parsear texto libre. Modelo pequeño (Haiku) es suficiente para esta tarea de extracción — no hace falta un modelo grande.
3. **Nuevo endpoint:** `api/ai/parse-entry.ts`, `POST`, protegido (hereda auth de `createHandler` automáticamente, ya que solo `/log` es privado y este endpoint solo se llama desde ahí). Payload de entrada: `{ text: string }`. Payload de salida: `{ type: EntryTypeCode, data: <XInitialData del tipo> }` — **misma forma que ya devuelve `GET /api/entries/:id`**, así el frontend reutiliza exactamente el mismo camino de "recibir `{type, data}` y pasarlo como `initialData` al formulario".
4. **Frontend:** un input flotante fijo en la parte inferior de `LogPage.tsx` (parecido a un chat). Al enviar: llama al endpoint, y con la respuesta cambia `selected` (el tipo) e `initialData`, igual que hace hoy la carga por `:id`. Como los formularios ya soportan remount vía `key={id ?? selected}`, esto ya "simplemente funciona" sin tocar los 7 formularios de nuevo.
5. **No auto-guardar.** El usuario revisa el formulario ya rellenado y pulsa "Guardar" como siempre — el todo lo pide explícitamente.
6. **Procedencia del dato:** la entrada la sigue creando el usuario (sesión autenticada, botón pulsado por él), así que `source` puede seguir siendo `'manual'`. Si en el futuro interesa distinguir "rellenado por IA" de "escrito a mano" para analítica, se podría añadir un campo `metadata`/`notes` marcándolo, pero no es necesario para la v1.

**Fuera de alcance explícito para la v1:** entrada por imagen o audio (el todo ya lo pospone), y que la IA pueda crear/editar entradas existentes (`/log/:id`) — de momento solo modo creación.

---

## Fase C — Sync de `/log` con URL query

**Qué pide el todo:** que `/log` acepte query params para precargar el formulario — útil para (a) no perder lo ya escrito si se recarga la página, (b) que otras apps (recetas, planificación de comidas) enlacen directamente con datos precargados, (c) una interfaz alternativa para que la IA "comunique su veredicto" sin pasar por el endpoint de la Fase B.

**Los dos problemas que el propio todo señala, resueltos:**

- **Fuente de la verdad en modo edición:** se evita el conflicto por diseño — el sync con URL solo aplica en **modo creación** (`/log`, sin `:id`). `/log/:id` sigue teniendo la fila de la base de datos como única fuente de verdad, sin mezclarla con query params.
- **Representación de imágenes en la URL:** no van en la URL. V1 excluye los campos de fotos del sync — las fotos siempre se añaden a mano una vez se aterriza en `/log`. Si en el futuro hace falta, la vía sería un query param `photoUrl` (URL remota) que el backend descarga y sube a Storage, pero no es necesario para arrancar esto.

**Diseño recomendado:**

1. `/log?type=meal&title=...&eatenAt=...` — el `type` es obligatorio para que `LogPage` sepa qué formulario mostrar (si no está, se comporta como hoy: selector visible, tipo `metric` por defecto).
2. Al montar, si hay query params, se parsean a un objeto con la misma forma que `XInitialData` y se pasa como `initialData` — **reutilizando tal cual** el mecanismo que ya usan tanto el modo edición como (si se construye antes) la Fase B. Los tres caminos (edición por `:id`, IA, URL query) convergen en el mismo punto de entrada de los formularios.
3. Sync en un solo sentido para la v1: **URL → formulario al cargar**, no continuo mientras el usuario escribe. Sincronizar continuamente complica el manejo de `datetime-local` (no son valores URL-safe sin codificar) y no aporta gran cosa frente a la necesidad real (deep links desde otras apps).
4. Como `/log` requiere sesión, un link con datos precargados solo sirve si quien lo abre eres tú (o quien tenga tu login) — coherente con el modelo de acceso ya decidido.

---

## Fase D — Dividir el registro de sueño en dos

**Qué pide el todo:** poder apuntar "me voy a dormir" y "me desperté" por separado, sin obligar a tener ambos datos a la vez, porque cada uno tiene valor propio (regularidad de horarios) y porque hoy si solo recuerdas apuntar uno de los dos, lo pierdes.

**Recomendación:** en vez de partir `sleep_sessions` en dos tablas, basta con **relajar las restricciones actuales** y apoyarse en la edición que ya existe desde la Fase A:

1. **Esquema** (`db/schema/periods.ts`): `wentToBedAt` y `wokeUpAt` pasan de `NOT NULL` a nullable, y el `check` `wokeUpAt > wentToBedAt` se sustituye por uno condicional (`wokeUpAt IS NULL OR wentToBedAt IS NULL OR wokeUpAt > wentToBedAt`) o se retira de la BD y se deja solo en Zod. Requiere migración (`pnpm db:generate` + `pnpm db:migrate`).
2. **Validación** (`shared/validation/sleepSessions.ts`): ambos campos opcionales, con un `superRefine` que exige que **al menos uno** esté presente, y que solo compara `wokeUpAt > wentToBedAt` cuando los dos vienen informados.
3. **Flujo de uso:** "Me voy a dormir" crea una fila con solo `wentToBedAt`. A la mañana siguiente, en vez de crear una fila nueva, la acción natural es **editar esa misma fila** (ya es posible: `/log/:id` con `entryId` hace `PATCH`) para añadir `wokeUpAt`. Como mejora de UX opcional (no bloqueante): un atajo en `/log` tipo "Continuar sesión de sueño abierta" que busque la última fila con `wokeUpAt IS NULL` y lleve directo a su edición, en vez de obligar a pasar por `/logs` para encontrarla.
4. **Duración calculada:** solo tiene sentido cuando ambos campos están presentes. Esto afecta a `fetchSleepSessions` en `api/entries/index.ts`, que hoy asume los dos no-nulos al calcular `hours` — hay que añadir el guard (`title = "Sueño"` a secas, sin horas, cuando falta `wokeUpAt`).
5. Con esto ya resuelto, un gráfico futuro de "hora de irme a dormir cada noche" (mencionado en el todo como motivación) se puede construir directamente sobre `sleep_sessions.wentToBedAt`, sin depender de que `wokeUpAt` también exista.

---

## Fase E — Ideas para automatizar la entrada de datos

Brainstorm pedido en el todo, organizado por lo que alimentaría cada uno. El patrón de implementación para cualquiera de estas ya está anticipado en el esquema (`sources` + `externalId` con índice único, pensado para upserts idempotentes) y en el plan de arquitectura original (Fase 3: OAuth2 + `api/cron/<fuente>-sync.ts` protegido con `CRON_SECRET` vía Vercel Cron) — no hace falta rediseñar esa parte, solo repetirla por integración.

- **Peso / composición corporal:** Withings (ya contemplado como ejemplo en el README y en `sources.ts`), alternativas: Renpho, Eufy Smart Scale.
- **Sueño, HRV, temperatura corporal:** Oura Ring, Whoop, Apple Watch (vía export de Apple Health o una app puente con HealthKit), Garmin.
- **Entrenamientos:** Strava API, Garmin Connect, Apple Health (workouts).
- **Pasos, distancia, horas al aire libre:** agregados diarios de Apple Health / Google Fit (vía export periódico o una app puente), o un atajo de iOS Shortcuts programado que llame a la API una vez al día con los totales del día.
- **Presión arterial:** tensiómetros conectados (Withings BPM, Omron) con API propia — mismo patrón que la báscula.
- **Glucosa:** APIs de monitores continuos (Freestyle Libre, Dexcom) — alto valor si usas uno, pero son integraciones más específicas/de nicho.
- **Comidas:** import desde MyFitnessPal o Cronometer si ya las usas para trackear macros; a más largo plazo, un escaneo de código de barras como atajo de entrada (sigue siendo manual, pero más rápido que teclear).
- **Horas de trabajo:** inferidas de Google Calendar (eventos marcados como trabajo) vía su API.
- **Horas de trabajo / estado subjetivo:** mejor no automatizar del todo — son datos donde la introspección importa. Como mucho, un recordatorio push diario para no olvidarte de apuntarlo, no un cálculo automático.

**Por dónde empezar:** Withings es la integración más señalada ya desde el README original y tiene la API OAuth2 mejor documentada de la lista — es la candidata natural para ser la primera automatización real, y validaría de paso todo el patrón `sources`/`externalId`/cron para las siguientes.

---

## Orden sugerido

1. **Fase D (sueño)** — la más pequeña, no añade dependencias nuevas, y ya se apoya al 100% en la edición construida en la Fase A.
2. **Fase C (URL query)** — diseño ya resuelto arriba, reutiliza el mismo mecanismo de `initialData`.
3. **Fase B (IA)** — la de mayor alcance (nueva dependencia externa, decisión de proveedor, diseño de prompt), pero se beneficia de construirse después de C porque ambas comparten el mismo punto de entrada a los formularios.
4. **Fase E** — no es una fase de código, es una lista para consultar cuando quieras elegir la primera integración automática de verdad.

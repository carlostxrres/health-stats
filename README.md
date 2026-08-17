Quiero registrar todos los datos posibles sobre mi salud en una sola base de datos.

Más adelante podría visualizarlo en una web, donde podría filtrar por tipos de entrada y otras variables, y ver gráficos, y cosas así.

Pero de momento quiero centrarme en hacer una base de datos mantenible y escalable, y una web sencilla para hacer las entradas manuales a la base de datos.

## Indicadores para seguir

Se me ocurren estos tipos de entrada y sus columnas:

- Peso
  - medición
  - fecha y hora
- Perímetro corporal: cintura
  - medición
  - fecha y hora
- Perímetro corporal: pecho
  - medición
  - fecha y hora
- Perímetro corporal: brazo
  - medición
  - fecha y hora
- Perímetro corporal: muslo
  - medición
  - fecha y hora
- Perímetro corporal: etc
  - medición
  - fecha y hora
- % de grasa corporal
  - medición
  - fecha y hora
- Biomarcadores: Presión arterial
  - medición
  - fecha y hora
- Biomarcadores: Frecuencia cardíaca en reposo
  - medición
  - fecha y hora
- Biomarcadores: HRV
  - medición
  - fecha y hora
- Biomarcadores: Temperatura corporal
  - medición
  - fecha y hora
- Biomarcadores: Glucosa
  - medición
  - fecha y hora
- Foto corporal
  - fecha y hora
  - fotografía[]
  - descripción
- Alimentación (todo lo que tomo: comidas normales, snacks, café, alcohol...)
  - título
  - descripción
  - { ingrediente, cantidad }[]
  - fecha y hora
  - lugar
  - fotografía
- Medicamentos y suplementos
  - título
  - fecha y hora
  - lugar
- Sesión de entrenamiento / deporte
  - fecha y hora
  - tipo (fuerza, carrera, bici, caminar, etc)energía, estado de ánimo, estrés, dolor/molestias, hambre/saciedad...)
  - datos según tipo: distancia, series, repeticiones, peso...
  - duración
  - fotografía
- Estado subjetivo (energía, estado de ánimo, estrés, dolor/molestias, hambre/saciedad...)
  - fecha y hora
  - descripción

Datos que reflejan periodos:

- Sueño (tanto de noche como siestas)
  - Fecha y hora de acostarte
  - Fecha y hora de levantarte
  - Calidad subjetiva del sueño
  - Sensación al despertar (definir una escala del 1 al 5)
- Lesiones y enfermedades
  - Fecha y hora de la lesión/enfermedad
  - Fecha de la recuperación
  - Título
  - Descripción

Datos sobre días enteros:

- Horas al aire libre
- Pasos
- Distancia caminada
- Horas de trabajo

Otros tipos de indicador que podría querer añadir eventualmente, pero de momento no:

- VO2Max
- Test de Cooper
- Test de caminar (Rockport)
- Frecuencia cardíaca en reposo
- Analítica de sangre (serían muchos indicadores por separado)

## Automatización de las entradas

Hay algunos que tengo que entrar manualmente, como las comidas. Pero quiero que tantos como sean posibles sean automáticos. Por ejemplo, sé que hay básculas de Withings que tienen una API para acceder programáticamente a las mediciones. Una de las cosas que quiero hacer es automatizar todas las mediciones posibles.

Diseñemos un plan juntos.

## Arquitectura (Fase 0 + Fase 1)

- **Frontend:** React + Vite + shadcn/ui (SPA), en `src/`.
- **Backend:** funciones serverless de Vercel en `api/`, TypeScript.
- **Base de datos:** PostgreSQL en Supabase, esquema en `db/schema/` (Drizzle ORM). Ver `db/schema/metrics.ts` para el núcleo EAV (`metric_entries`) que cubre la mayoría de indicadores, y el resto de ficheros para las entidades con estructura propia (comidas, entrenamientos, sueño, lesiones, fotos).
- **Auth:** Supabase Auth, un único usuario (sin registro público).
- **Fotos:** se suben directamente desde el navegador a Supabase Storage (bucket `health-photos`).
- **Validación:** esquemas Zod compartidos entre frontend y backend en `shared/validation/`.

El plan completo (decisiones, esquema detallado, fases futuras) está en `/home/carlos/.claude/plans/lee-readme-md-y-ay-dame-ticklish-volcano.md`.

## Puesta en marcha

1. **Crear el proyecto en Supabase** (supabase.com/dashboard): anota la URL del proyecto, la `anon key` y la `service_role key` (Project Settings → API), y las connection strings de Postgres (Project Settings → Database): la del **pooler** (puerto 6543) y la **directa** (puerto 5432).
2. **Crear el bucket de Storage** `health-photos` (privado) y aplicar las políticas de `db/storage-policies.sql` (pégalas en el SQL editor de Supabase) para que los usuarios autenticados puedan leer/escribir en él.
3. **Crear el único usuario** manualmente en Authentication → Users, y desactivar "Allow new users to sign up" en Authentication → Settings.
4. **Configurar variables de entorno**: copia `.env.example` a `.env` y rellena los valores del paso 1.
5. **Instalar dependencias y aplicar el esquema:**
   ```
   pnpm install
   pnpm db:generate   # genera la migración inicial a partir del esquema
   pnpm db:migrate     # la aplica contra Supabase
   pnpm db:seed        # siembra sources, metric_definitions y workout_types
   ```
6. **Arrancar en local:** `pnpm dev` (frontend). Para probar las funciones de `api/` necesitas el CLI de Vercel (`pnpm dlx vercel dev`) con el proyecto enlazado y las mismas variables de entorno cargadas.
7. **Desplegar:** enlaza el repo a un proyecto de Vercel (`vercel link`) y configura las mismas variables de entorno en el dashboard de Vercel antes del primer deploy.


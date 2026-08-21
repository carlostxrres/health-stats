# To do

# Thinking

## Run React-Doctor

## /feed: make images expandable

Click to enlarge image.

Something like [this](https://www.nico.fyi/blog/easy-zoomable-image-with-shadcn-tailwind) maybe.

## Crear diferentes rutas

Quiero que la app tenga diferentes rutas, y el usuario pueda navegar por ellas a través de un menú de los típicos de shadcn. Eso sí, mobile-first.

Estas serían las rutas:

- `/`. La página principal. De momento la dejamos vacía.
- `/log`. La página con el formulario para registrar una fila en la base de datos (lo que tenemos ahora). 
- `/log/:id`. Con un :id, el formulario representa un elemento existente. Así se puede editar.
- `/logs`. Una tabla con las entradas, filtros y opciones para ordenarlos, para ver todo lo registrado sin gráficos ni distracciones. Cada fila tendrá su propio link a `/log/:id`.
- `/view`. Aquí en un futuro crearemos diferentes vistas. Por ejemplo: un gráfico sobre mi peso corporal; una vista tipo red social con las imágenes y textos que he ido subiendo, etcétera. De momento lo dejamos vacío. Ya lo pensaremos bien.

Por cierto, no estoy del todo convencido del nombre del slug "log". He pensado en otras alternativas como `/record`, `/metric`, `/measurement`, `/entry`, o `/indicator`. "Log" me gusta porque es muy genérico (como la variedad de cosas que podemos registrar aquí), y el dominio de la web ya acota por la temática de la salud. Pero si tienes alguna opinión al respecto, me gustaría oírla.

He pensado que estaría bien que `/log` sea la única página que requiera autenticación (o que se requiera una diferente). Esto es porque quiero compartir la visualización de mis datos con otras personas (mi entrenador personal, mi novia, mi familia); pero quiero poder añadir información solo yo. ¿Cómo lo ves, técnicamente y a nivel de UX?

## Añadir funcionalidad de IA a `/log`

La página de registros db tiene un AI prompt input flotante en la parte inferior de la pantalla, para enviar un texto a un modelo de lenguaje y que éste setee los parámetros del formulario. Por ejemplo:

- "peso 87,75kg" pone eso en el formulario. 
- "he comido tal" pone eso en el formulario.

Luego el usuario es el que hace submit del formulario.

## Posibilidad: separar el registro de sueño en dos ("ir a dormir" y "despertar")

Imagina esta situación en el estado actual del formulario: voy a dormir y pongo la hora actual en el formulario. Al día siguiente por la mañana pongo la hora a la que me levanté. Pero la hora a la que me acosté no ha persistido.

En realidad, esto se podría solucionar con lo del URL query.

Pero, ¿y si me acuerdo de apuntar cuando me voy a dormir y no cuando me levanto? ¿No sería mejor apuntar al menos una de las dos?

De hecho, ambas tienen significado relevante de forma independiente, ya que es importante ir a dormir (y despertarse) a una hora regular. Es decir, tendría interés ver un gráfico solo de las horas a las que me fui a dormir, por ejemplo.

Las horas de sueño cada noche pueden ser simplemente un dato computado a partir de los otros dos datos.

Pensémoslo. ¿Cómo lo ves?

## Pensar datos que se pueden añadir automáticamente

Igual que quiero conectar mi báscula vía OAuth2 para que peso y composición corporal se registren solos, también quiero pensar en qué otros registros puedo hacer sin necesidad de pasar por la UI. ¿Me ayudas a recabar ideas?

# Done

## image attachment component from shadCn

Esta app incluye formularios donde se puede subir imágenes. La UI es de shadcn. Creo que este es el componente donde se suben las imágenes: src/components/forms/PhotoUploader.tsx. Pero se ve muy básico. Quiero uno que muestre una previsualización de las imágenes. Usando siempre componentes y bloques de shadcn. Seguramente tenemos que usar este componente: https://ui.shadcn.com/docs/components/base/attachment.

## image attachment component should not show photo ID

## start /view

Every view has its own page: /view/:view_slug. Every view page shows something. Usually a chart, but also can be something else. For example, it can be a chart representing the evolution of the weight, or a social-media-like feed with the entries of meals, sleep, workouts, weight...

Every view has its own name.

The page /view should have two parts:

- A "view selector" at the top. It scrolls horizontally. It shows a series of items. Every item represents a view and is a link to it. Every item shows a SVG representing it (we can use a placeholder SVG for the moment) and the name of the view. The sidebar at https://tailblocks.cc/ inspired me for this. As always, we'll use shadcn blocks and components for this - there is probably some existing component for something like this.
- The actual view. Its contents depend on the route. For the parent route (/view), we see something like "Select a view".

As a library for the charts in the views, I'd like to use Recharts, since it has React component syntax, and I've read it's a good fit for apps using shadcn.

## new view: peso

It just shows a Recharts chart showing the my body weight records.

The X-axis represents time (continuous axis).

The Y-axis represents weight in kilograms (continuous axis).

The graph will have one data point for each weight measurement and a local regression trendline.

Así es la tabla:

```csv
id,metric_type,value,unit,value_secondary,body_site,recorded_at,recorded_date,source,external_id,metadata,notes,created_at,updated_at
149611d3-95a6-47f4-ad4d-c57791cdb425,weight,86.300,kg,,,2026-08-15 20:25:00+00,2026-08-15,manual,,{},,2026-08-15 20:25:49.465393+00,2026-08-15 20:25:49.465393+00
83e50b08-273b-42f5-be76-aa22fcdbee4e,weight,86.600,kg,,,2026-08-15 10:32:00+00,2026-08-15,manual,,{},,2026-08-15 10:32:15.746602+00,2026-08-15 10:32:15.746602+00
a04c9f89-20de-4ed8-aa8e-1d1334092d54,weight,87.000,kg,,,2026-08-13 19:47:00+00,2026-08-13,manual,,{},,2026-08-13 19:47:19.129907+00,2026-08-13 19:47:19.129907+00
e2349cb0-bad7-4911-b420-df9a383ca81b,weight,85.900,kg,,,2026-08-12 05:19:00+00,2026-08-12,manual,,{},,2026-08-12 05:20:03.299263+00,2026-08-12 05:20:03.299263+00
e3964ead-cd6e-4d50-97a7-143396918ded,weight,85.950,kg,,,2026-08-10 16:18:00+00,2026-08-10,manual,,{},,2026-08-10 20:54:04.295838+00,2026-08-10 20:54:04.295838+00
```

## new view: horas de sueño

Gráfico de barras sencillo para representar la cantidad de horas dormidas cada día.

Forma de los datos:

```csv
id,went_to_bed_at,woke_up_at,is_nap,quality_rating,wake_feeling,notes,source,external_id,created_at
006c8826-751f-4b53-a8fb-a92840466dbb,2026-08-15 12:50:00+00,2026-08-15 13:30:00+00,true,,,,manual,,2026-08-15 14:01:28.857004+00
c7486d25-abcf-4388-b790-9cb7bbacc688,2026-08-13 23:00:00+00,2026-08-14 05:30:00+00,false,4,4,,manual,,2026-08-14 05:38:07.703953+00
cb81597a-8bd4-41b3-87da-6853095b3717,2026-08-16 00:00:00+00,2026-08-16 07:00:00+00,false,,,,manual,,2026-08-16 07:44:33.128759+00
e49fe1e2-0e26-4aa3-8d65-11e2db8ab848,2026-08-16 21:30:00+00,2026-08-17 05:00:00+00,false,,,,manual,,2026-08-17 05:55:52.734845+00
```

El eje Y representa la cantidad de horas (eje continuo).

El eje X representa los días (eje discreto).

En cada día del eje X, se muestra la suma de horas que dormí ese día.

Es decir, la suma de tiempo de las entradas en que woke_up_at coinciden con ese día.

Como puede haber varias entradas en que me levanté para un solo día (por ejemplo, por siestas), éstas deberían mostrarse de forma "stacked" para poder ver el total de un día y al mismo tiempo diferenciar diferentes periodos de sueño.

Podemos usar un Stacked Bar Chart, como en https://recharts.github.io/en-US/examples/StackedBarChart/

## new view: periodos de sueño

Representar la homogeneidad/heterogeneidad de horas a las que me acuesto y me levanto.

El eje Y muestra las horas/minutos del día (eje continuo).

El eje X muestra los diferentes días (eje discreto).

Para cada día, se muestra marcada la franja de horas en las que estuve durmiendo.

Así que las dos propiedades relevantes aquí son went_to_bed_at y woke_up_at. Ambas muestran fechas en formato ISO 8601.

Como normalmente voy a dormir al anochecer y me despierto al día siguiente, estaría bien que los límites del eje Y fueran las 18:00. Y también estaría bien que pudiéramos cambiar este límite fácilmente.

Podemos usar un Ranged Bar Chart, como en https://recharts.github.io/en-US/examples/BarChartRangeExample/.


## ajustes en /view/weight

- ¿El eje X es proporcional al tiempo? A primera vista me parece que no. Veo la misma distancia entre "10 ago" y "13 ago" que entre "13 ago" y "15 ago". También, las etiquetas del eje X deberían estar espaciadas de forma uniforme. Veo que están puestos los días 10, 13, 15, 17 y 18.
- En el tooltip, quiero que haya una distancia mínima entre el nombre de la serie y su valor. Ahora mismo se ve junto (como "Tendencia87.00 kg").
- Me gustaría que el eje Y tuviera algo más de margen por arriba y por abajo.
- Media móvil: Ahora mismo equivale a cada punto. ¿Por qué? (quizás es porque hay pocos puntos -7 puntos en 8 días).
- He hecho un par de cambios por mi cuenta. Habrá que commitearlos también.

## ajustes en /view/sleep-periods

- He cambiado DAY_BOUNDARY_HOUR de 18 a 0 para ver qué ocurre. Y no veo lo que esperaba.
  - Lo que espero ver: para cada día, los tiempos en que he dormido dispuestos de forma vertical, aunque sean cada banda del gráfico no coincida con un registro específico. Por ejemplo: el día 17 de agosto, quiero ver una banda desde las 0:00 hasta las 7:00, y después desde las 23:00 hasta las 00:00. En cambio, los registros son por noche (uno del 2026-08-16 23:30 al 2026-08-17 07:00 y otro del 2026-08-17 23:00 al 2026-08-18 07:00). No sé si me explico. Pregúntame si tienes dudas.
  - Lo que veo: cada franja equivale a un registro. Cuando un registro cruza la barrera del día (en este caso las 00:00), el eje Y se estira para mostrar la banda completa, en lugar de cortar la banda y continuarla en el siguiente día.
- Quiero que el usuario pueda cambiar DAY_BOUNDARY_HOUR en la propia view, con un droprown.
- Quiero que los periodos de sueño que terminan en fin de semana tengan otro color.

## Form container responsiveness (desktop): check

Que se vea centrado en escritorio. Añadir algo como `lg:mx-auto` a `flex max-w-lg flex-col gap-4 p-4 pb-24`.

## new view: week

Vamos a considerar que la semana comienza en lunes. Pero vamos a mantenerlo en una variable de forma que más adelante podamos ajustarlo desde una futura página /settings, igual que estamos haciendo en `/src/lib/localTime.ts`.

En esta vista, tenemos dos partes:

### Week selector & navigator

Por defecto está seleccionada la semana actual.

No se pueden seleccionar semanas futuras. La última semana que se puede seleccionar es la actual.

Consiste en lo siguiente:

- Un botón de flecha a la izquierda para ir a la semana anterior. (Siempre usando shadcn).
- Un drop-down con calendario (algo [así](https://ui.shadcn.com/docs/components/base/date-picker)) donde el usuario puede seleccionar una semana. Como siempre, usando componentes de shadcn. Pero en este caso, supongo que tenemos que aplicar  una lógica extra para que se puedan seleccionar solo semanas.
- Un botón de flecha a la derecha para ir a la semana siguiente. (Siempre usando shadcn).

### Gráfico

Un gráfico similar al de /sleep-periods, pero en este caso no solo mostraremos el sueño, sino más cosas.

Muestra datos para la semana seleccionada.

Eje Y son las horas, arriba las 00:00 y abajo las 23:59.

Eje X son los días. Siempre muestra 7 días, de lunes a domingo (días sin datos también se muestran).

De muestran, en diferentes colores, diferentes tipos de dato:

- Sueño
- Comidas (ya que no tienen hora de fin, se muestran siempre como periodos de 30min)
- Deporte

En el tooltip de cada barra vemos toda la información disponible teniendo en cuenta el tipo de dato. Por ejemplo, para las comidas se mostrarían, cuando están disponibles, la ubicación, descripción, y fotos. (Si es posible).

## new view: social-media-like feed

Slug: "feed". Name: "Feed".

This should be a cronological view (newer at the top, to older at the bottom) of several types of records, looking like the feed of a social media app.

Like a social media app, it has lazy loading (intitially, a few posts are loaded, user loads more by scrolling down).

It should looking beautiful and appealing.

As always, we are using shadcn components and blocks.

Eventually, we can make every post replyable and shareable (as Twitter posts).

### Post common layout

Las fechas de los posts se deben mostrar siempre en este formato: "hoy/ayer/hace dos días/el domingo/el 15 de agosto/el 30 de diciembre de 2025 a las 16:40". Es decir:

- La fecha en este formato:
  - hoy: "hoy".
  - ayer: "ayer".
  - antesdeayer: "hace dos días".
  - hace 3-6 días: "el lunes/martes/miércoles/jueves/viernes/sábado/domingo".
  - hace >6 días: "el 8 de agosto". Y si no es el año actual, incluye el año ("el 30 de diciembre").
- La hora y minuto, en formato "a las hh:mm".

Usemos Intl.RelativeTimeFormat y Intl.DateTimeFormat para conseguir esto.

### Post types

#### Comida

{eaten_at}
{icono de comida} Carlos comió
{title}
Si hay ubicación: {icono de ubicación} {ubicación}
Si hay descripción: descripción
Si hay imágenes: [carousel de imágenes](https://ui.shadcn.com/docs/components/base/carousel)
Si hay ingredientes: IngredientBadges.tsx (véase abajo)

##### IngredientBadges.tsx

Render each ingredient as a small `Badge` (variant="secondary" or "outline") in a `flex flex-wrap gap-1` row. Badges are built for exactly this — short, pill-shaped, low-visual-weight labels that wrap naturally instead of breaking the feed's rhythm.

Format each ingredient's text with a small helper so the quantity/unit are optional without leaving awkward gaps:

```tsx
const INGREDIENT_SEPARATOR = " · ";

function formatIngredient({ name, quantity, unit }: Ingredient): string {
  if (quantity && unit) return `${quantity} ${unit}${INGREDIENT_SEPARATOR}${name}`;
  if (quantity) return `${quantity}x${INGREDIENT_SEPARATOR}${name}`;
  return name;
}
```

**Overflow: don't let it grow the card — cap it and reveal the rest in a `Popover`**

Feed posts should have a predictable height, so I wouldn't use `Collapsible` here — expanding it pushes every post below it down, which feels bad in a scroll feed. Instead:

- Show the first ~4 ingredients as badges.
- If there are more, add one extra badge: `+{n} more`.
- That badge is a `PopoverTrigger`; the `PopoverContent` shows the full list (still just plain text or a stacked list of badges).

This keeps every post the same compact height regardless of how many ingredients a meal has, while still making the full list one tap away.

```tsx
const MAX_VISIBLE_INGREDIENTS = 4;

export function IngredientBadges({ ingredients }: { ingredients: Ingredient[] }) {
  const visible = ingredients.slice(0, MAX_VISIBLE_INGREDIENTS);
  const hiddenCount = ingredients.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((ingredient) => (
        <Badge key={ingredient.name} variant="secondary" className="font-normal">
          {formatIngredient(ingredient)}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge variant="outline" className="cursor-pointer font-normal">
              +{hiddenCount} more
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <ul className="space-y-1 text-sm">
              {ingredients.map((ingredient) => (
                <li key={ingredient.name}>{formatIngredient(ingredient)}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
```

#### Sueño

{went_to_bed_at}
{icono de sueño} Carlos durmió {" una siesta" si es una siesta}
X horas
Se levantó a las {woke up at}
Si hay notas: {notas}
Si hay Calidad del sueño: {Calidad del sueño}
Si hay Sensación al despertar: {Sensación al despertar}

#### Workout

{started_at}
{icono de deporte} Carlos entrenó
{workout_type} {si hay duration_minutes: "de X minutos"}
Si hay notas: {notas}
Si hay imágenes: [carousel de imágenes](https://ui.shadcn.com/docs/components/base/carousel)
Si hay métricas: mostrar similar a IngredientBadges.tsx
Si hay series: mostrar en [Table](https://ui.shadcn.com/docs/components/base/table)

## Añadir /settings

Quiero añadir una nueva ruta /settings, con su botón en el nav.

Como siempre, usando componentes y bloques de shadcn.

Para acceder a /settings necesitaríamos log in, igual que en /log.

Los settings estarán organizados en diferentes secciones.

Vamos a hacer una lluvia de ideas para ver qué settings podemos poner.

Algunas ideas iniciales:

- Zona horaria (afecta a /src/lib/localTime.ts)
- Si la semana empieza en lunes o domingo
- Datos personales: altura, edad (puede servir por ejemplo para añadir datos de IMC a /views)
- Contrast hue (afecta a /src/views/sleep-periods/SleepPeriodsView.tsx), --chart-highlight. --chart-highlight-2 y sucesivos tendrán un hue de (x + 137.5) % 360, donde x es el anterior. Esto es para organizar los hues de forma que contrasten entre ellos y no se repitan (137.5 es el "ángulo áureo").
- User name (afecta a /view/feed)
- Objetivos personales
  - Horas de sueño diarias
    - Type: [number, number]
    - Unit: amount of hours, amount of minutes
    - Default: 8:30
    - Se verá en: el gráfico de /view/sleep-times
  - Hora de acostarme
    - Type: [number, number]
    - Unit: HH:MM
    - Default: 22:00
    - Se verá en: el gráfico de /view/sleep-periods
  - Hora de levantarme
    - Type: [number, number]
    - Unit: HH:MM
    - Default: 22:00
    - Se verá en: el gráfico de /view/sleep-periods
  - Peso mínimo
    - Type: number
    - Unit: kg
    - Default: 70
    - Se verá en: el gráfico de /view/weight
  - Peso máximo
    - Type: number
    - Unit: kg
    - Default: 94
    - Se verá en: el gráfico de /view/weight

Ayúdame a planear qué ponemos en settings y cómo sería la UX y la UI. Recuerda que esto debe ser mobile-first y muy basado en shadcn. Nos inspiramos en aplicaciones modernas y avanzadas.

## Ajustes en /sleep-periods

- Toggle button para excluir/incluir siestas en el gráfico. Por defecto: excluir siestas.
- Inicio del día por defecto: 18 (no 0).

## Ajustes en AiPromptBar

- Ceñirlo a su scope visual: el panel que contiene el AiPromptBar se muestra por encima de la barra lateral (con la clase `fixed inset-x-0 bottom-0 z-20`). Debería estar detrás del navbar, o dentro del panel de contenido. Pero no sobre el navbar.
- Permitir varias líneas.

## Use shadcn's Empty component

Use the [Empty component](https://ui.shadcn.com/docs/components/base/empty) where it makes sense.

## Mobile: cerrar nav cuando cambias pestaña

## Antes de cerrar sesión, double-check con usuario con modal

## Ajustes en /view/sleep-times

Tooltip: mostrar horas y minutos, no en horas decimales

## /log (sleep) add check

Cuando se registra una entrada de sueño, chequear que no solape con una existente. Si es así, informar al usuario con un modal de ShadCn y no permitir el solapamiento. 

## Añadir líneas de objetivos / IMC en los views.

### En /view/sleep-times

Añade una línea horizontal basada en los settings:

- Objetivo: horas de sueño diarias (si ese objetivo no es null)

### En /view/sleep-periods

Añade dos líneas horizontales basadas en los settings:

- Objetivo: hora de acostarme (si ese objetivo no es null)
- Objetivo: hora de levantarme (si ese objetivo no es null)

### En /view/weight

Añade líneas horizontales:

- Objetivo: peso mínimo (si ese objetivo no es null)
- Objetivo: peso máximo (si ese objetivo no es null)

Añade un toggle button de shadcn que diga algo como "Mostrar IMC". Cuando está "on", añade las siguientes franjas horizontales al gráfico (para obtener la posición Y, calcula cuál es el peso en kg para obtener ese IMC teniendo en cuenta la altura que el usuario ha puesto en /settings):

- IMC infrapeso: <=18.5
- IMC normal: 18.5-25
- IMC sobrepeso: 25-30
- IMC obesidad: >30


## Views en el sidebar

Show the different views (currently described in `/src/views/registry.ts`) in the sidebar, as a sub-menu of "Vistas". Get rid of the ViewSelector component (used in ViewPage.tsx).

## Nuevo tipo de entrada: "shit"

Quiero añadir entrada: "shit". Para registrar cuándo, donde y como cago. Sé que puede parecer poco serio, o broma. Pero va en serio. Esto es una app para registrar temas relacionadas con la salud. En mi caso concreto, creo que soy bastante irregular. Tengo semanas de estreñimiento y otras de lo contrario. Quiero entender mi regularidad, mis horas, y su relación con otras cosas como cuándo como. Por eso este tipo de entrada encaja muy bien aquí. Este tipo de entrada debería tener propiedades para permitir definir *cómo* he cagado, en varios sentidos. Sobre la privacidad, sé que esto puede ser más sensible que otras cosas, como la comida o el entrenamiento. Pero no me quiero preocupar por esto de momento. Más adelante añadiremos la opción de hacer entradas individuales privadas (o hacer privados tipos enteros de entrada, desde /settings). De momento nos centramos en añadir este nuevo tipo de entrada. Vamos a planearlo bien antes de tocar código.

## Añadir propiedad obligatoria a mealType

Añadir una propiedad obligatoria `mealType` a los meals de esta app, para marcar si son "desayuno", "almuerzo", "cena" o "snack". He explorado el codebase de antemano y esto es lo que hay que tocar.

## Add this data directly to the database

Inserted 8 of the 9 weight records as `weight` metric entries (manual source). The 9th (2026-08-10 18:18, 85.95kg) was already in the database. Two dates in the original note were corrected as typos: "2026-07-08 20:00" → "2026-08-08 20:00", and "2016-08-10 18:18" → "2026-08-10 18:18" (superseded by the pre-existing row).

## /log (training) add new prop

Added optional `location` field to workouts, mirroring meals: DB column + migration, `workoutInputSchema`, create/update API handlers, "Lugar (opcional)" form field, and the AI prompt-bar schema.

## Feed: show location in "workout" posts

WorkoutPost.tsx now shows the location with a MapPin icon, matching MealPost.tsx.

## /log (meal) AI prompt adjustment

IA comida: que añada descripción. The `description` field already existed in the AI's meal schema but had no `.describe()` annotation telling the model what belongs there, so it was rarely filled. Added guidance to extract qualitative details the user mentions (taste, preparation, how they felt about it) — separate from title/ingredients — and leave it blank when there's nothing beyond the dish itself. Verified against the real Anthropic call: "estaba buenísima aunque le faltaba sal" now lands in `description`; a bare "tostada con tomate" leaves it empty.

## Check for stuff before saving a log in the database

Sleep overlap already existed. Added the other three checks:

- **Meal-type time window** (confirm): breakfast 05:00–11:00, lunch 12:00–16:00, dinner 19:00–23:00 (local time), snack exempt. Outside the window for the selected type shows a confirm dialog in MealForm.
- **One breakfast/lunch/dinner per day** (alert, blocking): server-side check in `api/meals.ts` (`findExistingMealType`, mirrors `findOverlap`'s pattern), returns 409, MealForm shows a blocking alert. Snacks are unlimited. Verified directly against the DB, including the late-night day-boundary edge case (a 23:55 dinner doesn't collide with the next day's dinner).
- **Future-time logging** (confirm, all 8 entry types): a shared `useConfirmDialog` hook (`src/hooks/useConfirmDialog.tsx`) plus `confirmIfFuture` (`src/lib/futureTime.ts`, 5-minute grace window) wired into every form's submit handler, checking each type's primary timestamp (eatenAt, startedAt, recordedAt, takenAt, wokeUpAt, occurredAt).

## Add query params to /log

Meal-only for now (the concrete recipe-site use case), not a generic mechanism for all entry types — `src/lib/mealLinkParams.ts`. `/log/:id` (edit) ignores query params entirely; the loaded entry is always the source of truth. Never reads `eatenAt` (always defaults to "now") or photos (can't round-trip through a URL) — invalid/malformed params (bad JSON, unknown mealType) fall back to defaults instead of failing.

Landing on `/log?type=meal&...` pre-selects "Meal" in the type selector and opens the form prefilled, while still letting you switch type. URL contract for the recipe site:

```
/log?type=meal
  &title=<string>
  &mealType=breakfast|lunch|dinner|snack   (optional, defaults to breakfast)
  &description=<string>                     (optional)
  &location=<string>                        (optional)
  &ingredients=<URL-encoded JSON array>     (optional)
```

`ingredients` is a JSON array of `{ ingredient: string, quantityValue?: number, quantityUnit?: string }`, e.g. `[{"ingredient":"Pollo","quantityValue":200,"quantityUnit":"g"},{"ingredient":"Aguacate"}]`, URL-encoded.

## /logs: add context menu in every item

Installed shadcn's `dropdown-menu`. Rows no longer navigate on click; each has a menu with:

- **Editar** — same navigation as the old row-click.
- **Copiar a nuevo** — fetches the entry via the existing `GET /entries/:id`, then `src/lib/copyEntry.ts` blanks exactly date/time and photos (per type: `eatenAt`+photos for meals, `startedAt`+photos for workouts, both `wentToBedAt`/`wokeUpAt` for sleep, `recoveredAt` too for health episodes, etc.) and keeps everything else. The result is passed to `/log` via router navigation state rather than query params — works for all 8 entry types, not just meals, without reopening the generic-query-params question deferred earlier.

## Permitir logs privados

Implemented the "tipos enteros, desde ajustes" half of the two options the doc raised — **not** per-entry privacy (still open, see below).

New Settings → Privacidad card lets you check which of the 8 entry types are hidden from anyone without a session. Enforcement lives server-side in `api/_lib/privacy.ts` (`isTypeHiddenFrom` / `filterVisibleTypes`), checked at the top of every per-type list endpoint (returns `[]` when hidden) and in the `/entries` aggregator's both list and single-lookup paths (a private entry's `/entries/:id` 404s rather than revealing it exists). Read access was already unauthenticated by design (`createHandler` only requires a session for non-GET), so this is additive — nothing needs auth that didn't before.

Verified live against `vercel dev`: marked `poop` private via a direct DB write, confirmed `/api/poop-entries` returns `[]`, `/api/entries` excludes it from aggregated results and by-id lookups 404, while unrelated types (`meals`) were unaffected — then reset it back.

**Not done**: per-entry privacy ("O para logs específicos, desde /log"). Scoped out for now since it needs its own schema decision (a column per table vs. a shared side table) — the doc itself flagged this as unresolved ("esto lo tenemos que considerar"), and type-level privacy already solves the stated problem for anything sensitive enough to warrant hiding a whole category (e.g. "shit" entries). Worth a follow-up if you want finer-grained control later.

## New feature: AI insights

New view at `/view/insights` ("Insights IA" in the sidebar). Two preset buttons (**Comida**, **General**) send a canned question to the AI; a free-text input below lets you ask follow-ups or open with your own question (defaults to the "general" digest if nothing's selected yet). Conversation history is kept in React state only — not persisted — so each chat resets on page reload, matching the doc's "modo texto solo" spirit elsewhere; no chatbot history storage was built.

Backend is a new `kind=insights` branch in `api/ai/parse.ts` (the existing AI endpoint, reused rather than a new function — already at Vercel's 12-function Hobby cap). Two digest builders in `api/_lib/insightsDigest.ts` turn recent DB rows into compact text summaries rather than raw JSON dumps:

- **Comida**: last 30 days of meals, chronological detail plus counts by type and top-15 ingredient frequency.
- **General**: 30-day weight trend, 14-day sleep average, 30-day meal/workout/poop counts.

Each request recomputes the digest fresh and sends it as the system prompt alongside the client-held chat history — stateless server-side, always current data.

Verified live: ran the real digest builders against the actual database and made real Anthropic calls (not mocked). The meal-focus answer correctly flagged low fish intake with specific counts — directly matching the doc's own example ("si estoy comiendo suficiente pescado"). The general-focus answer covered weight/sleep/meals/workouts, and a follow-up question in the same thread correctly built on the prior answer, confirming multi-turn history works.
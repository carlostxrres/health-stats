import { METRIC_DEFINITIONS, WORKOUT_TYPES } from "../shared/metricCatalog";
import { client, db } from "./client";
import { metricDefinitions, sources, workoutTypes } from "./schema";

async function seed() {
  await db
    .insert(sources)
    .values([
      { code: "manual", label: "Manual", kind: "manual" },
      { code: "withings", label: "Withings", kind: "api" },
    ])
    .onConflictDoNothing();

  await db
    .insert(metricDefinitions)
    .values(
      METRIC_DEFINITIONS.map((metric) => ({
        code: metric.code,
        label: metric.label,
        category: metric.category,
        defaultUnit: metric.defaultUnit,
        valueKind: "valueKind" in metric ? metric.valueKind : "simple",
        requiresBodySite: "requiresBodySite" in metric ? metric.requiresBodySite : false,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(workoutTypes)
    .values([...WORKOUT_TYPES])
    .onConflictDoNothing();

  console.log("Seed completado.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());

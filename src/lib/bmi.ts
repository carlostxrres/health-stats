// BMI = weight_kg / height_m². Solving for weight at a given BMI threshold:
// weight_kg = BMI * height_m². Used to place the WHO BMI category
// boundaries (underweight/normal/overweight/obesity) on a weight-in-kg axis.
export function bmiWeightThresholds(heightCm: number) {
  const heightM = heightCm / 100;
  return {
    underweightMax: 18.5 * heightM ** 2,
    normalMax: 25 * heightM ** 2,
    overweightMax: 30 * heightM ** 2,
  };
}

// A short curated list rather than the full ~400 IANA zones — this is a
// single-user app, not a scheduling tool, so the handful of zones the user
// actually lives in or travels to is plenty.
export const COMMON_TIME_ZONES: { value: string; label: string }[] = [
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Atlantic/Canary", label: "Canarias" },
  { value: "Europe/Lisbon", label: "Lisboa" },
  { value: "Europe/London", label: "Londres" },
  { value: "Europe/Paris", label: "París" },
  { value: "Europe/Berlin", label: "Berlín" },
  { value: "Europe/Rome", label: "Roma" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Nueva York" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Denver", label: "Denver" },
  { value: "America/Los_Angeles", label: "Los Ángeles" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Asia/Dubai", label: "Dubái" },
  { value: "Asia/Kolkata", label: "Bombay / Nueva Delhi" },
  { value: "Asia/Shanghai", label: "Shanghái" },
  { value: "Asia/Tokyo", label: "Tokio" },
  { value: "Australia/Sydney", label: "Sídney" },
];

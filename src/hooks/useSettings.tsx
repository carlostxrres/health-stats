import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { applyChartHuePalette } from "@/lib/chartHue";
import { setDisplayTimeZone, setWeekStartDay } from "@/lib/localTime";

export type AppSettings = {
  id: string;
  displayName: string | null;
  heightCm: string | null;
  birthDate: string | null;
  timeZone: string;
  weekStartDay: number;
  chartHue: number;
  sleepGoalMinutes: number | null;
  bedtimeGoal: string | null;
  wakeTimeGoal: string | null;
  weightGoalMinKg: string | null;
  weightGoalMaxKg: string | null;
  updatedAt: string;
};

interface SettingsContextValue {
  settings: AppSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// The non-component consumers (localTime.ts's timezone/week-start getters,
// and the CSS hue variables) can't read from React context, so loading
// settings also pushes the values into those module-level stores.
function applyGlobalSettings(settings: AppSettings) {
  setDisplayTimeZone(settings.timeZone);
  setWeekStartDay(settings.weekStartDay);
  applyChartHuePalette(settings.chartHue);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<AppSettings>("/settings");
      applyGlobalSettings(data);
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetch: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}

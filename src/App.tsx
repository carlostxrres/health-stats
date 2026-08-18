import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { SettingsProvider } from "@/hooks/useSettings";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { LogPage } from "@/pages/LogPage";
import { LogsPage } from "@/pages/LogsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ViewDetailPage } from "@/pages/ViewDetailPage";
import { ViewIndexPage } from "@/pages/ViewIndexPage";
import { ViewPage } from "@/pages/ViewPage";

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/view" element={<ViewPage />}>
                <Route index element={<ViewIndexPage />} />
                <Route path=":slug" element={<ViewDetailPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route path="/log" element={<LogPage />} />
                <Route path="/log/:id" element={<LogPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

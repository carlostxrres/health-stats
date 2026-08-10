import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-heading text-sm font-medium">health-stats</span>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </header>
      <Outlet />
    </div>
  );
}

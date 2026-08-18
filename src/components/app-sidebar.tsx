import { Activity, Home, LineChart, List, LogIn, LogOut, Settings, SquarePlus } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/log", label: "Registrar", icon: SquarePlus, end: false },
  { to: "/logs", label: "Registros", icon: List, end: false },
  { to: "/view", label: "Vistas", icon: LineChart, end: false },
] as const;

const SETTINGS_ITEM = { to: "/settings", label: "Ajustes", icon: Settings, end: false } as const;

function isNavItemActive(pathname: string, item: { to: string; end: boolean }) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  function closeMobileNav() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none hover:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Activity className="size-4" />
              </div>
              <span className="font-heading font-medium">health-stats</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(pathname, item)}
                    onClick={closeMobileNav}
                    render={<NavLink to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isNavItemActive(pathname, SETTINGS_ITEM)}
              onClick={closeMobileNav}
              render={<NavLink to={SETTINGS_ITEM.to} />}
            >
              <SETTINGS_ITEM.icon />
              <span>{SETTINGS_ITEM.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {!loading &&
              (session ? (
                <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                  <AlertDialogTrigger render={<SidebarMenuButton />}>
                    <LogOut />
                    <span>Cerrar sesión</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tendrás que volver a iniciar sesión para acceder a tus datos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          closeMobileNav();
                          supabase.auth.signOut();
                        }}
                      >
                        Cerrar sesión
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <SidebarMenuButton onClick={closeMobileNav} render={<NavLink to="/login" />}>
                  <LogIn />
                  <span>Iniciar sesión</span>
                </SidebarMenuButton>
              ))}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

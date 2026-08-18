import {
  Activity,
  ChevronRight,
  Home,
  LineChart,
  List,
  LogIn,
  LogOut,
  Settings,
  SquarePlus,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { VIEWS } from "@/views/registry";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/log", label: "Registrar", icon: SquarePlus, end: false },
  { to: "/logs", label: "Registros", icon: List, end: false },
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
  const [viewsOpen, setViewsOpen] = useState(() => pathname.startsWith("/view"));

  function closeMobileNav() {
    if (isMobile) setOpenMobile(false);
  }

  // AppSidebar stays mounted across route changes, so `defaultOpen` alone
  // only captures the initial route — this keeps the group in sync whenever
  // navigation (not just a manual toggle) lands on a /view/* route, without
  // fighting the user if they collapse it again afterwards.
  useEffect(() => {
    if (pathname.startsWith("/view")) setViewsOpen(true);
  }, [pathname]);

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
              <SidebarMenuItem>
                <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        isActive={pathname.startsWith("/view")}
                        className="group/collapsible"
                      />
                    }
                  >
                    <LineChart />
                    <span>Vistas</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {VIEWS.map((view) => (
                        <SidebarMenuSubItem key={view.slug}>
                          <SidebarMenuSubButton
                            isActive={pathname === `/view/${view.slug}`}
                            onClick={closeMobileNav}
                            render={<NavLink to={`/view/${view.slug}`} />}
                          >
                            <view.icon />
                            <span>{view.name}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
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

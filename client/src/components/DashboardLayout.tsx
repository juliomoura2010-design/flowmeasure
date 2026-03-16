import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Ruler,
  Shield,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import GlobalSearch from "./GlobalSearch";

const menuSections = [
  {
    label: "PAINEL",
    items: [
      { icon: LayoutDashboard, label: "Visão Geral", path: "/" },
    ],
  },
  {
    label: "FLUXO OPERACIONAL",
    items: [
      { icon: ClipboardList, label: "Pedidos", path: "/pedidos" },
      { icon: Ruler, label: "Medições", path: "/medicoes" },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { icon: Building2, label: "Fornecedores", path: "/fornecedores" },
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    ],
  },
];
const menuItems = menuSections.flatMap(s => s.items);

const SIDEBAR_WIDTH_KEY = "fm-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground">
                P
              </div>
              <span className="text-2xl font-bold font-heading text-foreground">PayFlow</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
              Sistema de gestão de pagamentos por medições. Faça login para continuar.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0 bg-sidebar" disableTransition={isResizing}>
          {/* Header com Logo */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 text-sidebar-primary-foreground font-bold text-sm">
                P
              </div>
              {!isCollapsed && (
                <div>
                  <span className="font-bold text-lg font-heading text-sidebar-foreground tracking-tight">
                    PayFlow
                  </span>
                  <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest leading-none mt-0.5">Fornecedores</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navegação */}
          <SidebarContent className="gap-0 py-3">
            {menuSections.map(section => (
              <div key={section.label} className="mb-2">
                {!isCollapsed && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase">
                    {section.label}
                  </p>
                )}
                <SidebarMenu className="px-3 gap-0.5">
                  {section.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 rounded-lg transition-all font-normal text-sidebar-foreground/80
                            ${isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
                            }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary-foreground" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* Footer com perfil */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/20 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                        {user?.role === "admin" ? "Administrador" : "Usuário"}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-6">
          {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg" />}
          <div className="flex-1 flex items-center gap-4">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                3
              </Badge>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-none text-foreground">{user?.name || "-"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  {user?.role === "admin" && <Shield className="h-3 w-3" />}
                  {user?.role === "admin" ? "Admin" : "Usuário"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

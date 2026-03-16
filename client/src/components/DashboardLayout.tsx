import { useLocation } from "wouter";
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
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Ruler,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";

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
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

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

          {/* Footer — modo público */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-sidebar-primary">FM</span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">FlowMeasure</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate mt-1">Acesso público</p>
                </div>
              )}
            </div>
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
            <span className="text-xs text-muted-foreground hidden sm:block">FlowMeasure</span>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

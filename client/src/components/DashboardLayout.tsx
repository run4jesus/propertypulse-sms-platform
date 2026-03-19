import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Switch } from "@/components/ui/switch";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Ban,
  Bot,
  CalendarDays,
  ChevronDown,
  FileText,
  GitBranch,
  Hash,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeft,
  Phone,
  PhoneCall,
  Settings,
  Users,
  Users2,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { toast } from "sonner";

const menuGroups = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: MessageSquare, label: "Messenger", path: "/messenger" },
      { icon: CalendarDays, label: "Calendar", path: "/calendar" },
    ],
  },
  {
    label: "Campaigns",
    items: [
      { icon: Zap, label: "Campaigns", path: "/campaigns" },
      { icon: Hash, label: "Keywords", path: "/campaigns/keywords" },
      { icon: GitBranch, label: "Workflows", path: "/workflows" },
      { icon: FileText, label: "Templates", path: "/templates" },
    ],
  },
  {
    label: "Contacts",
    items: [
      { icon: Users, label: "Contacts", path: "/contacts" },
      { icon: Users2, label: "Groups", path: "/contacts/groups" },
      { icon: Ban, label: "Management", path: "/contacts/management" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: Zap, label: "Macros", path: "/macros" },
      { icon: Phone, label: "Call Logs", path: "/calls" },
      { icon: BarChart3, label: "Reporting", path: "/reporting" },
      { icon: PhoneCall, label: "Phone Numbers", path: "/phone-numbers" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const menuItems = menuGroups.flatMap(g => g.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Property Pulse</span>
            </div>
            <h1 className="text-xl font-semibold text-center">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access your SMS marketing platform for real estate wholesaling.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
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
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // AI global toggle
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const updateAiMode = trpc.settings.updateAiMode.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const aiEnabled = (me as any)?.aiModeEnabled ?? false;

  const handleAiToggle = (checked: boolean) => {
    updateAiMode.mutate({ enabled: checked });
    toast(checked ? "AI mode enabled globally" : "AI mode paused", {
      description: checked ? "AI will auto-respond to incoming messages" : "AI responses are paused",
    });
  };

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

  const activeItem = menuItems.find((item) =>
    item.path === "/" ? location === "/" : location.startsWith(item.path)
  );

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-bold text-sidebar-foreground tracking-tight truncate text-sm">
                    Property Pulse
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="gap-0 py-2 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.label} className="mb-1">
                {!isCollapsed && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <SidebarMenu className="px-2 gap-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.path === "/" ? location === "/" : location.startsWith(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : ""
                          }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}

            {/* AI Toggle section */}
            {!isCollapsed && (
              <div className="mx-2 mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className={`h-4 w-4 ${aiEnabled ? "text-primary" : "text-sidebar-foreground/50"}`} />
                    <div>
                      <p className="text-xs font-medium text-sidebar-foreground">AI Agent</p>
                      <p className="text-xs text-sidebar-foreground/50">
                        {aiEnabled ? "Active" : "Paused"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={handleAiToggle}
                    className={aiEnabled ? "data-[state=checked]:bg-primary" : ""}
                  />
                </div>
              </div>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-sidebar-foreground truncate">
                          {user?.name || "User"}
                        </p>
                        <p className="text-xs text-sidebar-foreground/50 truncate">
                          {user?.email || ""}
                        </p>
                      </div>
                      <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-medium text-sm">{activeItem?.label ?? "Property Pulse"}</span>
            </div>
          </div>
        )}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}

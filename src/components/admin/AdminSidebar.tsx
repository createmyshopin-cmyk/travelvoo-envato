import { LayoutDashboard, Building2, CalendarCheck, Settings, Tag, Star, LogOut, DoorOpen, FileText, Receipt, User, Globe, BarChart3, CreditCard, ChevronDown, CalendarDays, Clapperboard, BookOpen, ImageIcon, Search, Lock, UserPlus, Store, Palette } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

// feature key required for each route (undefined = always accessible)
const ROUTE_FEATURE: Record<string, string> = {
  "/admin/calendar":       "dynamic_pricing",
  "/admin/analytics":      "analytics",
  "/admin/coupons":        "coupons",
  "/admin/quotations":     "quotation_generator",
  "/admin/invoices":       "invoice_generator",
  "/admin/accounting":     "invoice_generator",
  "/admin/reels-stories":  "reels",
  "/admin/account/domain": "custom_domain",
  "/admin/ai-settings":    "ai_search",
  "/admin/marketplace":    "marketplace",
};

const staysSubItems = [
  { title: "Stay List", url: "/admin/stays", icon: Building2 },
  { title: "Calendar", url: "/admin/calendar", icon: CalendarDays },
  { title: "Room Categories", url: "/admin/rooms", icon: DoorOpen },
];

const bookingsSubItems = [
  { title: "Booking List", url: "/admin/bookings", icon: CalendarCheck },
  { title: "Guest Contacts", url: "/admin/guest-contacts", icon: User },
  { title: "Leads", url: "/admin/leads", icon: UserPlus },
];

const quotationsSubItems = [
  { title: "Quotations", url: "/admin/quotations", icon: FileText },
  { title: "Invoices", url: "/admin/invoices", icon: Receipt },
  { title: "Accounting Book", url: "/admin/accounting", icon: BookOpen },
];

const settingsSubItems = [
  { title: "General Settings", url: "/admin/settings", icon: Settings },
  { title: "Seo", url: "/admin/seo", icon: Search },
  { title: "Banner", url: "/admin/banner", icon: ImageIcon },
  { title: "Reels / Story", url: "/admin/reels-stories", icon: Clapperboard },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
  { title: "Domain", url: "/admin/account/domain", icon: Globe },
];

const accountItems = [
  { title: "Profile", url: "/admin/account/profile", icon: User },
  { title: "Subscription", url: "/admin/account/billing", icon: CreditCard },
  { title: "Usage", url: "/admin/account/usage", icon: BarChart3 },
];

interface AdminSidebarProps {
  onSignOut: () => void;
}

function useFeatureFlags() {
  const { plan } = useSubscriptionGuard();
  const flags: Record<string, boolean> = plan?.feature_flags ?? {};
  const isLocked = (url: string) => {
    const key = ROUTE_FEATURE[url];
    if (!key) return false;
    return !flags[key];
  };
  return { isLocked };
}

function SubMenu({ label, icon: Icon, items, collapsed }: { label: string; icon: any; items: typeof staysSubItems; collapsed: boolean }) {
  const pathname = usePathname();
  const { isLocked } = useFeatureFlags();
  const isActive = (path: string) => pathname === path;
  const hasActive = items.some((i) => isActive(i.url));
  const [open, setOpen] = useState(hasActive);

  if (collapsed) {
    return (
      <>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive(item.url)}>
              <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                <item.icon className={cn("mr-2 h-4 w-4", isLocked(item.url) && "text-muted-foreground")} />
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={cn("justify-between", hasActive && "text-primary font-medium")}>
            <span className="flex items-center">
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        {items.map((item) => {
          const locked = isLocked(item.url);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} className="pl-8">
                <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                  <item.icon className={cn("mr-2 h-4 w-4", locked && "text-muted-foreground")} />
                  <span className={cn("flex-1", locked && "text-muted-foreground")}>{item.title}</span>
                  {locked && <Lock className="ml-auto h-3 w-3 text-muted-foreground/60" />}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const { isLocked } = useFeatureFlags();
  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-base font-bold tracking-tight">Admin Panel</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/dashboard")}>
                  <NavLink to="/admin/dashboard" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/marketplace")}>
                  <NavLink to="/admin/marketplace" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <Store className={cn("mr-2 h-4 w-4", isLocked("/admin/marketplace") && "text-muted-foreground")} />
                    {!collapsed && (
                      <>
                        <span className={cn("flex-1", isLocked("/admin/marketplace") && "text-muted-foreground")}>Marketplace</span>
                        {isLocked("/admin/marketplace") && <Lock className="ml-auto h-3 w-3 text-muted-foreground/60" />}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/theme")}>
                  <NavLink to="/admin/theme" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <Palette className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Theme</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Stays Submenu */}
              <SubMenu label="Stays" icon={Building2} items={staysSubItems} collapsed={collapsed} />

              {/* Bookings Submenu */}
              <SubMenu label="Bookings" icon={CalendarCheck} items={bookingsSubItems} collapsed={collapsed} />

              {/* Analytics */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/analytics")}>
                  <NavLink to="/admin/analytics" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <BarChart3 className={cn("mr-2 h-4 w-4", isLocked("/admin/analytics") && "text-muted-foreground")} />
                    {!collapsed && (
                      <>
                        <span className={cn("flex-1", isLocked("/admin/analytics") && "text-muted-foreground")}>Analytics</span>
                        {isLocked("/admin/analytics") && <Lock className="ml-auto h-3 w-3 text-muted-foreground/60" />}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Coupons */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/coupons")}>
                  <NavLink to="/admin/coupons" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <Tag className={cn("mr-2 h-4 w-4", isLocked("/admin/coupons") && "text-muted-foreground")} />
                    {!collapsed && (
                      <>
                        <span className={cn("flex-1", isLocked("/admin/coupons") && "text-muted-foreground")}>Coupons</span>
                        {isLocked("/admin/coupons") && <Lock className="ml-auto h-3 w-3 text-muted-foreground/60" />}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Quotations Submenu */}
              <SubMenu label="Quotations" icon={FileText} items={quotationsSubItems} collapsed={collapsed} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Group */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Settings"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SubMenu label="Settings" icon={Settings} items={settingsSubItems} collapsed={collapsed} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Group */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Account"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button variant="ghost" size="sm" onClick={onSignOut} className="w-full justify-start text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

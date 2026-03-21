import {
  LayoutDashboard, Building2, CreditCard, Package, Puzzle, Receipt,
  Sparkles, BarChart3, Globe, Settings, LogOut, Megaphone, KeyRound,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/saas-admin/dashboard", icon: LayoutDashboard },
  { title: "Tenants", url: "/saas-admin/tenants", icon: Building2 },
  { title: "Subscriptions", url: "/saas-admin/subscriptions", icon: CreditCard },
  { title: "Plans & Packages", url: "/saas-admin/plans", icon: Package },
  { title: "Features", url: "/saas-admin/features", icon: Puzzle },
  { title: "Transactions", url: "/saas-admin/transactions", icon: Receipt },
];

const secondaryItems = [
  { title: "AI Usage", url: "/saas-admin/ai-usage", icon: Sparkles },
  { title: "Analytics", url: "/saas-admin/analytics", icon: BarChart3 },
  { title: "Domains", url: "/saas-admin/domains", icon: Globe },
  { title: "Envato licenses", url: "/saas-admin/envato-licenses", icon: KeyRound },
  { title: "Announcements", url: "/saas-admin/announcements", icon: Megaphone },
  { title: "Settings", url: "/saas-admin/settings", icon: Settings },
];

interface Props {
  onSignOut: () => void;
}

export function SaasAdminSidebar({ onSignOut }: Props) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-base font-bold tracking-tight">SaaS Admin</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => (
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

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Platform"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map(item => (
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

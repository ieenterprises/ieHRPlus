
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ReceiptText,
  CalendarCheck,
  Package,
  BookUser,
  Trash2,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useSettings } from "@/hooks/use-settings";
import type { AnyPermission } from "@/lib/permissions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  permission?: AnyPermission | AnyPermission[];
  featureFlag?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: "VIEW_SALES_REPORTS" },
  { href: "/sales", icon: ShoppingCart, label: "Sales", permission: "ACCEPT_PAYMENTS" },
  { href: "/kitchen", icon: ClipboardList, label: "Orders", permission: "VIEW_ALL_RECEIPTS" },
  { href: "/inventory", icon: Package, label: "Inventory", permission: ["MANAGE_ITEMS_BO", "VIEW_SALES_REPORTS"] },
  { href: "/reservations", icon: CalendarCheck, label: "Reservations", permission: "ACCEPT_PAYMENTS", featureFlag: "reservations" },
  { href: "/reports", icon: BarChart3, label: "Reports", permission: "VIEW_SALES_REPORTS" },
  { href: "/team", icon: Users, label: "Team", permission: "MANAGE_EMPLOYEES" },
  { href: "/customers", icon: BookUser, label: "Customers", permission: ["MANAGE_CUSTOMERS", "VIEW_CUSTOMERS"] },
  { href: "/debts", icon: ReceiptText, label: "Debts", permission: "VIEW_ALL_RECEIPTS" },
  { href: "/voided", icon: Trash2, label: "Voided", permission: "VIEW_SALES_REPORTS" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { loggedInUser, logout, featureSettings } = useSettings();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (wasOffline.current && isOnline) {
      toast({
        title: "Back Online",
        description: "Your data has been successfully synced.",
      });
    }
    wasOffline.current = !isOnline;
  }, [isOnline, toast]);

  const handleLogout = async () => {
    await logout();
  };
  
  const hasPermission = (permission?: AnyPermission | AnyPermission[]) => {
    if (!permission) return true;
    if (!loggedInUser) return false;

    const userPermissions = new Set(loggedInUser.permissions);
    if (Array.isArray(permission)) {
      return permission.some(p => userPermissions.has(p));
    }
    return userPermissions.has(permission);
  };

  const isFeatureEnabled = (featureFlag?: string) => {
    if (!featureFlag) return true; // No feature flag means it's always enabled
    return featureSettings[featureFlag] === true;
  };

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission) && isFeatureEnabled(item.featureFlag));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 text-primary-foreground"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
            </svg>
          </div>
          <span className="text-xl font-bold font-headline">OrderFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {hasPermission("MANAGE_FEATURE_SETTINGS") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
                  <Link href="/settings">
                      <Settings />
                      <span>Settings</span>
                  </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full p-2">
                <div className="flex items-center gap-2 truncate">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={loggedInUser?.avatar_url || "https://placehold.co/100x100.png"} alt={loggedInUser?.name || "User"} data-ai-hint="person portrait" />
                        <AvatarFallback>
                          {loggedInUser?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm truncate">
                        <span className="font-semibold truncate">{loggedInUser?.name}</span>
                        <span className="text-muted-foreground truncate">{loggedInUser?.email}</span>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group-data-[collapsible=icon]:hidden">
                          {isOnline ? (
                            <Cloud className="h-5 w-5 text-green-500" />
                          ) : (
                            <CloudOff className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        {isOnline ? "Online" : "Offline Mode"}
                      </TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                 </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}



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
  Users,
  Settings,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  Store,
  HardDrive,
  Folder,
  Briefcase,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useSettings } from "@/hooks/use-settings";
import type { AnyPermission } from "@/lib/permissions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { IELogo } from "./ie-logo";
import { Separator } from "./ui/separator";
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

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  permission?: AnyPermission | AnyPermission[];
  featureFlag?: string;
  offlineDisabled?: boolean;
  tempAccessAware?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hr-review", icon: Briefcase, label: "HR Review", permission: "MANAGE_USERS" },
  { href: "/file-manager", icon: Folder, label: "File Manager" },
  { href: "/team", icon: Users, label: "Team", permission: "MANAGE_USERS", offlineDisabled: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { loggedInUser, logout, featureSettings, selectedBranch, selectedDevice } = useSettings();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const wasOffline = useRef(!isOnline);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (wasOffline.current && isOnline) {
       toast({
        title: "Back Online",
        description: "Your data has been synced with the server.",
      });
    }
    wasOffline.current = !isOnline;
  }, [isOnline, toast]);


  const handleLogout = async () => {
    await logout();
  };
  
  const handleSync = () => {
    if (!isOnline) {
      toast({ title: "Offline", description: "You must be online to sync data.", variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    toast({
      title: "Syncing Data...",
      description: "Refreshing the application with the latest data.",
    });

    // Force a hard reload to fetch the latest data from the server
    window.location.reload();
  };

  const hasPermission = (item: NavItem) => {
    if (!loggedInUser) return false;
    if (loggedInUser.role === 'Owner') return true;

    // Grant access if temporary access flag is set for aware items
    if (item.tempAccessAware && loggedInUser.temp_access_given) {
        return true;
    }
    
    if (!item.permission) return true;

    const userPermissions = new Set(loggedInUser.permissions);
    if (Array.isArray(item.permission)) {
      return item.permission.some(p => userPermissions.has(p));
    }
    return userPermissions.has(item.permission);
  };

  const isFeatureEnabled = (featureFlag?: string) => {
    if (!featureFlag) return true; // No feature flag means it's always enabled
    return featureSettings[featureFlag] === true;
  };
  
  const shouldShowPosInfo = loggedInUser && ['Cashier', 'Waitress', 'Bar Man'].includes(loggedInUser.role);

  const visibleNavItems = navItems.filter(item => hasPermission(item) && isFeatureEnabled(item.featureFlag));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <IELogo className="w-8 h-8" />
          <span className="text-xl font-bold font-headline">ieHRPlus</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems.map((item) => {
            const isDisabled = item.offlineDisabled && !isOnline;
            const button = (
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "#" : item.href} aria-disabled={isDisabled} tabIndex={isDisabled ? -1 : undefined} className={isDisabled ? "pointer-events-none" : ""}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            );

            return (
              <SidebarMenuItem key={item.href}>
                {isDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" align="center">
                      <p>Internet connection required</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  button
                )}
              </SidebarMenuItem>
            );
          })}
           <SidebarMenuItem>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SidebarMenuButton
                        onClick={handleSync}
                        disabled={!isOnline || isSyncing}
                    >
                        <RefreshCw className={isSyncing ? "animate-spin" : ""} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
                    </SidebarMenuButton>
                </TooltipTrigger>
                 {!isOnline && (
                    <TooltipContent side="right" align="center">
                        You are offline. Connect to the internet to sync.
                    </TooltipContent>
                )}
            </Tooltip>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {(hasPermission({ permission: "MANAGE_BRANCHES" } as NavItem) || hasPermission({ permission: "MANAGE_SECURITY" } as NavItem)) && (
             <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings" disabled={!isOnline}>
                          <Link href={!isOnline ? "#" : "/settings"} aria-disabled={!isOnline} tabIndex={!isOnline ? -1 : undefined} className={!isOnline ? "pointer-events-none" : ""}>
                              <Settings />
                              <span>Settings</span>
                          </Link>
                      </SidebarMenuButton>
                    </div>
                  </TooltipTrigger>
                  {!isOnline && <TooltipContent side="right" align="center"><p>Internet connection required</p></TooltipContent>}
                </Tooltip>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
             <div className="flex flex-col w-full p-2 gap-2">
                {!isOnline && (
                  <div className="group-data-[collapsible=icon]:hidden p-2 text-xs text-center bg-yellow-100 text-yellow-800 rounded-md flex items-center justify-center gap-2">
                    <CloudOff className="h-4 w-4" />
                    <span>You’re offline—actions will sync automatically.</span>
                  </div>
                )}
                <div className="flex items-center justify-between w-full">
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
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block group-data-[collapsible=icon]:hidden">
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!isOnline}>
                                            <LogOut className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                </div>
                            </TooltipTrigger>
                            {!isOnline && <TooltipContent side="top" align="center"><p>Internet connection required to log out</p></TooltipContent>}
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will end your current session and you will be returned to the sign-in screen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleLogout}>Confirm Logout</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                {shouldShowPosInfo && (selectedBranch || selectedDevice) && (
                  <>
                    <Separator className="group-data-[collapsible=icon]:hidden" />
                    <div className="space-y-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                        {selectedBranch && (
                           <div className="flex items-center gap-2">
                                <Store className="h-3 w-3" />
                                <span className="truncate">Branch: {selectedBranch.name}</span>
                           </div>
                        )}
                        {selectedDevice && (
                           <div className="flex items-center gap-2">
                                <HardDrive className="h-3 w-3" />
                                <span className="truncate">Device: {selectedDevice.name}</span>
                           </div>
                        )}
                    </div>
                  </>
                )}
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

    

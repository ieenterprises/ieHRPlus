
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PosProvider } from "@/hooks/use-pos";
import { SettingsProvider, useSettings } from "@/hooks/use-settings";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { loggedInUser, loadingUser } = useSettings();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !loadingUser && !loggedInUser) {
      router.push("/sign-in");
    }
  }, [loggedInUser, loadingUser, router, isClient]);

  if (loadingUser || !isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return null; // or a redirect component
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <PosProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </PosProvider>
    </SettingsProvider>
  );
}

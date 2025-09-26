
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PosProvider } from "@/hooks/use-pos";
import { SettingsProvider, useSettings } from "@/hooks/use-settings";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { loggedInUser, loadingUser } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Redirect logic should only run on the client after mount
    if (isMounted && !loadingUser && !loggedInUser) {
      router.push("/sign-in");
    }
  }, [loggedInUser, loadingUser, router, isMounted]);

  // Special pages that don't need the main layout
  if (pathname === '/pdf-viewer' || pathname === '/video-verification' || pathname === '/verify-prompt') {
    return <>{children}</>;
  }

  // Always show a loading indicator on the server and initial client render
  // before the component has mounted.
  if (!isMounted || loadingUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // After mounting, if there's no user, we can return null while the redirect happens.
  if (!loggedInUser) {
    return null;
  }
  
  // After mounting and if the user is logged in, render the full layout.
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

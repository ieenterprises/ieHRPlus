
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PosProvider } from "@/hooks/use-pos";
import { SettingsProvider, useSettings } from "@/hooks/use-settings";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { loggedInUser } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (loggedInUser === null) {
      router.push("/sign-in");
    }
  }, [loggedInUser, router]);

  if (!loggedInUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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

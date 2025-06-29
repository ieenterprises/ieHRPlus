import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PosProvider } from "@/hooks/use-pos";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PosProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PosProvider>
  );
}

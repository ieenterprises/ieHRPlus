
import { SettingsProvider } from "@/hooks/use-settings";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {children}
      </div>
    </SettingsProvider>
  );
}

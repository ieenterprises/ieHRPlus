
import { SettingsProvider } from "@/hooks/use-settings";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
        {children}
    </SettingsProvider>
  );
}

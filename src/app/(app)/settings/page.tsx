
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Ticket, Clock, Printer, Utensils, MonitorPlay, Users, Bell, Percent, SlidersHorizontal, Package, Building, CreditCard, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const settingsNav = [
  { id: "features", label: "Features" },
  { id: "employees", label: "Employees" },
  { id: "tickets", label: "Tickets" },
  { id: "receipts", label: "Receipts" },
  { id: "items", label: "Items" },
  { id: "payment_types", label: "Payment types" },
  { id: "taxes", label: "Taxes" },
];

const featureToggles = [
  { id: "open_tickets", label: "Open tickets", description: "Save and manage orders before payment is complete.", icon: Ticket, defaultEnabled: true },
  { id: "shifts", label: "Shifts", description: "Track cash that is put in and taken out of the drawer.", icon: Clock, defaultEnabled: true },
  { id: "time_management", label: "Time management", description: "Track employee check-in and check-out times.", icon: Users, defaultEnabled: false },
  { id: "kitchen_printers", label: "Kitchen printers", description: "Send orders to the kitchen or bar printers.", icon: Printer, defaultEnabled: true },
  { id: "dining_options", label: "Dining options", description: "Mark orders with dining options like 'Dine in' or 'Take out'.", icon: Utensils, defaultEnabled: true },
  { id: "customer_displays", label: "Customer displays", description: "Show order information to customers on a separate screen.", icon: MonitorPlay, defaultEnabled: false },
];

type FeatureSettings = Record<string, boolean>;

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("features");
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(
    featureToggles.reduce((acc, feat) => ({ ...acc, [feat.id]: feat.defaultEnabled }), {})
  );
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const handleToggle = (id: string, checked: boolean) => {
    setFeatureSettings(prev => ({ ...prev, [id]: checked }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    // In a real app, you would save this to a database.
    console.log("Saving settings:", featureSettings);
    toast({ title: "Settings Saved", description: "Your changes have been successfully saved." });
    setHasChanges(false);
  };

  const handleCancelChanges = () => {
    setFeatureSettings(featureToggles.reduce((acc, feat) => ({ ...acc, [feat.id]: feat.defaultEnabled }), {}));
    setHasChanges(false);
    toast({ title: "Changes Discarded", description: "Your changes have been discarded." });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Settings"
          description="Configure the features and behavior of your POS system."
        />
        {hasChanges && (
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelChanges}>Cancel</Button>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <nav className="flex flex-col space-y-1">
            {settingsNav.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                    "justify-start",
                    activeSection === item.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="md:col-span-3">
            {activeSection === 'features' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Features</CardTitle>
                        <CardDescription>Enable or disable features to fit your business needs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {featureToggles.map((feature, index) => (
                                <>
                                <div key={feature.id} className="flex items-center justify-between space-x-4">
                                    <div className="flex items-start space-x-4">
                                        <feature.icon className="h-6 w-6 text-muted-foreground mt-1" />
                                        <div>
                                            <p className="font-medium">{feature.label}</p>
                                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={featureSettings[feature.id] ?? false}
                                        onCheckedChange={(checked) => handleToggle(feature.id, checked)}
                                    />
                                </div>
                                {index < featureToggles.length - 1 && <Separator />}
                                </>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Other sections can be added here as needed */}
             {activeSection !== 'features' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{settingsNav.find(nav => nav.id === activeSection)?.label}</CardTitle>
                        <CardDescription>Settings for this section are under construction.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                            <p>Coming Soon!</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
      </div>
    </div>
  );
}

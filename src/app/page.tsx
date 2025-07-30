import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IELogo } from '@/components/ie-logo';
import { ShoppingCart, Package, BarChart3, Users, CalendarCheck, ReceiptText } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale',
    description: 'A fast, intuitive, and easy-to-use interface for processing sales, including support for rooms and reservations.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Keep track of your stock levels with real-time updates, manage categories, and import/export products effortlessly.',
  },
  {
    icon: BarChart3,
    title: 'Powerful Reporting',
    description: 'Gain insights into your business performance with detailed reports on sales, products, and employees.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Manage your staff with role-based permissions, ensuring secure access to different parts of the system.',
  },
  {
    icon: CalendarCheck,
    title: 'Reservations',
    description: 'Handle room bookings and availability with an integrated reservation system, perfect for hotels and guesthouses.',
  },
  {
    icon: ReceiptText,
    title: 'Debt Tracking',
    description: 'Easily manage credit sales and track outstanding customer debts, ensuring you never lose track of payments.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <IELogo className="w-8 h-8" />
            <span className="text-xl font-headline">ieOrderFlow</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-32">
           <div
            aria-hidden="true"
            className="absolute inset-0 top-0 grid grid-cols-2 -space-x-52 opacity-40 dark:opacity-20"
          >
            <div className="h-56 bg-gradient-to-br from-primary to-purple-400 blur-[106px] dark:from-blue-700"></div>
            <div className="h-32 bg-gradient-to-r from-cyan-400 to-sky-300 blur-[106px] dark:to-indigo-600"></div>
          </div>
          <div className="container relative text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl font-headline">
              The Modern Point of Sale for Your Business
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              ieOrderFlow is a complete POS solution designed to streamline your operations, from sales and inventory to customer management and reporting.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-secondary/50">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold font-headline">Everything You Need to Succeed</h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Our powerful features are designed to help you manage your business efficiently and effectively.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container grid items-center gap-8 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl font-bold font-headline">Streamline Your Workflow</h2>
              <p className="mt-4 text-muted-foreground">
                From the front desk to the back office, ieOrderFlow provides the tools you need to operate smoothly. Manage sales, track inventory, and understand your business with our intuitive dashboard.
              </p>
              <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Process transactions quickly with our user-friendly sales interface.</p>
                  </div>
                   <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Never run out of stock with real-time inventory tracking and alerts.</p>
                  </div>
                   <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Make informed decisions with comprehensive, easy-to-understand reports.</p>
                  </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Image
                src="https://images.unsplash.com/photo-1726065235239-b20b88d43eea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxQb3MlMjBTeXN0ZW18ZW58MHx8fHwxNzUzODkyNjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Dashboard Screenshot"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                data-ai-hint="dashboard analytics"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ieOrderFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Helper component for the check icon in the feature list
function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IELogo } from '@/components/ie-logo';
import { DollarSign, Clock, CalendarOff, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: DollarSign,
    title: 'Automated Payroll',
    description: 'Streamline salary schedules, manage deductions, and automate payroll processing with precision.',
  },
  {
    icon: Clock,
    title: 'Time & Attendance',
    description: 'Track employee hours, manage overtime, and monitor attendance with an intuitive and reliable system.',
  },
  {
    icon: CalendarOff,
    title: 'Leave Management Portal',
    description: 'Simplify leave requests, approvals, and tracking with a self-service portal for all employees.',
  },
  {
    icon: Users,
    title: 'Employee Profiles',
    description: 'Maintain comprehensive and secure employee records, from contact details to performance history.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Reviews',
    description: 'Set goals, track progress, and conduct insightful performance reviews all within one integrated platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Document Handling',
    description: 'Manage sensitive HR documents, contracts, and policies with robust security and access controls.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <IELogo className="w-8 h-8" />
            <span className="text-xl font-headline">ieHRPlus</span>
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
              Modernize Your Human Resource Management
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              ieHRPlus is the all-in-one platform to manage payroll, time, leave, and employee performance. Empower your business with a smarter way to handle HR.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">Request a Demo</Link>
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
              <h2 className="text-3xl font-bold font-headline">A Better Way to Manage Your People</h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Our powerful features are designed to simplify your HR processes, giving you more time to focus on your team.
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
              <h2 className="text-3xl font-bold font-headline">Built for Efficient HR</h2>
              <p className="mt-4 text-muted-foreground">
                From automating payroll to managing leave requests, ieHRPlus provides the tools you need to operate smoothly. Keep your team happy and your business compliant with our intuitive platform.
              </p>
              <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Automate complex payroll calculations and ensure timely payments.</p>
                  </div>
                   <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Provide employees with a self-service portal for leave and personal data.</p>
                  </div>
                   <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 text-primary"/>
                      <p>Gain insights into workforce productivity with advanced time tracking.</p>
                  </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Image
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx0ZWFtJTIwbWVldGluZyUyMGFib3V0JTIwcHJvamVjdHxlbnwwfHx8fDE3MjY4NjgzNTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="HR Team Meeting"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                data-ai-hint="team meeting office"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ieHRPlus. All rights reserved.
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

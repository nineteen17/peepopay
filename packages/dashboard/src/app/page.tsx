import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, LayoutDashboard, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Peepo<span className="text-primary">Pay</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Production-grade booking and payment infrastructure for service businesses
          </p>

          <div className="flex gap-4 justify-center pt-6">
            <Button asChild size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Easy Booking</CardTitle>
              <CardDescription>
                Embeddable widget for seamless customer booking experience
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Direct Payments</CardTitle>
              <CardDescription>
                Money flows directly to your Stripe account with 2.5% platform fee
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <LayoutDashboard className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Full Control</CardTitle>
              <CardDescription>
                Manage services, availability, and bookings from your dashboard
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Instant notifications and availability management for your business
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="container mx-auto px-4 py-20 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Built with Modern Tech</h2>
          <p className="text-lg text-muted-foreground">
            Next.js 16, React 19, Stripe Connect, Better Auth, and Drizzle ORM
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            {['Next.js 16', 'React 19', 'TypeScript', 'Tailwind', 'shadcn/ui', 'Stripe', 'PostgreSQL'].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

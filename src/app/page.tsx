import React from 'react';
import Link from 'next/link';
import {
  Palette,
  Ruler,
  Cloud,
  Sparkles,
  ArrowRight,
  Github,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import HeroDesignerDemo from '@/components/landing/HeroDesignerDemo';
import AIFlowDemo from '@/components/landing/AIFlowDemo';
import StackingDemo from '@/components/landing/StackingDemo';
import ExportDemo from '@/components/landing/ExportDemo';
import Reveal from '@/components/landing/Reveal';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Public top bar */}
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="font-bold text-foreground">Terrain Creator</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-assisted terrain layouts
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Design modular terrain
            <br />
            <span className="text-primary">for your tabletop games</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Drag, snap, and stack terrain pieces into reusable maps. Plan
            scenarios visually and save them to the cloud — all from the
            browser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get started — it&apos;s free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        {/* Live designer demo */}
        <div className="relative max-w-5xl mx-auto px-4 pb-20">
          <HeroDesignerDemo />
          {/* glow */}
          <div className="absolute inset-x-0 -bottom-10 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        </div>
      </section>

      {/* Real flows, animated */}
      <section className="max-w-6xl mx-auto px-4 py-20 w-full">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              See it in action
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real workflows from the app — no screenshots, this is how it
              actually feels to build a map.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          <Reveal className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-5 flex flex-col h-full">
                <h3 className="font-semibold text-foreground mb-1">
                  Generate layouts with AI
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Describe the scene and get a starting layout in seconds.
                </p>
                <AIFlowDemo />
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={120} className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-5 flex flex-col h-full">
                <h3 className="font-semibold text-foreground mb-1">
                  Stack elevations
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Build hills and towers by layering pieces level by level.
                </p>
                <StackingDemo />
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={240} className="h-full md:col-span-2 lg:col-span-1">
            <Card className="bg-card h-full">
              <CardContent className="p-5 flex flex-col h-full">
                <h3 className="font-semibold text-foreground mb-1">
                  Export your piece list
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Know exactly which pieces you need before game night.
                </p>
                <ExportDemo />
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20 w-full">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Everything you need to build maps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for game masters and miniature painters who want to plan
              modular layouts without re-drawing them every session.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Reveal className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Visual designer
                </h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop terrain pieces with real-time preview and
                  multi-level stacking.
                </p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={100} className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Ruler className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Snap to grid
                </h3>
                <p className="text-sm text-muted-foreground">
                  Precise placement with magnetic snapping that respects piece
                  footprints and rotations.
                </p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={200} className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Cloud storage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Maps and inventories live in the cloud, so you can pick up
                  where you left off on any device.
                </p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={300} className="h-full">
            <Card className="bg-card h-full">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  AI assistant
                </h3>
                <p className="text-sm text-muted-foreground">
                  Describe the scenario you want and let the assistant suggest
                  a starting layout.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-20 w-full">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Ready to design your first map?
          </h2>
          <p className="text-muted-foreground mb-6">
            Create an account and start building in under a minute.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Create free account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xl">🗺️</span>
            <span>© {new Date().getFullYear()} Modular Terrain Creator</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

import { SiteHeader } from "@/components/markets/site-header";
import { buttonVariants } from "@/components/ui/button";

export function PortfolioPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Position tracking is not enabled yet. This page is intentionally empty until real trading is connected.
          </p>
        </div>

        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">No positions yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a WhatsApp export to generate markets, then trading can be connected next.
          </p>
          <Link href="/upload" className={`${buttonVariants()} mt-4 inline-flex`}>
            Upload WhatsApp Export
          </Link>
        </section>
      </main>
    </div>
  );
}

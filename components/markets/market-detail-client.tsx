"use client";

import { useState } from "react";
import Link from "next/link";

import { MarketCard } from "@/components/markets/market-card";
import { SiteHeader } from "@/components/markets/site-header";
import { TradePanel } from "@/components/markets/trade-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyCompact, formatDateTime } from "@/lib/format";
import type { DisplayMarket } from "@/lib/markets";

type MarketDetailClientProps = {
  market: DisplayMarket;
  related: DisplayMarket[];
};

export function MarketDetailClient({ market, related }: MarketDetailClientProps) {
  const [mobileTradeOpen, setMobileTradeOpen] = useState(false);

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Browse
          </Link>
          <span className="px-2">/</span>
          <span>{market.category}</span>
        </div>

        <div className="mb-5 rounded-xl border border-border/80 bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {market.category}
            </Badge>
            {market.isLive ? <Badge variant="live">LIVE</Badge> : null}
            {market.isNew ? <Badge variant="new">NEW</Badge> : null}
            <span className="text-xs text-muted-foreground">Closes {formatDateTime(market.closesAt)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground md:text-3xl">{market.title}</h1>
          {market.subtitle ? <p className="mt-2 text-sm text-muted-foreground">{market.subtitle}</p> : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <Tabs defaultValue="trade">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="trade">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="text-lg font-semibold">Trade Snapshot</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Yes price</p>
                      <p className="mt-1 text-xl font-semibold">{Math.round(market.yesPrice * 100)}¢</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">No price</p>
                      <p className="mt-1 text-xl font-semibold">{Math.round(market.noPrice * 100)}¢</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">24h volume</p>
                      <p className="mt-1 text-xl font-semibold">{formatCurrencyCompact(market.volume24h)}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm">
                    <p className="mb-2 font-medium">Outcomes</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {market.outcomes.map((outcome) => (
                        <li key={outcome.label} className="flex items-center justify-between gap-3">
                          <span>{outcome.label}</span>
                          <span>{Math.round(outcome.initial_probability * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="mb-2 text-lg font-semibold">Resolution criteria</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{market.resolutionCriteria}</p>
                </div>
              </TabsContent>

              <TabsContent value="evidence">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">Evidence from chat</h2>
                  <ul className="space-y-2">
                    {market.evidence.map((entry, index) => (
                      <li key={`${entry.quote}-${index}`} className="rounded-lg border border-border/70 bg-muted/25 p-3 text-sm">
                        <p className="text-foreground">“{entry.quote}”</p>
                        <p className="mt-1 text-xs text-muted-foreground">Approx time: {entry.approx_time ?? "Unknown"}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="text-lg font-semibold">More analytics</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Activity and chart series are not generated yet for uploaded chat imports.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {related.length > 0 ? (
              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Related markets</h2>
                  <Link href="/" className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <div className="market-grid grid gap-3">
                  {related.map((item) => (
                    <MarketCard key={item.slug} market={item} compact />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TradePanel market={market} />
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Yes price</p>
            <p className="text-base font-semibold">{Math.round(market.yesPrice * 100)}¢</p>
          </div>
          <Button onClick={() => setMobileTradeOpen(true)} className="h-10 min-w-28 rounded-full">
            Open Trade
          </Button>
        </div>
      </div>

      {mobileTradeOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Trade panel</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileTradeOpen(false)}>
                Close
              </Button>
            </div>
            <TradePanel market={market} compact />
          </div>
        </div>
      ) : null}
    </div>
  );
}

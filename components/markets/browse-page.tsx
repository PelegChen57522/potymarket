"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MarketCard } from "@/components/markets/market-card";
import { SiteHeader } from "@/components/markets/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatCurrencyCompact } from "@/lib/format";
import type { DisplayMarket } from "@/lib/markets";
import { cn } from "@/lib/utils";

const browseTabs = ["New", "Trending", "Popular", "Liquid", "Ending Soon", "Competitive"] as const;
const sortOptions = ["24h Volume", "Newest", "Closing soon"] as const;

type BrowseTab = (typeof browseTabs)[number];
type SortOption = (typeof sortOptions)[number];

type BrowsePageProps = {
  markets: DisplayMarket[];
  bannerMessage?: string | null;
};

function tabComparator(tab: BrowseTab) {
  return (a: DisplayMarket, b: DisplayMarket) => {
    if (tab === "New") {
      return Number(b.isNew) - Number(a.isNew) || +new Date(b.closesAt) - +new Date(a.closesAt);
    }

    if (tab === "Trending") {
      return b.volume24h - a.volume24h;
    }

    if (tab === "Popular") {
      return b.volume24h - a.volume24h;
    }

    if (tab === "Liquid") {
      return Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5) || b.volume24h - a.volume24h;
    }

    if (tab === "Ending Soon") {
      return +new Date(a.closesAt) - +new Date(b.closesAt);
    }

    return Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5) || b.volume24h - a.volume24h;
  };
}

function sortComparator(sortBy: SortOption) {
  if (sortBy === "Newest") {
    return (a: DisplayMarket, b: DisplayMarket) =>
      Number(b.isNew) - Number(a.isNew) || +new Date(b.closesAt) - +new Date(a.closesAt);
  }

  if (sortBy === "Closing soon") {
    return (a: DisplayMarket, b: DisplayMarket) => +new Date(a.closesAt) - +new Date(b.closesAt);
  }

  return (a: DisplayMarket, b: DisplayMarket) => b.volume24h - a.volume24h;
}

export function BrowsePage({ markets, bannerMessage }: BrowsePageProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<BrowseTab>("Trending");
  const [sortBy, setSortBy] = useState<SortOption>("24h Volume");
  const [activeOnly, setActiveOnly] = useState(true);
  const [hideLogistics, setHideLogistics] = useState(false);
  const [hidePlans, setHidePlans] = useState(false);
  const [hideChaos, setHideChaos] = useState(false);
  const [minVolume, setMinVolume] = useState([0]);

  const topicChips = useMemo(() => {
    const categories = Array.from(new Set(markets.map((market) => market.category)));
    return ["All", ...categories];
  }, [markets]);
  const [activeTopic, setActiveTopic] = useState("All");

  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = markets.filter((market) => {
      if (activeOnly && !market.isActive) {
        return false;
      }

      if (hideLogistics && market.category === "Logistics") {
        return false;
      }

      if (hidePlans && market.category === "Plans") {
        return false;
      }

      if (hideChaos && market.category === "Chaos") {
        return false;
      }

      if (market.volume24h < minVolume[0]) {
        return false;
      }

      if (activeTopic !== "All" && market.category !== activeTopic) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [market.title, market.subtitle, market.category, market.topics.join(" "), market.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const byTab = tabComparator(activeTab);
    const bySort = sortComparator(sortBy);

    return filtered.sort((a, b) => byTab(a, b) || bySort(a, b));
  }, [
    markets,
    search,
    activeOnly,
    hideLogistics,
    hidePlans,
    hideChaos,
    minVolume,
    activeTopic,
    activeTab,
    sortBy
  ]);

  if (markets.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader searchValue={search} onSearchChange={setSearch} />
        <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-14 text-center lg:px-6">
          <h1 className="text-2xl font-semibold tracking-tight">No markets yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload a WhatsApp export to generate markets.
          </p>
          <Link href="/upload" className={`${buttonVariants()} mt-5 inline-flex`}>
            Go to Upload
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader searchValue={search} onSearchChange={setSearch} />

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-3 lg:px-6">
        {bannerMessage ? (
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
            <AlertDescription>{bannerMessage}</AlertDescription>
          </Alert>
        ) : null}

        <section className="-mx-1 flex gap-4 overflow-x-auto border-b border-border/80 px-1 pb-2">
          {browseTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap border-b-2 px-0.5 pb-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </section>

        <section className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {topicChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveTopic(chip)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeTopic === chip
                  ? "border-slate-300 bg-slate-100 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip}
            </button>
          ))}
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-3">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Sort by</p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Active only
                <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide Logistics
                <Switch checked={hideLogistics} onCheckedChange={setHideLogistics} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide Plans
                <Switch checked={hidePlans} onCheckedChange={setHidePlans} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide Chaos
                <Switch checked={hideChaos} onCheckedChange={setHideChaos} />
              </label>
              <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Min 24h volume</span>
                  <span className="text-xs text-muted-foreground">{formatCurrencyCompact(minVolume[0])}</span>
                </div>
                <Slider
                  value={minVolume}
                  onValueChange={setMinVolume}
                  max={400000}
                  step={5000}
                  className="mt-2"
                  aria-label="Minimum volume"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8 pt-1">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-medium text-muted-foreground">Markets</h1>
            <p className="text-sm text-muted-foreground">{filteredAndSorted.length} shown</p>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <h2 className="text-lg font-semibold">No markets match these filters</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try widening topic/category filters or reducing min volume.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setActiveTab("Trending");
                  setSortBy("24h Volume");
                  setActiveOnly(true);
                  setHideLogistics(false);
                  setHidePlans(false);
                  setHideChaos(false);
                  setMinVolume([0]);
                  setActiveTopic("All");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="market-grid grid gap-3 sm:gap-4">
              {filteredAndSorted.map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

import type { GeneratedMarketIdea } from "@/lib/llm/schema";

export type DisplayMarket = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  closesAt: string;
  isActive: boolean;
  isLive?: boolean;
  isNew?: boolean;
  type: "yesno" | "twoway";
  optionLabels?: [string, string];
  topics: string[];
  description: string;
  resolutionCriteria: string;
  marketType: GeneratedMarketIdea["market_type"];
  outcomes: GeneratedMarketIdea["outcomes"];
  evidence: GeneratedMarketIdea["evidence"];
};

function normalizeProbabilities(outcomes: GeneratedMarketIdea["outcomes"]): GeneratedMarketIdea["outcomes"] {
  const safe = outcomes.map((outcome) => ({ ...outcome, initial_probability: Math.max(0, outcome.initial_probability) }));
  const sum = safe.reduce((acc, current) => acc + current.initial_probability, 0);

  if (sum <= 0) {
    const equal = 1 / safe.length;
    return safe.map((outcome) => ({ ...outcome, initial_probability: equal }));
  }

  return safe.map((outcome) => ({
    ...outcome,
    initial_probability: Number((outcome.initial_probability / sum).toFixed(4))
  }));
}

function deriveYesNoProbabilities(market: GeneratedMarketIdea) {
  const normalized = normalizeProbabilities(market.outcomes);

  if (market.market_type === "YES_NO") {
    const yesOutcome = normalized.find((entry) => entry.label.toLowerCase() === "yes") ?? normalized[0];
    const yes = yesOutcome?.initial_probability ?? 0.5;
    return { yesPrice: yes, noPrice: Number((1 - yes).toFixed(4)) };
  }

  const first = normalized[0]?.initial_probability ?? 0.5;
  const second = normalized[1]?.initial_probability ?? Number((1 - first).toFixed(4));
  const total = first + second || 1;

  return {
    yesPrice: Number((first / total).toFixed(4)),
    noPrice: Number((second / total).toFixed(4))
  };
}

function deriveLabels(market: GeneratedMarketIdea): [string, string] | undefined {
  if (market.market_type === "YES_NO") {
    return undefined;
  }

  const first = market.outcomes[0]?.label ?? "Option A";
  const second = market.outcomes[1]?.label ?? "Option B";
  return [first, second];
}

export function toDisplayMarket(market: GeneratedMarketIdea, uploadedAt: string): DisplayMarket {
  const { yesPrice, noPrice } = deriveYesNoProbabilities(market);
  const scoreSum = market.scores.clarity + market.scores.creativity + market.scores.evidence + market.scores.fun;

  const closeTime = market.close_time_guess ? new Date(market.close_time_guess) : null;
  const fallbackCloseTime = new Date(new Date(uploadedAt).getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    id: market.id,
    slug: market.slug,
    title: market.title,
    subtitle: market.description,
    category: market.category,
    yesPrice,
    noPrice,
    volume24h: Math.max(1000, Math.round(scoreSum * 100000)),
    closesAt: (closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime : fallbackCloseTime).toISOString(),
    isActive: true,
    isLive: false,
    isNew: Date.now() - new Date(uploadedAt).getTime() < 24 * 60 * 60 * 1000,
    type: market.market_type === "YES_NO" ? "yesno" : "twoway",
    optionLabels: deriveLabels(market),
    topics: [market.category],
    description: market.description,
    resolutionCriteria: market.resolution_criteria,
    marketType: market.market_type,
    outcomes: normalizeProbabilities(market.outcomes),
    evidence: market.evidence
  };
}

import "server-only";

import { z } from "next/dist/compiled/zod";

export type MarketCategory =
  | "Friends"
  | "Tonight"
  | "Weekend"
  | "Plans"
  | "Attendance"
  | "Logistics"
  | "Chaos"
  | "Other";

export type MarketType = "YES_NO" | "NUMERIC" | "MULTIPLE_CHOICE";

export type MarketOutcome = {
  label: string;
  initial_probability: number;
};

export type MarketEvidence = {
  quote: string;
  approx_time: string | null;
};

export type GeneratedMarketIdea = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  market_type: MarketType;
  resolution_criteria: string;
  close_time_guess: string | null;
  outcomes: MarketOutcome[];
  scores: {
    creativity: number;
    clarity: number;
    evidence: number;
    fun: number;
  };
  evidence: MarketEvidence[];
};

export type LlmMarketsResponse = {
  market_ideas: GeneratedMarketIdea[];
};

const categorySchema = z.enum([
  "Friends",
  "Tonight",
  "Weekend",
  "Plans",
  "Attendance",
  "Logistics",
  "Chaos",
  "Other"
]);

const marketTypeSchema = z.enum(["YES_NO", "NUMERIC", "MULTIPLE_CHOICE"]);

const outcomeSchema = z.object({
  label: z.string().min(1),
  initial_probability: z.number().finite().min(0).max(1)
});

const evidenceSchema = z.object({
  quote: z.string().min(1),
  approx_time: z.string().nullable()
});

export const marketIdeaSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    category: categorySchema,
    market_type: marketTypeSchema,
    resolution_criteria: z.string().min(1),
    close_time_guess: z.string().nullable(),
    outcomes: z.array(outcomeSchema).min(2),
    scores: z.object({
      creativity: z.number().finite().min(0).max(1),
      clarity: z.number().finite().min(0).max(1),
      evidence: z.number().finite().min(0).max(1),
      fun: z.number().finite().min(0).max(1)
    }),
    evidence: z.array(evidenceSchema).min(1).max(3)
  })
  .superRefine((value: GeneratedMarketIdea, ctx: { addIssue: (issue: unknown) => void }) => {
    const sum = value.outcomes.reduce((acc, outcome) => acc + outcome.initial_probability, 0);
    if (Math.abs(sum - 1) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Outcome probabilities must sum to 1 (got ${sum.toFixed(3)}).`,
        path: ["outcomes"]
      });
    }

    if (value.market_type === "YES_NO" && value.outcomes.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "YES_NO markets must have exactly 2 outcomes.",
        path: ["outcomes"]
      });
    }

    if (!value.close_time_guess) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_time_guess must be non-null for all markets.",
        path: ["close_time_guess"]
      });
      return;
    }

    const closeTime = new Date(value.close_time_guess);
    if (Number.isNaN(closeTime.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_time_guess must be a valid ISO datetime string.",
        path: ["close_time_guess"]
      });
    }
  });

export const llmMarketsResponseSchema = z
  .object({
    market_ideas: z.array(marketIdeaSchema).min(12).max(20)
  })
  .superRefine((value: LlmMarketsResponse, ctx: { addIssue: (issue: unknown) => void }) => {
    const counts = value.market_ideas.reduce(
      (acc, market) => {
        acc[market.market_type] += 1;
        return acc;
      },
      {
        YES_NO: 0,
        NUMERIC: 0,
        MULTIPLE_CHOICE: 0
      }
    );

    if (counts.YES_NO < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 6 YES_NO markets are required.",
        path: ["market_ideas"]
      });
    }

    if (counts.NUMERIC < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 4 NUMERIC markets are required.",
        path: ["market_ideas"]
      });
    }

    if (counts.MULTIPLE_CHOICE < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 2 MULTIPLE_CHOICE markets are required.",
        path: ["market_ideas"]
      });
    }
  });

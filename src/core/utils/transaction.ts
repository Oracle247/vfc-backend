import stringSimilarity from "string-similarity";

export type ExpenseCategory =
  | "operational"
  | "work_repair"
  | "welfare"
  | "hospitality";

interface Totals {
  operational: number;
  welfare: number;
  hospitality: number;
  work_repair: number;
  uncategorized: number;
  uncategorizedNarrations: string[];
}

const SIMILARITY_THRESHOLD = 0.75;

// const categories: Record<ExpenseCategory, string[]> = {
//   operational: ["fuel", "petrol", "diesel", "pms", "engine", "data", "oil", "battery", "batteries", "generator", "chairs", "drink"],
//   work_repair: ["repair", "maintenance", "service", "fix", "work", "vellum", "velom", "drum", "generator", 'ratchet', "speaker", "soldering", "water", "speakion"],
//   welfare: ["welfare", "allowance", "support", "food", "tp", "airtime", "resources", "handkerchief", "wood", "transport"],
//   hospitality: ["hospitality", "drugs", "treatments"],
// };

const categories: Record<ExpenseCategory, string[]> = {
  operational: ["fuel", "petrol", "diesel", "pms", "engine", "data", "oil", "battery", "batteries", "chairs", "drink"],
  work_repair: ["repair", "maintenance", "service", "fix", "work", "vellum", "velom", "drum", 'ratchet', "speaker", "soldering", "water", "speakon", "electrical items", "tube light", "gun tacker pin", "fishing line", "4 ltrs gallon", "wire", "tube light"],
  welfare: ["welfare", "allowance", "support", "food", "tp", "airtime", "resources", "handkerchief", "wood", "transport"],
  hospitality: ["hospitality", "drugs", "treatments"],
};

export interface StatementRow {
  Narration: string;
  "Settlement Debit (NGN)"?: number | string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}

function detectCategory(description: string): ExpenseCategory | null {
  const words = normalize(description).split(/\s+/);

  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      const match = stringSimilarity.findBestMatch(keyword, words);
      if (match.bestMatch.rating >= SIMILARITY_THRESHOLD) {
        return category as ExpenseCategory;
      }
    }
  }
  return null;
}

export function analyzeTransactions(transactions: any[]): Totals {
  const totals: Totals = {
    operational: 0,
    welfare: 0,
    hospitality: 0,
    work_repair: 0,
    uncategorized: 0,
    uncategorizedNarrations: []
  };


  for (const tx of transactions) {
    if (!tx.Narration || !tx["Settlement Debit (NGN)"]) continue;

    const amount = Number(tx["Settlement Debit (NGN)"]);
    if (amount <= 0) continue;

    const category = detectCategory(tx.Narration);

    if (category) {
      totals[category] += amount;
    } else {
      totals.uncategorized += amount;
      totals.uncategorizedNarrations.push(tx.Narration);
    }
  }


  return totals;
}

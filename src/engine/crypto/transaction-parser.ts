export interface RawCryptoTransaction {
  date: string;
  type: "buy" | "sell" | "trade" | "staking_reward" | "mining" | "airdrop" | "transfer";
  asset: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  fee?: number | undefined;
  exchange?: string | undefined;
}

export interface ParsedCryptoLot {
  id: string;
  asset: string;
  dateAcquired: string;
  costBasis: number;
  amount: number;
  source: "purchase" | "staking" | "mining" | "airdrop" | "trade";
  exchange?: string | undefined;
}

export interface CryptoDisposal {
  id: string;
  asset: string;
  dateSold: string;
  proceeds: number;
  amount: number;
  costBasis: number;
  gainOrLoss: number;
  holdingPeriod: "short-term" | "long-term";
  lots: Array<{ lotId: string; amountUsed: number; costBasis: number }>;
}

export function parseCsvTransactions(csv: string, exchange: string): RawCryptoTransaction[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
  const transactions: RawCryptoTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j] ?? "";
    }

    const parsed = mapExchangeRow(row, exchange);
    if (parsed) {
      transactions.push({ ...parsed, exchange });
    }
  }

  return transactions;
}

function mapExchangeRow(row: Record<string, string>, exchange: string): RawCryptoTransaction | null {
  switch (exchange.toLowerCase()) {
    case "coinbase": return mapCoinbaseRow(row);
    case "kraken": return mapKrakenRow(row);
    case "binance": return mapBinanceRow(row);
    default: return mapGenericRow(row);
  }
}

function mapCoinbaseRow(row: Record<string, string>): RawCryptoTransaction | null {
  const type = mapTransactionType(row["type"] ?? row["transaction type"] ?? "");
  if (!type) return null;

  return {
    date: row["timestamp"] ?? row["date"] ?? "",
    type,
    asset: row["asset"] ?? row["currency"] ?? "",
    amount: parseFloat(row["quantity"] ?? row["amount"] ?? "0"),
    pricePerUnit: parseFloat(row["spot price at transaction"] ?? row["price"] ?? "0"),
    totalValue: parseFloat(row["total (inclusive of fees and/or spread)"] ?? row["total"] ?? "0"),
    fee: parseFloat(row["fees and/or spread"] ?? row["fee"] ?? "0") || undefined,
  };
}

function mapKrakenRow(row: Record<string, string>): RawCryptoTransaction | null {
  const type = mapTransactionType(row["type"] ?? "");
  if (!type) return null;

  return {
    date: row["time"] ?? row["date"] ?? "",
    type,
    asset: row["pair"] ?? row["asset"] ?? "",
    amount: Math.abs(parseFloat(row["vol"] ?? row["amount"] ?? "0")),
    pricePerUnit: parseFloat(row["price"] ?? "0"),
    totalValue: Math.abs(parseFloat(row["cost"] ?? row["total"] ?? "0")),
    fee: parseFloat(row["fee"] ?? "0") || undefined,
  };
}

function mapBinanceRow(row: Record<string, string>): RawCryptoTransaction | null {
  const type = mapTransactionType(row["operation"] ?? row["type"] ?? "");
  if (!type) return null;

  return {
    date: row["utc_time"] ?? row["date"] ?? "",
    type,
    asset: row["coin"] ?? row["asset"] ?? "",
    amount: parseFloat(row["change"] ?? row["amount"] ?? "0"),
    pricePerUnit: 0, // Binance CSV often doesn't include price — caller must enrich
    totalValue: parseFloat(row["total"] ?? "0"),
  };
}

function mapGenericRow(row: Record<string, string>): RawCryptoTransaction | null {
  const type = mapTransactionType(row["type"] ?? row["transaction_type"] ?? "");
  if (!type) return null;

  return {
    date: row["date"] ?? row["timestamp"] ?? "",
    type,
    asset: row["asset"] ?? row["currency"] ?? row["coin"] ?? "",
    amount: parseFloat(row["amount"] ?? row["quantity"] ?? "0"),
    pricePerUnit: parseFloat(row["price"] ?? row["price_per_unit"] ?? "0"),
    totalValue: parseFloat(row["total"] ?? row["total_value"] ?? "0"),
    fee: parseFloat(row["fee"] ?? "0") || undefined,
  };
}

function mapTransactionType(raw: string): RawCryptoTransaction["type"] | null {
  const normalized = raw.toLowerCase().trim();
  if (["buy", "purchase"].includes(normalized)) return "buy";
  if (["sell"].includes(normalized)) return "sell";
  if (["trade", "swap", "convert"].includes(normalized)) return "trade";
  if (["staking_reward", "staking", "reward", "earn"].includes(normalized)) return "staking_reward";
  if (["mining", "mined"].includes(normalized)) return "mining";
  if (["airdrop"].includes(normalized)) return "airdrop";
  if (["send", "receive", "transfer", "deposit", "withdrawal"].includes(normalized)) return "transfer";
  return null;
}

export function buildLotsFromTransactions(transactions: RawCryptoTransaction[]): ParsedCryptoLot[] {
  const lots: ParsedCryptoLot[] = [];
  let lotCounter = 0;

  for (const tx of transactions) {
    if (tx.type === "buy" || tx.type === "trade" || tx.type === "staking_reward" || tx.type === "mining" || tx.type === "airdrop") {
      lotCounter++;
      const source: ParsedCryptoLot["source"] =
        tx.type === "staking_reward" ? "staking" :
        tx.type === "mining" ? "mining" :
        tx.type === "airdrop" ? "airdrop" :
        tx.type === "trade" ? "trade" : "purchase";

      lots.push({
        id: `lot-${lotCounter}`,
        asset: tx.asset,
        dateAcquired: tx.date,
        costBasis: tx.totalValue + (tx.fee ?? 0),
        amount: tx.amount,
        source,
        exchange: tx.exchange,
      });
    }
  }

  return lots;
}

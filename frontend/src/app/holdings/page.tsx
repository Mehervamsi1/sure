"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import {
  api, Account, Holding, QuoteResult, HistoryPoint, CURRENCIES
} from "@/lib/api";

const formatCurrency = (value: number, currencyCode: string = "USD") => {
  const curr = CURRENCIES.find(c => c.code === currencyCode);
  const symbol = curr?.symbol || "$";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? "-" : ""}${symbol}${formatted}`;
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  depository: "Checking / Savings",
  credit_card: "Credit Card",
  investment: "Investment",
  loan: "Loan",
  property: "Property",
  vehicle: "Vehicle",
  crypto: "Crypto",
  other_asset: "Other Asset",
  other_liability: "Other Liability",
};

const MARKET_LABELS: Record<string, string> = {
  NYQ: "US Market", NMS: "US Market", NGM: "US Market", PCX: "US Market", BTS: "US Market",
  NSI: "Indian Market", BSE: "Indian Market", BOM: "Indian Market",
  TOR: "Canadian Market", CNQ: "Canadian Market", NEO: "Canadian Market",
  LSE: "UK Market", IOB: "UK Market",
  FRA: "European Market", GER: "European Market", PAR: "European Market",
  TYO: "Japanese Market",
  SHH: "Chinese Market", SHZ: "Chinese Market",
};

type PanelView = "type" | "market" | "crypto";

export default function Holdings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [sparklines, setSparklines] = useState<Record<string, HistoryPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelView>("type");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const results = await Promise.allSettled([
      api.getAccounts(),
      api.getHoldings(),
    ]);
    const accts = results[0].status === "fulfilled" ? results[0].value : [];
    const holds = results[1].status === "fulfilled" ? results[1].value : [];
    setAccounts(accts);
    setHoldings(holds);

    if (holds.length > 0) {
      const tickers = holds.map(h => h.ticker);
      try {
        const q = await api.getQuotes(tickers);
        setQuotes(q);
      } catch {}

      const topHoldings = holds.slice(0, 10);
      const sparkPromises = topHoldings.map(async (h) => {
        try {
          const hist = await api.getHistory(h.ticker, "1mo");
          return { ticker: h.ticker, data: hist };
        } catch { return { ticker: h.ticker, data: [] as HistoryPoint[] }; }
      });
      const sparkResults = await Promise.allSettled(sparkPromises);
      const sparkMap: Record<string, HistoryPoint[]> = {};
      sparkResults.forEach(r => {
        if (r.status === "fulfilled" && r.value.data.length > 0) {
          sparkMap[r.value.ticker] = r.value.data;
        }
      });
      setSparklines(sparkMap);
    }

    setLoading(false);
  };

  const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => {
    const q = quotes[h.ticker];
    return sum + (q ? q.price * h.quantity : h.total_invested);
  }, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const holdingsByType: Record<string, Holding[]> = {};
  const holdingsByMarket: Record<string, Holding[]> = {};
  const cryptoHoldings: Holding[] = [];

  holdings.forEach(h => {
    const typeLabel = h.asset_type === "stock" ? "Equities" : h.asset_type === "etf" ? "ETFs" : h.asset_type === "mutual_fund" ? "Mutual Funds" : h.asset_type === "commodity" ? "Commodities" : "Other";
    if (h.asset_type === "crypto") {
      cryptoHoldings.push(h);
    } else {
      if (!holdingsByType[typeLabel]) holdingsByType[typeLabel] = [];
      holdingsByType[typeLabel].push(h);
    }

    if (h.asset_type !== "crypto") {
      const market = MARKET_LABELS[h.exchange || ""] || "Other Market";
      if (!holdingsByMarket[market]) holdingsByMarket[market] = [];
      holdingsByMarket[market].push(h);
    }
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Holdings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />

      <section className="mb-12">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Holdings</h1>
        <p className="text-muted-foreground">Your complete financial position.</p>
      </section>

      {/* Accounts Section */}
      <section className="mb-16">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(acc => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-serif text-xl block">{acc.name}</span>
                  {acc.institution_name && (
                    <span className="text-xs text-muted-foreground">{acc.institution_name}</span>
                  )}
                </div>
                <span className="text-xs tracking-widest uppercase text-muted-foreground border border-border px-2 py-1">
                  {ACCOUNT_TYPE_LABELS[acc.type] || acc.type}
                </span>
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className={`font-serif text-2xl ${acc.balance < 0 ? "text-negative" : "text-foreground"}`}>
                  {formatCurrency(acc.balance, acc.currency)}
                </span>
                <span className="text-xs text-muted-foreground">{acc.currency}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <section className="mb-16 text-center">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Portfolio Value</h2>
          <p className="font-serif text-5xl md:text-6xl tracking-tighter mb-2">
            {formatCurrency(totalCurrentValue, "USD")}
          </p>
          <div className="flex justify-center gap-6 text-sm mb-2">
            <span className="text-muted-foreground">Invested: {formatCurrency(totalInvested, "USD")}</span>
            <span className={totalGainLoss >= 0 ? "text-positive" : "text-negative"}>
              {totalGainLoss >= 0 ? "+" : ""}{formatCurrency(totalGainLoss, "USD")} ({totalGainLossPercent.toFixed(1)}%)
            </span>
          </div>
        </section>
      )}

      {/* Three-Panel Navigation */}
      {holdings.length > 0 && (
        <>
          <div className="flex justify-center gap-2 mb-8">
            {(["type", "market", "crypto"] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`py-2 px-6 text-sm tracking-widest uppercase border transition-colors ${
                  activePanel === panel
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:border-foreground"
                }`}
              >
                {panel === "type" ? "By Type" : panel === "market" ? "By Market" : "Crypto"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activePanel === "type" && (
              <motion.section
                key="type"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {Object.entries(holdingsByType).map(([type, items]) => (
                  <div key={type} className="mb-10">
                    <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">{type}</h3>
                    <div className="border-t border-border">
                      {items.map(h => (
                        <HoldingCard key={h.id} holding={h} quote={quotes[h.ticker]} sparkline={sparklines[h.ticker]} />
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(holdingsByType).length === 0 && (
                  <p className="text-center text-muted-foreground italic py-8">No non-crypto holdings yet.</p>
                )}
              </motion.section>
            )}

            {activePanel === "market" && (
              <motion.section
                key="market"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {Object.entries(holdingsByMarket).map(([market, items]) => (
                  <div key={market} className="mb-10">
                    <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">{market}</h3>
                    <div className="border-t border-border">
                      {items.map(h => (
                        <HoldingCard key={h.id} holding={h} quote={quotes[h.ticker]} sparkline={sparklines[h.ticker]} />
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(holdingsByMarket).length === 0 && (
                  <p className="text-center text-muted-foreground italic py-8">No market holdings yet.</p>
                )}
              </motion.section>
            )}

            {activePanel === "crypto" && (
              <motion.section
                key="crypto"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="border-t border-border">
                  {cryptoHoldings.length > 0 ? (
                    cryptoHoldings.map(h => (
                      <HoldingCard key={h.id} holding={h} quote={quotes[h.ticker]} sparkline={sparklines[h.ticker]} />
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground italic py-8">No crypto holdings yet.</p>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </>
      )}

      {holdings.length === 0 && (
        <section className="text-center py-16">
          <p className="text-muted-foreground italic mb-4">No investment holdings recorded yet.</p>
          <a href="/transactions" className="text-sm underline text-muted-foreground hover:text-foreground">
            Record your first investment in The Archive →
          </a>
        </section>
      )}
    </div>
  );
}


function HoldingCard({ holding, quote, sparkline }: {
  holding: Holding;
  quote?: QuoteResult;
  sparkline?: HistoryPoint[];
}) {
  const currentPrice = quote?.price || holding.avg_cost_price;
  const currentValue = currentPrice * holding.quantity;
  const gainLoss = currentValue - holding.total_invested;
  const gainLossPercent = holding.total_invested > 0 ? (gainLoss / holding.total_invested) * 100 : 0;

  const sparkData = sparkline?.map(p => ({ close: p.close })) || [];
  const sparkChange = sparkData.length >= 2 ? sparkData[sparkData.length - 1].close - sparkData[0].close : 0;

  return (
    <div className="border-b border-border/50 py-5 px-2 hover:bg-muted/20 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-xl">{holding.ticker}</span>
            <span className="text-sm text-muted-foreground">{holding.asset_name}</span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>{holding.quantity} units</span>
            <span>Avg: {formatCurrency(holding.avg_cost_price, holding.currency)}</span>
            {holding.broker_name && <span>{holding.broker_name}{holding.broker_account_last4 ? ` ···${holding.broker_account_last4}` : ""}</span>}
          </div>
        </div>

        {sparkData.length > 1 && (
          <div className="w-20 h-10 mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Line type="monotone" dataKey="close" stroke={sparkChange >= 0 ? "#4E8A6E" : "#D35236"} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="text-right">
          <span className="font-serif text-xl block">{formatCurrency(currentValue, holding.currency)}</span>
          <span className={`text-sm ${gainLoss >= 0 ? "text-positive" : "text-negative"}`}>
            {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss, holding.currency)} ({gainLossPercent.toFixed(1)}%)
          </span>
          {quote && (
            <span className={`text-xs block mt-1 ${quote.change >= 0 ? "text-positive" : "text-negative"}`}>
              {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(1)}%) today
            </span>
          )}
        </div>
      </div>
      {holding.notes && (
        <p className="text-xs text-muted-foreground italic mt-2">{holding.notes}</p>
      )}
    </div>
  );
}

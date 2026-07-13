"use client";

import { useMemo, useState } from "react";
import type { InventoryRow } from "@/lib/analytics-data";
import InfoButton from "../InfoButton";
import { downloadCsv } from "../export";

export default function InventorySection({
  rows,
  methodology,
}: {
  rows: InventoryRow[];
  methodology: { leadTimeDays: number; serviceLevelZ: number; lookbackDays: number };
}) {
  const [showAll, setShowAll] = useState(false);
  const flagged = useMemo(() => rows.filter((r) => r.needsReorder), [rows]);
  const visible = showAll ? rows : flagged;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {flagged.length} SKU{flagged.length === 1 ? "" : "s"} need{flagged.length === 1 ? "s" : ""} reordering right now
          <InfoButton title="How reorder points are set">
            <p>
              Reorder point = (average daily demand &times; lead time) + safety stock, where safety
              stock = {methodology.serviceLevelZ} &times; (standard deviation of daily demand) &times;
              &radic;lead time.
            </p>
            <p className="mt-2">
              Average and variability of demand come from each SKU&apos;s last {methodology.lookbackDays} days
              of actual sales, counting days with no sale as zero demand. Lead time is assumed to be{" "}
              {methodology.leadTimeDays} days (a mainland-to-Apo-Island resupply window). The{" "}
              {methodology.serviceLevelZ} multiplier targets roughly a 95% chance of not running out
              before the next delivery arrives.
            </p>
            <p className="mt-2">
              A SKU is flagged when its sellable stock on hand is at or below this threshold.
            </p>
          </InfoButton>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
          >
            {showAll ? "Show only low stock" : "Show all SKUs"}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "inventory-reorder.csv",
                ["SKU", "Product", "OnHand", "AvailableForSale", "AvgDailyDemand", "ReorderPoint", "NeedsReorder", "DaysOfStockLeft"],
                rows.map((r) => [
                  r.sku,
                  r.productName,
                  r.onHand,
                  r.availableForSale,
                  r.avgDailyDemand,
                  r.reorderPoint,
                  r.needsReorder ? "Yes" : "No",
                  r.daysOfStockLeft ?? "",
                ])
              )
            }
            className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-sand-dark/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand/60 text-foreground/70">
            <tr>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="px-3 py-2 text-right font-medium">Avg daily demand</th>
              <th className="px-3 py-2 text-right font-medium">Reorder point</th>
              <th className="px-3 py-2 text-right font-medium">Days of stock left</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-foreground/50">
                  Nothing needs reordering right now.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.sku} className={`border-t border-sand-dark/40 ${r.needsReorder ? "bg-coral/5" : ""}`}>
                <td className="px-3 py-2 font-medium text-ocean-dark">{r.sku}</td>
                <td className="px-3 py-2">{r.productName}</td>
                <td className="px-3 py-2 text-right">{r.availableForSale}</td>
                <td className="px-3 py-2 text-right">{r.avgDailyDemand}</td>
                <td className="px-3 py-2 text-right">{r.reorderPoint}</td>
                <td className="px-3 py-2 text-right">
                  {r.needsReorder && (
                    <span className="mr-1 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-medium text-coral">
                      Reorder
                    </span>
                  )}
                  {r.daysOfStockLeft ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

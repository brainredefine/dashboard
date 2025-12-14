"use client";

import { useState, useMemo } from "react";
import { FileText, Calendar, Building, Layers, List } from "lucide-react";

// Helpers
const currencyFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
function fmtEUR(n: number) { return currencyFmt.format(n); }

// Type pour nos données
type ReceivableRow = {
  tenant: string;
  contact_name?: string;
  unit_id: string;
  city: string;
  invoice_date: string;
  bucket_1_30: number | string;
  bucket_31_60: number | string;
  bucket_61_90: number | string;
  bucket_90_120: number | string;
  bucket_120_plus: number | string;
  total: number | string;
};

export default function ArrearsTable({ data }: { data: ReceivableRow[] }) {
  const [viewMode, setViewMode] = useState<"group" | "line">("group");

  // --- LOGIQUE D'AGRÉGATION ---
  const displayedData = useMemo(() => {
    if (viewMode === "line") return data;

    // 1. On regroupe par "Nom du Groupe" (ou Tenant si pas de groupe)
    const groups: Record<string, any> = {};

    data.forEach((row) => {
      // Clé de regroupement : contact_name si dispo, sinon tenant
      const key = row.contact_name || row.tenant;

      if (!groups[key]) {
        // Initialisation du groupe avec la première ligne trouvée
        groups[key] = {
          ...row,
          // On force le nom d'affichage pour le groupe
          display_name: key,
          is_group: true,
          count: 0,
          // On remet les compteurs à 0 pour faire la somme proprement
          bucket_1_30: 0,
          bucket_31_60: 0,
          bucket_61_90: 0,
          bucket_90_120: 0,
          bucket_120_plus: 0,
          total: 0,
        };
      }

      // Somme des montants
      groups[key].bucket_1_30 += Number(row.bucket_1_30 || 0);
      groups[key].bucket_31_60 += Number(row.bucket_31_60 || 0);
      groups[key].bucket_61_90 += Number(row.bucket_61_90 || 0);
      groups[key].bucket_90_120 += Number(row.bucket_90_120 || 0);
      groups[key].bucket_120_plus += Number(row.bucket_120_plus || 0);
      groups[key].total += Number(row.total || 0);
      groups[key].count += 1;
    });

    // 2. On transforme l'objet en tableau et on trie par Total décroissant
    return Object.values(groups).sort((a: any, b: any) => b.total - a.total);
  }, [data, viewMode]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      
      {/* Header avec Toggle */}
      <div className="border-b border-zinc-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Arrears Details</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            {viewMode === "group" ? "Consolidated view by Debtor Group" : "Detailed view by Invoice"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-zinc-100 border border-zinc-200">
            <button
              onClick={() => setViewMode("group")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "group" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Layers size={14} />
              Group View
            </button>
            <button
              onClick={() => setViewMode("line")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "line" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <List size={14} />
              Single Line
            </button>
          </div>
          
          <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

          <button className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors">
             Export CSV <FileText size={12} />
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/50 text-xs font-medium uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-semibold min-w-[250px]">
                {viewMode === "group" ? "Debtor Group" : "Tenant"}
              </th>
              <th className="px-6 py-3 font-semibold">
                {viewMode === "group" ? "Open Items" : "Unit / Invoice"}
              </th>
              <th className="px-6 py-3 font-semibold text-right">1-30</th>
              <th className="px-6 py-3 font-semibold text-right">31-60</th>
              <th className="px-6 py-3 font-semibold text-right">61-90</th>
              <th className="px-6 py-3 font-semibold text-right text-rose-600">90+</th>
              <th className="px-6 py-3 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayedData.map((r: any, i: number) => {
              const riskAmount = Number(r.bucket_90_120) + Number(r.bucket_120_plus);
              const isRisky = riskAmount > 0;
              
              return (
                <tr key={i} className="group hover:bg-zinc-50/40 transition-colors">
                  
                  {/* COLONNE 1 : NOM */}
                  <td className="px-6 py-4 font-medium text-zinc-900 whitespace-normal break-words">
                    {viewMode === "group" ? (
                      // --- VUE GROUPE ---
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 border border-zinc-200">
                          <Building size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 text-sm">{r.display_name}</span>
                          <span className="text-xs text-zinc-400 font-normal">{r.city} (HQ)</span>
                        </div>
                      </div>
                    ) : (
                      // --- VUE LIGNE ---
                      <div className="flex flex-col">
                        <span>{r.tenant}</span>
                        {r.contact_name && r.contact_name !== r.tenant && (
                           <span className="text-[10px] text-zinc-400">Group: {r.contact_name}</span>
                        )}
                        <span className="text-xs text-zinc-400 font-normal mt-0.5">{r.city}</span>
                      </div>
                    )}
                  </td>

                  {/* COLONNE 2 : INFO / COUNT */}
                  <td className="px-6 py-4 text-zinc-600 align-middle">
                    {viewMode === "group" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                        {r.count} Invoices
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{r.unit_id}</span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-100 w-fit px-1.5 py-0.5 rounded border border-zinc-200">
                          <Calendar size={10} /> {r.invoice_date}
                        </div>
                      </div>
                    )}
                  </td>
                  
                  {/* BUCKETS (Identiques pour les deux vues) */}
                  <td className="px-6 py-4 text-right tabular-nums text-zinc-500 align-middle">
                    {Number(r.bucket_1_30) ? fmtEUR(Number(r.bucket_1_30)) : "-"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-zinc-500 align-middle">
                    {Number(r.bucket_31_60) ? fmtEUR(Number(r.bucket_31_60)) : "-"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-zinc-500 align-middle">
                    {Number(r.bucket_61_90) ? fmtEUR(Number(r.bucket_61_90)) : "-"}
                  </td>
                  
                  {/* RISQUE */}
                  <td className={`px-6 py-4 text-right tabular-nums font-medium align-middle ${isRisky ? "text-rose-600" : "text-zinc-300"}`}>
                    {riskAmount ? fmtEUR(riskAmount) : "-"}
                  </td>
                  
                  {/* TOTAL */}
                  <td className="px-6 py-4 text-right font-bold text-zinc-900 tabular-nums align-middle">
                    {fmtEUR(Number(r.total))}
                  </td>
                </tr>
              );
            })}
            
            {displayedData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                  No open receivables found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
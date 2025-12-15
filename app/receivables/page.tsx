import Link from "next/link"; // <--- Import navigation
import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import ArrearsTable from "@/components/ArrearsTable";
import { TopTenantsChart, AgingChart } from "@/components/Charts";
import { supabaseServer } from "@/lib/supabaseServer";
import { 
  Banknote, AlertTriangle, ShieldCheck, UserX, 
  LayoutDashboard, FileText // <--- Import icônes nav
} from "lucide-react";

//Helpers
const currencyFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

function fmtEUR(n: number) { return currencyFmt.format(n); }
function fmtNum(n: number) { return numFmt.format(n); }
function fmtPct(n: number) { return pctFmt.format(n); }

// Fonction locale pour parser les paramètres d'URL
function parseFilters(sp: { [key: string]: string | string[] | undefined }) {
  function toArr(v?: string | string[]) {
    if (!v) return undefined;
    const s = Array.isArray(v) ? v.join(",") : v;
    const arr = s.split(",").map(x => x.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return {
    fund: toArr(sp.fund),
    entity: toArr(sp.entity),
    country: toArr(sp.country),
    city: toArr(sp.city),
    search: typeof sp.q === "string" ? sp.q : undefined,
  };
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const sb = supabaseServer();

  const common = {
    p_fund: f.fund ?? null,
    p_entity: f.entity ?? null,
    p_country: f.country ?? null,
    p_city: f.city ?? null,
    p_search: f.search ?? null,
  };

  // Chargement parallèle des données
  const [
    { data: metrics, error: e1 },
    { data: aging, error: e2 },
    { data: topDebtors, error: e3 },
    { data: list, error: e4 },
    { data: optionsJson, error: e5 },
  ] = await Promise.all([
    sb.rpc("receivables_metrics", common),
    sb.rpc("receivables_aging_breakdown", common),
    sb.rpc("receivables_top_debtors", { p_limit: 8, ...common }),
    sb.rpc("receivables_list", { p_limit: 100, ...common }),
    sb.rpc("receivables_filter_options", common),
  ]);

  // Gestion d'erreur minimale pour l'UI
  if (e1 || e2 || e3 || e4 || e5) {
    console.error("Receivables Error:", { e1, e2, e3, e4, e5 });
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-zinc-500">
        <AlertTriangle className="mb-2 h-10 w-10 text-rose-500" />
        <p>Error loading receivables data. Please refresh.</p>
      </div>
    );
  }

  // --- Parsing Metrics ---
  const m = metrics?.[0] ?? { 
    total_debt: 0, 
    risk_debt_90_plus: 0, 
    fresh_debt_30: 0, 
    row_count: 0,
    max_single_tenant_debt: 0
  };

  // --- Parsing Options (Sécurisé) ---
  let rawOpts: any = {};
  if (Array.isArray(optionsJson) && optionsJson.length > 0) rawOpts = optionsJson[0];
  else if (optionsJson && typeof optionsJson === 'object') rawOpts = optionsJson;

  const safeOptions = {
    fund: Array.isArray(rawOpts?.fund) ? rawOpts.fund : [],
    entity: Array.isArray(rawOpts?.entity) ? rawOpts.entity : [],
    country: Array.isArray(rawOpts?.country) ? rawOpts.country : [],
    city: Array.isArray(rawOpts?.city) ? rawOpts.city : [],
  };

  // --- Calculs Ratios ---
  const totalDebt = Number(m.total_debt) || 0;
  const riskDebt = Number(m.risk_debt_90_plus) || 0;
  const freshDebt = Number(m.fresh_debt_30) || 0;
  
  const riskRatio = totalDebt > 0 ? riskDebt / totalDebt : 0;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      
      {/* Barre de Filtres */}
      <FilterBar options={safeOptions} />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        
        {/* Header avec Navigation */}
        <div className="mb-8 mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Receivables & Collection</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Consolidated arrears overview · <span className="font-medium text-zinc-700">{m.row_count} Open Invoices</span>
            </p>
          </div>

          {/* Navigation Switcher */}
          <div className="flex items-center gap-4">
             {/* Total Debt (Visible Desktop) */}
             <div className="text-right hidden lg:block mr-4 border-r border-zinc-200 pr-6">
                <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Outstanding</div>
                <div className="text-2xl font-bold text-zinc-900 tabular-nums">{fmtEUR(totalDebt)}</div>
             </div>

             {/* Toggle Switch */}
             <div className="flex items-center gap-1 bg-zinc-200/50 p-1 rounded-xl border border-zinc-200">
               <Link 
                 href="/" 
                 className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-white/50 transition-all"
               >
                 <LayoutDashboard size={14} />
                 Overview
               </Link>
               <div className="flex items-center gap-2 px-4 py-1.5 bg-white shadow-sm rounded-lg border border-zinc-200/50 cursor-default">
                 <FileText size={14} className="text-zinc-900" />
                 <span className="text-sm font-semibold text-zinc-900">Receivables</span>
               </div>
             </div>
          </div>
        </div>

        {/* LIGNE 1 : KPIs Financiers */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="Total Outstanding" 
            value={fmtEUR(totalDebt)} 
            subtitle="Total arrears across portfolio" 
            icon={Banknote}
            variant="primary"
          />
          
          <KpiCard 
            title="Severe Risk (>90d)" 
            value={fmtEUR(riskDebt)} 
            subtitle={`${fmtPct(riskRatio)} of total debt`} 
            icon={AlertTriangle}
            variant={riskRatio > 0.15 ? "danger" : riskRatio > 0.05 ? "warning" : "default"} 
          />
          
          <KpiCard 
            title="Fresh Debt (<30d)" 
            value={fmtEUR(freshDebt)} 
            subtitle="Likely technical arrears" 
            icon={ShieldCheck}
            variant="default"
          />
          
          <KpiCard 
            title="Top Group Exposure" 
            value={fmtEUR(Number(m.max_single_tenant_debt))} 
            subtitle="Largest single debtor group" 
            icon={UserX}
          />
        </div>

        {/* Graphiques */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[420px]">
             {/* Graphique d'Aging */}
             <AgingChart data={aging ?? []} />
          </div>
          <div className="h-[420px]">
            {/* Top Debtors (Consolidé par Groupe via SQL) */}
            <TopTenantsChart 
              data={(topDebtors ?? []).map((r: any) => ({
                tenant: r.tenant ?? "Unknown", 
                net_rent_year: Number(r.total_debt ?? 0)
              }))} 
            />
          </div>
        </div>

        {/* Tableau (Client Component) */}
        <ArrearsTable data={list ?? []} />

      </main>
    </div>
  );
}
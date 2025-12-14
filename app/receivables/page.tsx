import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import ArrearsTable from "@/components/ArrearsTable"; // <--- Import du nouveau composant
import { TopTenantsChart, AgingChart } from "@/components/Charts";
import { supabaseServer } from "@/lib/supabaseServer";
import { Banknote, AlertTriangle, ShieldCheck, UserX } from "lucide-react";

// Helpers
const currencyFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

function fmtEUR(n: number) { return currencyFmt.format(n); }
function fmtNum(n: number) { return numFmt.format(n); }
function fmtPct(n: number) { return pctFmt.format(n); }

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

  if (e1 || e2 || e3 || e4 || e5) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-zinc-500">
        <AlertTriangle className="mb-2 h-10 w-10 text-rose-500" />
        <p>Error loading receivables data. Please refresh.</p>
      </div>
    );
  }

  // Parsing
  const m = metrics?.[0] ?? { total_debt: 0, risk_debt_90_plus: 0, fresh_debt_30: 0, row_count: 0, max_single_tenant_debt: 0 };
  let rawOpts: any = {};
  if (Array.isArray(optionsJson) && optionsJson.length > 0) rawOpts = optionsJson[0];
  else if (optionsJson && typeof optionsJson === 'object') rawOpts = optionsJson;

  const safeOptions = {
    fund: Array.isArray(rawOpts?.fund) ? rawOpts.fund : [],
    entity: Array.isArray(rawOpts?.entity) ? rawOpts.entity : [],
    country: Array.isArray(rawOpts?.country) ? rawOpts.country : [],
    city: Array.isArray(rawOpts?.city) ? rawOpts.city : [],
  };

  const totalDebt = Number(m.total_debt) || 0;
  const riskDebt = Number(m.risk_debt_90_plus) || 0;
  const freshDebt = Number(m.fresh_debt_30) || 0;
  const riskRatio = totalDebt > 0 ? riskDebt / totalDebt : 0;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      <FilterBar options={safeOptions} />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Receivables & Collection</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Consolidated arrears overview · <span className="font-medium text-zinc-700">{m.row_count} Open Invoices</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Outstanding</div>
            <div className="text-3xl font-bold text-zinc-900 tabular-nums">{fmtEUR(totalDebt)}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Total Outstanding" value={fmtEUR(totalDebt)} subtitle="Total arrears across portfolio" icon={Banknote} variant="primary" />
          <KpiCard title="Severe Risk (>90d)" value={fmtEUR(riskDebt)} subtitle={`${fmtPct(riskRatio)} of total debt`} icon={AlertTriangle} variant={riskRatio > 0.15 ? "danger" : riskRatio > 0.05 ? "warning" : "default"} />
          <KpiCard title="Fresh Debt (<30d)" value={fmtEUR(freshDebt)} subtitle="Likely technical arrears" icon={ShieldCheck} variant="default" />
          <KpiCard title="Top Group Exposure" value={fmtEUR(Number(m.max_single_tenant_debt))} subtitle="Largest single debtor group" icon={UserX} />
        </div>

        {/* Charts */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[420px]">
             <AgingChart data={aging ?? []} />
          </div>
          <div className="h-[420px]">
            <TopTenantsChart 
              data={(topDebtors ?? []).map((r: any) => ({
                tenant: r.tenant ?? "Unknown", // Ici 'tenant' contient le Nom du Groupe grâce au SQL
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
import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import { TopTenantsChart, ExpiryExposureChart } from "@/components/Charts";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseFilters } from "@/lib/filters";
import { 
  Building2, Wallet, Scale, AlertCircle, 
  TrendingUp, CalendarClock, MapPin, ArrowRight, 
  Maximize2, Percent
} from "lucide-react";

// --- Helpers de formatage ---
const currencyFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

function fmtEUR(n: number) { return currencyFmt.format(n); }
function fmtNum(n: number) { return numFmt.format(n); }
function fmtPct(n: number) { return pctFmt.format(n); }

// Fonction pour déterminer la couleur du badge d'expiration
function getDaysRemainingColor(dateStr: string) {
  const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  if (days < 30) return "bg-rose-50 text-rose-700 ring-rose-600/20";
  if (days < 60) return "bg-orange-50 text-orange-700 ring-orange-600/20";
  return "bg-amber-50 text-amber-700 ring-amber-600/20";
}

type FilterOptions = { fund: string[]; entity: string[]; country: string[]; city: string[] };

export default async function Page({
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
    p_indexable_only: !!f.indexableOnly,
    p_search: f.search ?? null,
  };

  // Chargement parallèle des données
  const [
    { data: metrics, error: e1 },
    { data: marketing, error: e5 },
    { data: topTenants, error: e2 },
    { data: expiry, error: e3 },
    { data: next90, error: e4 },
    { data: optionsJson, error: e6 },
  ] = await Promise.all([
    sb.rpc("portfolio_metrics", common),
    sb.rpc("portfolio_marketing_kpis", common),
    sb.rpc("top_tenants", { p_limit: 8, ...common }),
    sb.rpc("expiry_exposure_yearly", { p_years_ahead: 10, ...common }),
    sb.rpc("next_90_days_expiries", { p_limit: 50, ...common }),
    sb.rpc("filter_options", common),
  ]);

  // Gestion d'erreur minimale pour l'UI
  if (e1 || e2 || e3 || e4 || e5 || e6) {
    console.error("Dashboard Error:", { e1, e2, e3, e4, e5, e6 });
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-zinc-500">
        <AlertCircle className="mb-2 h-10 w-10 text-rose-500" />
        <p>Error loading dashboard data. Please refresh.</p>
      </div>
    );
  }

  // --- Parsing Metrics & Marketing ---
  const m = metrics?.[0] ?? { 
    net_rent_month: 0, net_rent_year: 0, area_m2: 0, 
    wa_rent_eur_m2_month: 0, walt_weighted_years: 0,
    vacant_area_m2: 0, vacant_units_count: 0, row_count: 0 
  };

  const mk = marketing?.[0] ?? { 
    tenants_count: 0, units_count: 0, top5_concentration: 0, 
    expiry_12m_net_rent_year: 0, indexable_rent_share: 0 
  };
  
  // --- Parsing Options (Sécurisé) ---
  // Gère le cas où RPC renvoie un tableau d'objets ou l'objet directement
  let rawOpts: any = {};
  if (Array.isArray(optionsJson) && optionsJson.length > 0) {
    rawOpts = optionsJson[0];
  } else if (optionsJson && typeof optionsJson === 'object') {
    rawOpts = optionsJson;
  }

  const safeOptions: FilterOptions = {
    fund: Array.isArray(rawOpts?.fund) ? rawOpts.fund : [],
    entity: Array.isArray(rawOpts?.entity) ? rawOpts.entity : [],
    country: Array.isArray(rawOpts?.country) ? rawOpts.country : [],
    city: Array.isArray(rawOpts?.city) ? rawOpts.city : [],
  };

  // --- Calculs Vacance ---
  // 1. Taux Vacance GLA (Surface)
  const totalArea = Number(m.area_m2) || 0;
  const vacantArea = Number(m.vacant_area_m2) || 0;
  const vacancyRateGLA = totalArea > 0 ? (vacantArea / totalArea) : 0;

  // 2. Taux Vacance Unités (Nombre)
  const totalUnits = Number(m.row_count) || 0;
  const vacantUnits = Number(m.vacant_units_count) || 0;
  const vacancyRateUnit = totalUnits > 0 ? (vacantUnits / totalUnits) : 0;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      
      {/* Barre de Filtres */}
      <FilterBar options={safeOptions} />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Portfolio Overview</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Operational KPIs · <span className="font-medium text-zinc-700">{mk.units_count} Units</span> · {mk.tenants_count} Active Tenants
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Annual Rent</div>
            <div className="text-3xl font-bold text-zinc-900 tabular-nums">{fmtEUR(Number(m.net_rent_year))}</div>
          </div>
        </div>

        {/* LIGNE 1 : Financier & Vacance */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="Net Rent / Month" 
            value={fmtEUR(Number(m.net_rent_month))} 
            subtitle="Recurring monthly revenue" 
            icon={Wallet}
            variant="primary"
          />
          
          {/* CARTE VACANCE INVERSÉE : Unit en gros, GLA en petit */}
          <KpiCard 
            title="Vacancy Rate (Units)" 
            value={fmtPct(vacancyRateUnit)} 
            subtitle={
              <span className="flex flex-col gap-0.5">
                <span>{vacantUnits} / {totalUnits} units vacant</span>
                <span className="text-zinc-400">
                  {fmtPct(vacancyRateGLA)} by GLA ({fmtNum(vacantArea)} m²)
                </span>
              </span>
            }
            icon={Percent}
            variant={vacancyRateUnit > 0.10 ? "danger" : "default"} 
          />
          
          <KpiCard 
            title="WALT" 
            value={`${fmtNum(Number(m.walt_weighted_years))} Yrs`} 
            subtitle="Weighted by Net Rent" 
            icon={CalendarClock}
            variant={Number(m.walt_weighted_years) < 3 ? "warning" : "default"}
          />
          <KpiCard 
            title="WA Rent" 
            value={fmtEUR(Number(m.wa_rent_eur_m2_month))} 
            subtitle="Avg. per m² / month" 
            icon={Scale}
          />
        </div>

        {/* LIGNE 2 : Métriques Secondaires */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="Total Lettable Area" 
            value={fmtNum(Number(m.area_m2))} 
            subtitle="Square meters"
            icon={Maximize2}
          />
           <KpiCard 
            title="Top 5 Concentration" 
            value={fmtPct(Number(mk.top5_concentration))} 
            subtitle="Of total annual rent" 
            icon={Building2}
            variant={Number(mk.top5_concentration) > 0.5 ? "warning" : "default"}
          />
          <KpiCard 
            title="12m Expiry Risk" 
            value={fmtEUR(Number(mk.expiry_12m_net_rent_year))} 
            subtitle="Expiring next 12 months" 
            icon={AlertCircle}
            variant={Number(mk.expiry_12m_net_rent_year) > 0 ? "danger" : "default"}
          />
           <KpiCard 
            title="Indexation" 
            value={fmtPct(Number(mk.indexable_rent_share))} 
            subtitle="Rent linked to index" 
            icon={TrendingUp}
          />
        </div>

        {/* Graphiques */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[420px]">
            <TopTenantsChart
              data={(topTenants ?? []).map((r: any) => ({
                tenant: r.tenant ?? "Unknown",
                net_rent_year: Number(r.net_rent_year ?? 0),
              }))}
            />
          </div>
          <div className="h-[420px]">
            <ExpiryExposureChart
              data={(expiry ?? []).map((r: any) => ({
                expiry_year: Number(r.expiry_year),
                net_rent_year: Number(r.net_rent_year ?? 0),
              }))}
            />
          </div>
        </div>

        {/* Tableau Expirations (90 jours) */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-5 flex items-center justify-between bg-white">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Upcoming Expiries (90 Days)</h3>
              <p className="text-sm text-zinc-500 mt-0.5">Leases ending soon requiring attention</p>
            </div>
            {next90 && next90.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                {next90.length} Actions
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Tenant</th>
                  <th className="px-6 py-3 font-semibold">Location / Unit</th>
                  <th className="px-6 py-3 font-semibold text-right">Annual Rent</th>
                  <th className="px-6 py-3 font-semibold text-right">End Date</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(next90 ?? []).map((r: any, i: number) => {
                  const badgeColor = getDaysRemainingColor(r.next_possible_contract_end);
                  return (
                    <tr key={i} className="group hover:bg-zinc-50/40 transition-colors">
                      {/* Colonne Tenant */}
                      <td className="px-6 py-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 border border-zinc-200 uppercase">
                            {r.tenant ? r.tenant.substring(0, 2) : "??"}
                          </div>
                          <span className="truncate max-w-[200px]" title={r.tenant}>{r.tenant}</span>
                        </div>
                      </td>

                      {/* Colonne Location */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="font-medium text-zinc-700 flex items-center gap-1.5">
                             <MapPin size={12} className="text-zinc-400" />
                             {r.city && r.city !== "" ? r.city : "—"}
                           </span>
                           <span className="text-xs text-zinc-400 pl-4">{r.unit_id}</span>
                        </div>
                      </td>

                      {/* Colonne Loyer */}
                      <td className="px-6 py-4 text-right font-medium text-zinc-900 tabular-nums">
                        {fmtEUR(Number(r.net_rent_year ?? 0))}
                      </td>

                      {/* Colonne Date */}
                      <td className="px-6 py-4 text-right text-zinc-500 font-mono text-xs tabular-nums">
                        {r.next_possible_contract_end}
                      </td>

                      {/* Colonne Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeColor}`}>
                          Expiring
                        </span>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Empty State */}
                {(next90 ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="rounded-full bg-emerald-50 p-3 mb-3 ring-1 ring-emerald-100">
                           <Building2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="font-medium text-zinc-900">All Clear</p>
                        <p className="text-sm">No lease expiries within the next 90 days.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
           {next90 && next90.length > 0 && (
             <div className="bg-zinc-50/50 px-6 py-3 border-t border-zinc-100 flex justify-end">
                <button className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors">
                  View Full Rent Roll <ArrowRight size={12} />
                </button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
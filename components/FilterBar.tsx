"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Filter, Check, ChevronDown } from "lucide-react";

// --- Helpers ---
function csvToArr(s: string | null) { return s ? s.split(",").map(x => x.trim()).filter(Boolean) : []; }
function arrToCsv(a: string[]) { return a.join(","); }

// --- Dropdown Button ---
function FilterDropdown({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  value: string[]; 
  onChange: (v: string[]) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sécurité: options peut être undefined
  const safeOptions = Array.isArray(options) ? options : [];
  
  const filteredOptions = safeOptions
    .filter(o => o && o.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          value.length > 0 
            ? "bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-1" 
            : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
        }`}
      >
        {label}
        {value.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-zinc-900">
            {value.length}
          </span>
        )}
        <ChevronDown size={14} className={`opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              autoFocus
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-2 py-2 text-xs outline-none focus:border-sky-500 transition-colors"
              placeholder={`Search ${label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-zinc-400">
                {safeOptions.length === 0 ? "No options available" : "No matches found"}
              </div>
            )}
            {filteredOptions.map(opt => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs transition-colors ${
                  value.includes(opt) ? "bg-sky-50 text-sky-700 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="truncate">{opt}</span>
                {value.includes(opt) && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function FilterBar({
  options,
}: {
  options: { fund: string[]; entity: string[]; country: string[]; city: string[] };
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial = useMemo(() => ({
    fund: csvToArr(sp.get("fund")),
    entity: csvToArr(sp.get("entity")),
    country: csvToArr(sp.get("country")),
    city: csvToArr(sp.get("city")),
    q: sp.get("q") || "",
  }), [sp]);

  const [filters, setFilters] = useState(initial);

  const update = (key: keyof typeof initial, val: any) => setFilters(prev => ({ ...prev, [key]: val }));

  function apply() {
    const p = new URLSearchParams();
    if (filters.fund.length) p.set("fund", arrToCsv(filters.fund));
    if (filters.entity.length) p.set("entity", arrToCsv(filters.entity));
    if (filters.country.length) p.set("country", arrToCsv(filters.country));
    if (filters.city.length) p.set("city", arrToCsv(filters.city));
    if (filters.q) p.set("q", filters.q);
    router.push(`${pathname}?${p.toString()}`);
  }

  function reset() {
    setFilters({ fund: [], entity: [], country: [], city: [], q: "" });
    router.push(pathname);
  }

  const activeCount = filters.fund.length + filters.entity.length + filters.country.length + filters.city.length + (filters.q ? 1 : 0);
  const safeOpts = options || { fund: [], entity: [], country: [], city: [] };

  return (
    <div className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-sm">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex flex-col gap-4 lg:flex-row lg:items-center">
          
          {/* Top Line: Icon + Search */}
          <div className="flex items-center gap-4 flex-1">
             <div className="flex items-center gap-2 text-zinc-400">
               <Filter size={18} />
             </div>

             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  className="w-full rounded-full bg-zinc-100 pl-9 pr-4 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 placeholder:text-zinc-500 transition-all"
                  placeholder="Search tenant, unit, slate..."
                  value={filters.q}
                  onChange={e => update("q", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && apply()}
                />
             </div>
             
             <div className="h-6 w-px bg-zinc-200 mx-2 hidden lg:block"></div>
          </div>

          {/* Filters Line - Changed to FLEX-WRAP to avoid clipping */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown label="Fund" options={safeOpts.fund} value={filters.fund} onChange={v => update("fund", v)} />
            <FilterDropdown label="Entity" options={safeOpts.entity} value={filters.entity} onChange={v => update("entity", v)} />
            <FilterDropdown label="Country" options={safeOpts.country} value={filters.country} onChange={v => update("country", v)} />
            <FilterDropdown label="City" options={safeOpts.city} value={filters.city} onChange={v => update("city", v)} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 ml-auto lg:ml-0">
             <button 
               onClick={apply}
               className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-800 transition-colors shadow-sm"
             >
               Apply
             </button>
             
             {activeCount > 0 && (
               <button onClick={reset} className="text-zinc-400 hover:text-rose-600 transition-colors p-2">
                 <X size={18} />
               </button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
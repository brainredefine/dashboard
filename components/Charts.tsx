"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const CustomTooltip = ({ active, payload, label, valuePrefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
        <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
        <p className="text-lg font-bold text-zinc-900">
          {valuePrefix}{new Intl.NumberFormat("en-GB", { notation: "compact" }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function TopTenantsChart({ data }: { data: { tenant: string; net_rent_year: number }[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Top Tenants Exposure</h3>
      <p className="text-xs text-zinc-500 mb-6">Ranked by Net Annual Rent</p>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f4f4f5" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="tenant" 
              type="category" 
              tick={{ fontSize: 11, fill: "#71717a" }} 
              width={120}
              tickFormatter={(val) => val.length > 30 ? val.substring(0, 24) + '...' : val}
            />
            <Tooltip content={<CustomTooltip valuePrefix="€" />} cursor={{ fill: "#f4f4f5" }} />
            <Bar dataKey="net_rent_year" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ExpiryExposureChart({ data }: { data: { expiry_year: number; net_rent_year: number }[] }) {
  // Calculer l'année max pour colorer différemment les années proches
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Lease Expiry Profile</h3>
      <p className="text-xs text-zinc-500 mb-6">Net Rent Expiring per Year</p>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis 
              dataKey="expiry_year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#71717a" }} 
              dy={10}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip valuePrefix="€" />} cursor={{ fill: "#f4f4f5" }} />
            <Bar dataKey="net_rent_year" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.expiry_year <= currentYear + 1 ? "#f43f5e" : "#0ea5e9"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
// Ajoute ça dans components/Charts.tsx
export function AgingChart({ data }: { data: { bucket: string; amount: number }[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Aged Debt Profile</h3>
      <p className="text-xs text-zinc-500 mb-6">Distribution of arrears by age</p>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
             <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} dy={10} />
             <YAxis 
               tickFormatter={(val) => new Intl.NumberFormat("en", { notation: "compact" }).format(val)} 
               axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} 
             />
             <Tooltip 
               cursor={{ fill: "#f4f4f5" }}
               content={({ active, payload, label }) => {
                 if (active && payload && payload.length) {
                   return (
                     <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
                       <p className="mb-1 text-xs text-zinc-500">{label}</p>
                       <p className="text-lg font-bold text-zinc-900">
                         {new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(Number(payload[0].value))}
                       </p>
                     </div>
                   );
                 }
                 return null;
               }}
             />
             <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
               {data.map((entry, index) => {
                 // Plus c'est vieux, plus c'est rouge
                 const color = index > 2 ? "#f43f5e" : index === 2 ? "#fbbf24" : "#10b981";
                 return <Cell key={`cell-${index}`} fill={color} />;
               })}
             </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
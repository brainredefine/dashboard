export type Filters = {
  fund?: string[];
  entity?: string[];
  country?: string[];
  city?: string[];
  indexableOnly?: boolean;
  search?: string;
};

function toArr(v?: string | string[]) {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v.join(",") : v;
  const arr = s.split(",").map(x => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export function parseFilters(searchParams: { [key: string]: string | string[] | undefined }): Filters {
  return {
    fund: toArr(searchParams.fund),
    entity: toArr(searchParams.entity),
    country: toArr(searchParams.country),
    city: toArr(searchParams.city),
    indexableOnly: searchParams.indexable === "1",
    search: typeof searchParams.q === "string" ? searchParams.q : undefined,
  };
}

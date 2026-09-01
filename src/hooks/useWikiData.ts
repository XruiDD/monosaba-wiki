import { useEffect, useState } from "react";
import type { WikiCatalog, WikiData } from "../types/wiki";

const EMPTY_DATA: WikiData = {
  catalog: null,
  items: [],
  recipes: [],
  magics: [],
  tasks: [],
  talents: [],
  damage: [],
  effects: [],
  tutorials: [],
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
}

export function useWikiData() {
  const [state, setState] = useState<{ data: WikiData; ready: boolean; error: Error | null }>({ data: EMPTY_DATA, ready: false, error: null });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const catalog = await fetchJson<WikiCatalog>("data/domain/catalog.json");
        const names = Object.keys(catalog.datasets || {});
        const documents = await Promise.all(names.map((name) => fetchJson<{ records?: unknown[] }>(catalog.datasets[name])));
        if (!active) return;
        const datasets = Object.fromEntries(names.map((name, index) => [name, documents[index].records || []])) as Partial<WikiData>;
        setState({ data: { ...EMPTY_DATA, ...datasets, catalog } as WikiData, ready: true, error: null });
      } catch (error) {
        console.error(error);
        const normalized = error instanceof Error ? error : new Error(String(error));
        if (active) setState({ data: EMPTY_DATA, ready: true, error: normalized });
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return state;
}

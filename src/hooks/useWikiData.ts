import { useEffect, useMemo, useState } from "react";
import type { WikiCatalog, WikiData } from "../types/wiki";

export type WikiDatasetName = Exclude<keyof WikiData, "catalog">;

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

let catalog: WikiCatalog | null = null;
let catalogRequest: Promise<WikiCatalog> | null = null;
const datasetCache = new Map<WikiDatasetName, unknown[]>();
const datasetRequests = new Map<WikiDatasetName, Promise<unknown[]>>();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function loadCatalog() {
  if (catalog) return Promise.resolve(catalog);
  if (!catalogRequest) {
    catalogRequest = fetchJson<WikiCatalog>("data/domain/catalog.json")
      .then((value) => {
        catalog = value;
        return value;
      })
      .catch((error) => {
        catalogRequest = null;
        throw error;
      });
  }
  return catalogRequest;
}

async function loadDataset(name: WikiDatasetName, currentCatalog: WikiCatalog) {
  const cached = datasetCache.get(name);
  if (cached) return cached;

  const existing = datasetRequests.get(name);
  if (existing) return existing;

  const path = currentCatalog.datasets[name];
  if (!path) {
    const empty: unknown[] = [];
    datasetCache.set(name, empty);
    return empty;
  }

  const request = fetchJson<{ records?: unknown[] }>(path)
    .then((document) => {
      const records = document.records ?? [];
      datasetCache.set(name, records);
      datasetRequests.delete(name);
      return records;
    })
    .catch((error) => {
      datasetRequests.delete(name);
      throw error;
    });
  datasetRequests.set(name, request);
  return request;
}

function snapshot(): WikiData {
  return {
    ...EMPTY_DATA,
    ...Object.fromEntries(datasetCache),
    catalog,
  } as WikiData;
}

export async function preloadWikiDatasets(names: readonly WikiDatasetName[]) {
  const currentCatalog = await loadCatalog();
  await Promise.all([...new Set(names)].map((name) => loadDataset(name, currentCatalog)));
}

export function useWikiData(requiredDatasets: readonly WikiDatasetName[]) {
  const requestKey = useMemo(
    () => [...new Set(requiredDatasets)].sort().join(","),
    [requiredDatasets],
  );
  const [state, setState] = useState<{
    data: WikiData;
    loaded: ReadonlySet<WikiDatasetName>;
    error: Error | null;
  }>(() => ({ data: snapshot(), loaded: new Set(datasetCache.keys()), error: null }));

  useEffect(() => {
    let active = true;
    const names = requestKey ? requestKey.split(",") as WikiDatasetName[] : [];

    async function load() {
      try {
        await loadCatalog();
        if (active) {
          setState({ data: snapshot(), loaded: new Set(datasetCache.keys()), error: null });
        }
        await preloadWikiDatasets(names);
        if (active) {
          setState({ data: snapshot(), loaded: new Set(datasetCache.keys()), error: null });
        }
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        console.error(normalized);
        if (active) {
          setState({ data: snapshot(), loaded: new Set(datasetCache.keys()), error: normalized });
        }
      }
    }

    load();
    return () => { active = false; };
  }, [requestKey]);

  return {
    ...state,
    catalogReady: state.data.catalog !== null,
  };
}

import { createDirectus, rest } from '@directus/sdk';

// URL aus der .env Datei laden
const directusUrl = import.meta.env.VITE_DIRECTUS_URL;

if (!directusUrl) {
  console.error("ACHTUNG: VITE_DIRECTUS_URL fehlt in der .env Datei!");
}

export const client = createDirectus(directusUrl).with(rest());
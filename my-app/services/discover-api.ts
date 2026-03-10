/**
 * Open Food Facts search for similar products / alternatives.
 * Uses search-a-licious API (primary) with fallback to cgi search.pl
 */

export type DiscoverProduct = {
  code: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  allergens: string;
  nutriscore?: string;
};

/** Build image URL from barcode using OFF directory structure */
function getImageUrlFromCode(code: string): string | null {
  if (!code || code.length < 8) return null;
  const padded = code.padStart(13, '0');
  const a = padded.slice(0, 3);
  const b = padded.slice(3, 6);
  const c = padded.slice(6, 9);
  const d = padded.slice(9);
  return `https://images.openfoodfacts.org/images/products/${a}/${b}/${c}/${d}/front_en.400.jpg`;
}

function getAllergensFromProduct(product: Record<string, unknown>): string {
  const tags = product.allergens_tags as string[] | undefined;
  if (tags && tags.length > 0) {
    return tags
      .map((tag: string) => tag.replace(/^[a-z]+:/, ''))
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(', ');
  }
  const raw = product.allergens as string | undefined;
  if (raw && String(raw).trim().length > 0) {
    return String(raw)
      .split(',')
      .map((a: string) => a.replace(/^[a-z]+:/, '').trim())
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(', ');
  }
  const ingredients = product.ingredients_text_en || product.ingredients_text || '';
  if (ingredients) {
    const match = String(ingredients).match(/contains\s*:?\s*([^.]*)/i);
    if (match && match[1]) {
      const found = match[1].trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
      if (found.length > 2) return found;
    }
  }
  return 'None detected by database. (Always double check packaging!)';
}

function mapHitToProduct(hit: Record<string, unknown>): DiscoverProduct {
  const code = String(hit.code || '');
  const productName = String(
    hit.product_name || hit.product_name_en || (Array.isArray(hit.brands) ? hit.brands[0] : hit.brands) || 'Unknown'
  );
  const brandsRaw = hit.brands;
  const brand = Array.isArray(brandsRaw)
    ? (brandsRaw as string[]).join(', ')
    : String(brandsRaw || '');
  const imageUrl =
    (hit.image_url ? String(hit.image_url) : null) ||
    (hit.image_small_url ? String(hit.image_small_url) : null) ||
    getImageUrlFromCode(code);
  const allergens = getAllergensFromProduct(hit);
  const nutriscore = hit.nutriscore_grade
    ? String(hit.nutriscore_grade)
    : (hit.nutrition_grades as string) || undefined;

  return { code, productName, brand, imageUrl, allergens, nutriscore };
}

/** Search via search-a-licious API (modern, more reliable) */
async function searchViaSearchALicious(
  searchTerm: string,
  limit: number
): Promise<DiscoverProduct[]> {
  const params = new URLSearchParams({
    q: searchTerm.trim() || 'food',
    page_size: String(Math.min(limit, 24)),
    page: '1',
  });
  const url = `https://search.openfoodfacts.org/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  const hits = (json.hits ?? []) as Record<string, unknown>[];
  return hits
    .filter((h) => h.code && (h.product_name || h.brands))
    .map(mapHitToProduct);
}

/** Fallback: search via legacy cgi search.pl */
async function searchViaCgiSearch(
  searchTerm: string,
  limit: number
): Promise<DiscoverProduct[]> {
  const params = new URLSearchParams({
    search_terms: searchTerm.trim() || 'food',
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(limit, 24)),
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  const products = (json.products ?? []) as Record<string, unknown>[];
  return products
    .filter((p) => p.code && (p.product_name || p.brands))
    .map((p) => mapHitToProduct(p));
}

/**
 * Search for similar products (for "Find alternatives").
 * Uses a broad search term to get more results, then filters for safe alternatives.
 */
export async function searchSimilarProducts(
  searchTerm: string,
  limit = 10
): Promise<DiscoverProduct[]> {
  // Use first 2-3 words for broader results (e.g. "Coca Cola" instead of full product name)
  const words = (searchTerm || 'food').trim().split(/\s+/).filter(Boolean);
  const broadTerm = words.slice(0, 3).join(' ') || 'food';

  try {
    const results = await searchViaSearchALicious(broadTerm, limit + 10);
    if (results.length > 0) return results;
  } catch {
    // fallback to legacy API
  }

  return searchViaCgiSearch(broadTerm, limit + 10);
}

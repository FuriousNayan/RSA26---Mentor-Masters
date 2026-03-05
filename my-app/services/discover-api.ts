/**
 * Open Food Facts search for similar products / alternatives.
 * Uses v1 search API for text search: https://world.openfoodfacts.org/cgi/search.pl
 */

export type DiscoverProduct = {
  code: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  allergens: string;
  nutriscore?: string;
};

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

export async function searchSimilarProducts(
  searchTerm: string,
  limit = 10
): Promise<DiscoverProduct[]> {
  const params = new URLSearchParams({
    search_terms: searchTerm,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  const products = (json.products ?? []) as Record<string, unknown>[];
  return products
    .filter((p) => p.code && (p.product_name || p.brands))
    .map((p) => ({
      code: String(p.code),
      productName: String(p.product_name || p.brands || 'Unknown'),
      brand: String(p.brands || ''),
      imageUrl: p.image_url ? String(p.image_url) : null,
      allergens: getAllergensFromProduct(p),
      nutriscore: p.nutriscore_grade ? String(p.nutriscore_grade) : undefined,
    }));
}

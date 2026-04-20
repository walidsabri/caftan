import ProductCollectionPage from "@/components/ProductCollectionPage";
import { getStorefrontProducts } from "@/lib/storefront-catalog";

export default async function ProductsPage() {
  const allProducts = await getStorefrontProducts();

  return (
    <ProductCollectionPage
      key="all-products"
      title="All products"
      description="Explorez toute la collection avec les vraies categories, les prix actuels et les offres disponibles."
      products={allProducts}
      linkMode="flat"
    />
  );
}

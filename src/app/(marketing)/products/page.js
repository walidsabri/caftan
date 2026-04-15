import ProductCollectionPage from "@/components/ProductCollectionPage";
import { products, getCategoryName } from "@/lib/catalog-data";

export default function ProductsPage() {
  const allProducts = products.map((product) => ({
    ...product,
    categoryName: getCategoryName(product.categorySlug),
  }));

  return (
    <ProductCollectionPage
      title="All products"
      description="Browse every piece in the collection. This page stays broad, while each category route narrows the grid for you."
      products={allProducts}
      linkMode="flat"
    />
  );
}

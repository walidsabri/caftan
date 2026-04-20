import { notFound } from "next/navigation";
import ProductCollectionPage from "@/components/ProductCollectionPage";
import ProductDetailsView from "@/components/ProductDetailsView";
import {
  getStorefrontCategoryBySlug,
  getStorefrontProductBySlug,
  getStorefrontProductsByCategory,
  getStorefrontRelatedProducts,
} from "@/lib/storefront-catalog";

export default async function ProductsCatchAllPage({ params }) {
  const { segments } = await params;

  if (!segments?.length) {
    notFound();
  }

  if (segments.length === 1) {
    const [slug] = segments;
    const [category, product] = await Promise.all([
      getStorefrontCategoryBySlug(slug),
      getStorefrontProductBySlug(slug),
    ]);

    if (category) {
      const categoryProducts = await getStorefrontProductsByCategory(category.slug);

      return (
        <ProductCollectionPage
          key={category.slug}
          title={category.name}
          description={category.description}
          products={categoryProducts}
          linkMode="nested"
          categorySlug={category.slug}
        />
      );
    }

    if (product) {
      const relatedProducts = await getStorefrontRelatedProducts(
        product.id,
        product.categorySlug,
      );

      return (
        <ProductDetailsView
          key={product.id}
          product={product}
          category={{
            slug: product.categorySlug,
            name: product.categoryName,
            description: product.categoryDescription,
          }}
          relatedProducts={relatedProducts}
        />
      );
    }

    notFound();
  }

  if (segments.length === 2) {
    const [categorySlug, productSlug] = segments;
    const [category, product] = await Promise.all([
      getStorefrontCategoryBySlug(categorySlug),
      getStorefrontProductBySlug(productSlug),
    ]);

    if (!category || !product || product.categorySlug !== category.slug) {
      notFound();
    }

    const relatedProducts = await getStorefrontRelatedProducts(
      product.id,
      product.categorySlug,
    );

    return (
      <ProductDetailsView
        key={product.id}
        product={product}
        category={category}
        relatedProducts={relatedProducts}
      />
    );
  }

  notFound();
}

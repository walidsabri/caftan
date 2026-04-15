import { notFound } from "next/navigation";
import ProductCollectionPage from "@/components/ProductCollectionPage";
import ProductDetailsView from "@/components/ProductDetailsView";
import {
  categories,
  getCategoryBySlug,
  getCategoryName,
  getProductBySlug,
  getProductsByCategory,
  products,
} from "@/lib/catalog-data";

export function generateStaticParams() {
  const categoryParams = categories.map((category) => ({
    segments: [category.slug],
  }));
  const flatProductParams = products.map((product) => ({
    segments: [product.slug],
  }));
  const nestedProductParams = products.map((product) => ({
    segments: [product.categorySlug, product.slug],
  }));

  return [...categoryParams, ...flatProductParams, ...nestedProductParams];
}

function getRelatedProducts(product) {
  return products
    .filter(
      (candidate) =>
        candidate.categorySlug === product.categorySlug &&
        candidate.slug !== product.slug,
    )
    .slice(0, 4)
    .map((candidate) => ({
      ...candidate,
      categoryName: getCategoryName(candidate.categorySlug),
    }));
}

export default async function ProductsCatchAllPage({ params }) {
  const { segments } = await params;

  if (!segments?.length) {
    notFound();
  }

  if (segments.length === 1) {
    const [slug] = segments;
    const category = getCategoryBySlug(slug);

    if (category) {
      const categoryProducts = getProductsByCategory(category.slug).map(
        (product) => ({
          ...product,
          categoryName: category.name,
        }),
      );

      return (
        <ProductCollectionPage
          title={category.name}
          description={category.description}
          products={categoryProducts}
          linkMode="nested"
          categorySlug={category.slug}
        />
      );
    }

    const product = getProductBySlug(slug);

    if (product) {
      const productCategory = getCategoryBySlug(product.categorySlug);

      if (!productCategory) {
        notFound();
      }

      return (
        <ProductDetailsView
          product={{ ...product, categoryName: productCategory.name }}
          category={productCategory}
          relatedProducts={getRelatedProducts(product)}
        />
      );
    }

    notFound();
  }

  if (segments.length === 2) {
    const [categorySlug, productSlug] = segments;
    const category = getCategoryBySlug(categorySlug);
    const product = getProductBySlug(productSlug);

    if (!category || !product || product.categorySlug !== category.slug) {
      notFound();
    }

    return (
      <ProductDetailsView
        product={{ ...product, categoryName: category.name }}
        category={category}
        relatedProducts={getRelatedProducts(product)}
      />
    );
  }

  notFound();
}

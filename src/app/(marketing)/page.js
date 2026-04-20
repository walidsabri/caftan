import Catalog from "@/components/catalog";
import Hero from "@/components/Hero";
import { getStorefrontFeaturedProducts } from "@/lib/storefront-catalog";

export default async function Home() {
  const featuredProducts = await getStorefrontFeaturedProducts();

  return (
    <>
      <Hero />
      <Catalog products={featuredProducts} />
    </>
  );
}

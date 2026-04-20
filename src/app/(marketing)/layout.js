import NavBar from "@/components/navigation";
import { CartProvider } from "@/components/cart-provider";
import { EtheralShadow } from "@/components/ui/etheral-shadow";
import { getStorefrontNavigationData } from "@/lib/storefront-catalog";

export default async function MarketingLayout({ children }) {
  const navigation = await getStorefrontNavigationData();

  return (
    <CartProvider>
      <div className="relative min-h-screen bg-white">
        <div className="pointer-events-none fixed inset-0 z-0">
          <EtheralShadow
            color="rgba(17, 17, 17, 0.12)"
            animation={{ scale: 58, speed: 82 }}
            noise={{ opacity: 0.08, scale: 1.1 }}
            className="h-full w-full"
          />
        </div>

        <NavBar
          categories={navigation.categories}
          productCategoryBySlug={navigation.productCategoryBySlug}
        />

        <main className="relative z-10 flex-1 pt-16 md:pt-28">{children}</main>
      </div>
    </CartProvider>
  );
}

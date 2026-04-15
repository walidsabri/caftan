import NavBar from "@/components/navigation";
import { CartProvider } from "@/components/cart-provider";

export default function MarketingLayout({ children }) {
  return (
    <CartProvider>
      <NavBar />
      <main className="flex-1 pt-16 md:pt-28">{children}</main>
    </CartProvider>
  );
}

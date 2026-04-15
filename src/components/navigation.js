"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { cn } from "@/lib/utils";
import { categories, getProductBySlug } from "@/lib/catalog-data";
import logo from "../../public/logo.png";

const primaryLinks = [
  { label: "Collection", href: "/products" },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
];

const categoryLinks = categories.map(({ name, slug }) => ({
  label: name,
  slug,
}));

export default function NavBar() {
  const { hasHydrated, totalQuantity } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);
  const firstProductsSegment = pathSegments[1];
  const activeCategory = categoryLinks.some(
    ({ slug }) => slug === firstProductsSegment,
  )
    ? firstProductsSegment
    : getProductBySlug(firstProductsSegment)?.categorySlug ?? null;
  const isProductsRoute =
    pathname === "/products" || pathname.startsWith("/products/");
  const cartCount = hasHydrated ? totalQuantity : 0;

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="fixed top-0 left-0 z-50 flex h-16 w-full flex-col overflow-visible border-b border-caftan-border bg-caftan-cream shadow-sm shadow-caftan-brand/10 md:h-28">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-2">
          <Image src={logo} width={56} height={56} alt="caftan maria" />
          <p className="truncate text-sm tracking-[0.2em] text-caftan-text md:text-base">
            CAFTAN MARIA
          </p>
        </Link>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex flex-col gap-1.5 md:hidden">
          <span
            className={`h-0.5 w-6 bg-caftan-text transition-all ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-caftan-text transition-all ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-caftan-text transition-all ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>

        <ul className="hidden items-center gap-2 md:flex">
          {primaryLinks.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-caftan-brand transition-colors hover:text-caftan-brand-dark",
                  ((href === "/products" && isProductsRoute) ||
                    pathname === href) &&
                    "bg-caftan-surface text-caftan-brand-dark",
                )}>
                {Icon ? <Icon className="size-4" /> : null}
                {label}
                {href === "/cart" && cartCount ? (
                  <span className="flex min-w-5 items-center justify-center rounded-full bg-caftan-brand px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-normal text-caftan-cream">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden h-12 items-center justify-center border-t border-caftan-border/70 px-6 md:flex">
        <ul className="flex flex-wrap items-center justify-center gap-8">
          {categoryLinks.map(({ label, slug }) => (
            <li key={slug}>
              <Link
                href={`/products/${slug}`}
                className={cn(
                  "relative pb-1 text-xs font-medium uppercase tracking-[0.24em] text-caftan-brand transition-colors hover:text-caftan-brand-dark after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-0 after:bg-caftan-brand-dark after:transition-transform hover:after:scale-x-100",
                  activeCategory === slug && "text-caftan-brand-dark after:scale-x-100",
                )}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {menuOpen && (
        <div className="fixed top-16 left-0 z-50 w-full border-t border-caftan-border bg-caftan-cream shadow-lg shadow-caftan-brand/10 md:hidden">
          <ul className="flex flex-col divide-y divide-caftan-border/60">
            {primaryLinks.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium uppercase tracking-[0.16em] text-caftan-brand transition-colors hover:text-caftan-brand-dark",
                    ((href === "/products" && isProductsRoute) ||
                      pathname === href) &&
                      "bg-caftan-surface text-caftan-brand-dark",
                  )}>
                  {Icon ? <Icon className="size-4" /> : null}
                  {label}
                  {href === "/cart" && cartCount ? (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-caftan-brand px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-normal text-caftan-cream">
                      {cartCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-caftan-border/60 px-4 py-4">
            <p className="mb-3 text-center text-[0.68rem] font-medium uppercase tracking-[0.28em] text-caftan-brand">
              Categories
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {categoryLinks.map(({ label, slug }) => (
                <li key={slug}>
                  <Link
                    href={`/products/${slug}`}
                    onClick={closeMenu}
                    className={cn(
                      "block rounded-md border border-caftan-border px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-caftan-brand transition-colors hover:border-caftan-brand hover:text-caftan-brand-dark",
                      activeCategory === slug &&
                        "border-caftan-brand bg-caftan-surface text-caftan-brand-dark",
                    )}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}

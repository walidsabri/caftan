"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format-price";

export default function CartPage() {
  const {
    items,
    hasHydrated,
    subtotal,
    totalQuantity,
    updateItemQuantity,
    removeItem,
  } = useCart();

  return (
    <section className="px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center px-6 py-6 text-center md:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-caftan-brand">
            Panier
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-caftan-text md:text-4xl">
            Votre panier
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-caftan-text md:text-base">
            Retrouvez ici les produits choisis avant de passer a la commande.
          </p>
        </div>

        {!hasHydrated ? (
          <div className="rounded-sm border border-caftan-border bg-caftan-cream px-6 py-14 text-center shadow-sm shadow-caftan-brand/10">
            <p className="text-sm uppercase tracking-[0.2em] text-caftan-brand">
              Chargement du panier...
            </p>
          </div>
        ) : items.length ? (
          <>
            <div className="w-full overflow-hidden rounded-sm border border-caftan-border bg-caftan-cream shadow-sm shadow-caftan-brand/10">
              <div className="hidden grid-cols-[minmax(0,1.8fr)_1fr_1fr] items-center bg-caftan-light/45 px-8 py-4 text-sm uppercase tracking-[0.18em] text-caftan-text md:grid">
                <p>Product</p>
                <p className="justify-self-center">Quantity</p>
                <p className="justify-self-end">Total</p>
              </div>

              <div className="divide-y divide-caftan-border/70">
                {items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex flex-col gap-6 px-4 py-6 md:grid md:grid-cols-[minmax(0,1.8fr)_1fr_1fr] md:items-center md:gap-10 md:px-8 md:py-8">
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className="relative h-[150px] w-[110px] shrink-0 overflow-hidden bg-caftan-surface">
                        <Image
                          src={item.image || "/caftan-test.jpg"}
                          alt={item.name}
                          fill
                          sizes="110px"
                          className="object-cover"
                        />
                      </div>

                      <div className="space-y-2 pt-1 text-left">
                        <p className="text-xs uppercase tracking-[0.18em] text-caftan-text md:hidden">
                          Product
                        </p>
                        <Link
                          href={`/products/${item.categorySlug}/${item.slug}`}
                          className="block text-2xl font-normal leading-tight text-caftan-text transition-colors hover:text-caftan-brand">
                          {item.name}
                        </Link>
                        <p className="text-base font-normal leading-tight text-caftan-brand">
                          {formatPrice(item.price)}
                        </p>
                        <p className="text-base text-caftan-text">
                          Size: <span className="font-medium">{item.size}</span>
                        </p>
                        <p className="text-base text-caftan-text">
                          Color:{" "}
                          <span className="font-medium text-caftan-text">
                            {item.color}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 md:justify-self-center">
                      <p className="text-xs uppercase tracking-[0.18em] text-caftan-text md:hidden">
                        Quantity
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-caftan-border">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQuantity(
                                item.cartItemId,
                                item.quantity - 1,
                              )
                            }
                            className="flex h-12 w-10 items-center justify-center text-caftan-text transition-colors hover:bg-caftan-surface"
                            aria-label={`Decrease quantity for ${item.name}`}>
                            <Minus className="size-4" />
                          </button>

                          <div className="flex h-12 w-10 items-center justify-center border-x border-caftan-border text-base text-caftan-text">
                            {item.quantity}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateItemQuantity(
                                item.cartItemId,
                                item.quantity + 1,
                              )
                            }
                            className="flex h-12 w-10 items-center justify-center text-caftan-text transition-colors hover:bg-caftan-surface"
                            aria-label={`Increase quantity for ${item.name}`}>
                            <Plus className="size-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          className="text-caftan-text transition-colors hover:text-caftan-brand"
                          aria-label={`Remove ${item.name} from cart`}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-left md:justify-self-end md:text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-caftan-text md:hidden">
                        Total
                      </p>
                      <p className="text-base font-normal leading-tight text-caftan-brand">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Link
                href="/checkout"
                className="rounded-sm bg-caftan-brand px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.16em] text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
                Passer a la commande
              </Link>

              <div className="text-left md:text-right">
                <p className="text-sm uppercase tracking-[0.2em] text-caftan-brand">
                  {totalQuantity} article{totalQuantity > 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-2xl font-semibold text-caftan-text">
                  Total: {formatPrice(subtotal)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-sm border border-dashed border-caftan-border bg-caftan-cream px-6 py-14 text-center shadow-sm shadow-caftan-brand/10">
            <h2 className="text-2xl font-semibold text-caftan-text">
              Votre panier est vide
            </h2>
            <p className="mt-3 text-sm text-caftan-text">
              Ajoutez des produits depuis les pages produit pour les voir ici.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-sm bg-caftan-brand px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
              Voir les produits
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

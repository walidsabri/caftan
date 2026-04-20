import Link from "next/link";
import ProductItem from "./product";

export default function Catalog({ products = [] }) {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 text-center font-mono text-4xl md:text-6xl">
          Nouveautes
        </h2>

        {products.length ? (
          <div className="mt-6 mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((product) => (
              <ProductItem
                key={product.id}
                {...product}
                href={`/products/${product.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="mb-12 rounded-3xl border border-dashed border-caftan-border bg-caftan-cream px-6 py-12 text-center">
            <h3 className="text-xl font-semibold text-caftan-text">
              Aucun produit actif pour le moment
            </h3>
            <p className="mt-3 text-sm text-caftan-text">
              Les nouveautes apparaitront ici des qu&apos;elles seront publiees
              depuis le dashboard.
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <Link
            href="/products"
            className="cursor-pointer rounded-sm border border-caftan-brand bg-caftan-brand px-8 py-3 font-mono text-xl text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
            Voir toutes les Caftans
          </Link>
        </div>
      </div>
    </section>
  );
}

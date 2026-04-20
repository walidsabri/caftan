import Link from "next/link";

function getFirstSearchParamValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutThankYouPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = getFirstSearchParamValue(resolvedSearchParams?.order);

  return (
    <section className="px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl rounded-sm border border-caftan-border bg-caftan-cream px-6 py-14 text-center shadow-sm shadow-caftan-brand/10 md:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-caftan-brand">
          Merci
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-caftan-text md:text-4xl">
          Votre commande a bien ete enregistree
        </h1>
        <p className="mt-4 text-sm leading-6 text-caftan-text md:text-base">
          Merci pour votre confiance. Notre equipe prendra contact avec vous
          tres bientot pour confirmer la commande et organiser la livraison.
        </p>

        {orderNumber ? (
          <div className="mt-8 rounded-sm border border-caftan-border bg-caftan-surface px-5 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-caftan-text">
              Numero de commande
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[0.08em] text-caftan-brand">
              {orderNumber}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="rounded-sm bg-caftan-brand px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
            Continuer les achats
          </Link>
          <Link
            href="/"
            className="rounded-sm border border-caftan-border px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-caftan-text transition-colors hover:bg-caftan-surface">
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </section>
  );
}

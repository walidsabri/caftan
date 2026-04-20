import Link from "next/link";
import Image from "next/image";
import caftan from "../../public/caftan-test.jpg";
import { formatPrice } from "@/lib/format-price";

export default function ProductItem({
  href = "/products",
  image,
  name,
  price,
  oldPrice,
  isSoldOut = false,
  hasOffer = false,
  isNew = false,
  categoryName,
  colors = [],
}) {
  const currentPriceClass = hasOffer ? "text-red-600" : "text-caftan-text";
  const oldPriceClass = hasOffer ? "text-black" : "text-caftan-brand";

  return (
    <Link
      href={href}
      className="block h-full overflow-hidden rounded-lg border border-caftan-border bg-caftan-cream transition-shadow duration-300 hover:shadow-lg hover:shadow-caftan-brand/10">
      <div className="relative aspect-square w-full overflow-hidden bg-caftan-accent">
        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
          {isNew ? (
            <span className=" bg-black px-2 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.18em] leading-0.4 text-white">
              Nouveau
            </span>
          ) : null}
          {hasOffer ? (
            <span className=" bg-red-600 px-2 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.18em] leading-0.4 text-white">
              Promotion
            </span>
          ) : null}
        </div>
        <Image
          src={image || caftan}
          alt={name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>

      <div className="flex flex-col p-2 md:p-2 ">
        <h3 className="line-clamp-2 text-center text-sm text-caftan-text md:text-base uppercase font-thin">
          {name}
        </h3>

        <div className="mt-2 text-center flex flex-row gap-3 items-center justify-center">
          {oldPrice ? (
            <p
              className={`text-xs line-through md:text-base text-gray-500 ${oldPriceClass}`}>
              {formatPrice(oldPrice)}
            </p>
          ) : null}
          <p className={`text-xs font-light md:text-base ${currentPriceClass}`}>
            {formatPrice(price)}
          </p>
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs text-caftan-brand-dark">
            {isSoldOut
              ? "Actuellement indisponible"
              : `${colors.length} couleur${colors.length > 1 ? "s" : ""} disponible${colors.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

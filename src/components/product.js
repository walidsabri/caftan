"use client";

import Link from "next/link";
import Image from "next/image";
import caftan from "../../public/caftan-test.jpg";

export default function ProductItem({
  href = "/products",
  image,
  name,
  price,
  categoryName,
  colors = [],
}) {
  return (
    <Link
      href={href}
      className="mt-6 block h-full overflow-hidden rounded-lg bg-caftan-cream transition-shadow duration-300 hover:shadow-lg hover:shadow-caftan-brand/10">
      <div className="relative aspect-square w-full overflow-hidden bg-caftan-accent">
        <Image
          src={image || caftan}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>

      <div className="flex flex-col p-3 md:p-4">
        {categoryName ? (
          <p className="mb-1 text-center text-[0.65rem] font-medium uppercase tracking-[0.2em] text-caftan-brand">
            {categoryName}
          </p>
        ) : null}
        <h3 className="line-clamp-2 text-center text-sm text-caftan-text md:text-base">
          {name}
        </h3>

        <div className="text-center">
          <span className="text-xs font-semibold italic text-caftan-brand md:text-sm">
            {price ?? "10900"} DA
          </span>
        </div>

        <div className="text-center">
          <p className="text-xs text-caftan-brand-dark">
            {colors.length} colors available
          </p>
        </div>
      </div>
    </Link>
  );
}

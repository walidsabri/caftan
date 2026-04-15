export const categories = [
  {
    name: "Kaftan",
    slug: "kaftan",
    description:
      "Structured caftans with ornate finishes for ceremonies and statement occasions.",
  },
  {
    name: "Lebsa",
    slug: "lebsa",
    description:
      "Elegant algerian silhouettes with fluid fabrics and refined embroidery.",
  },
  {
    name: "Jellaba",
    slug: "jellaba",
    description:
      "Relaxed pieces designed with soft drape, comfort, and polished details.",
  },
  {
    name: "Kimono",
    slug: "kimono",
    description:
      "Layered cuts with modern lines, perfect for festive styling and day-to-night looks.",
  },
];

export const products = [
  {
    id: 1,
    name: "Kaftan Maria 202601",
    slug: "kaftan-maria-202601",
    categorySlug: "kaftan",
    price: 10900,
    image: "/caftan-test.jpg",
    colors: ["Ruby", "Gold", "Ivory"],
    summary: "A softly structured kaftan with hand-finished golden accents.",
  },
  {
    id: 2,
    name: "Kaftan Royal 202602",
    slug: "kaftan-royal-202602",
    categorySlug: "kaftan",
    price: 14900,
    image: "/caftan-test.jpg",
    colors: ["Emerald", "Champagne", "Black"],
    summary: "A ceremonial silhouette with a fuller fall and embroidered trim.",
  },
  {
    id: 3,
    name: "Lebsa Noor 202603",
    slug: "lebsa-noor-202603",
    categorySlug: "lebsa",
    price: 13200,
    image: "/caftan-test.jpg",
    colors: ["Pearl", "Sage", "Rose"],
    summary: "A refined lebsa with a light profile and luminous finish.",
  },
  {
    id: 4,
    name: "Lebsa Amber 202604",
    slug: "lebsa-amber-202604",
    categorySlug: "lebsa",
    price: 15800,
    image: "/caftan-test.jpg",
    colors: ["Amber", "Sand", "Bronze"],
    summary: "Warm metallic detailing and a confident formal silhouette.",
  },
  {
    id: 5,
    name: "Jellaba Sahara 202605",
    slug: "jellaba-sahara-202605",
    categorySlug: "jellaba",
    price: 12100,
    image: "/caftan-test.jpg",
    colors: ["Camel", "Cream", "Taupe"],
    summary: "A lighter jellaba with relaxed movement and understated contrast.",
  },
  {
    id: 6,
    name: "Jellaba Ivory 202606",
    slug: "jellaba-ivory-202606",
    categorySlug: "jellaba",
    price: 13600,
    image: "/caftan-test.jpg",
    colors: ["Ivory", "Silver", "Stone"],
    summary: "Soft texture and a minimal finish tailored for elegant evenings.",
  },
  {
    id: 7,
    name: "Kimono 202612",
    slug: "kimono-202612",
    categorySlug: "kimono",
    price: 14100,
    image: "/caftan-test.jpg",
    colors: ["Midnight", "Gold", "Olive"],
    summary: "A modern kimono cut with bold contrast embroidery and fluid sleeves.",
  },
  {
    id: 8,
    name: "Kimono Velvet 202613",
    slug: "kimono-velvet-202613",
    categorySlug: "kimono",
    price: 16900,
    image: "/caftan-test.jpg",
    colors: ["Forest", "Black", "Honey"],
    summary: "A richer velvet kimono made for standout festive styling.",
  },
];

export const featuredProducts = products.slice(0, 8);

export function getCategoryBySlug(slug) {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getProductsByCategory(categorySlug) {
  return products.filter((product) => product.categorySlug === categorySlug);
}

export function getCategoryName(categorySlug) {
  return getCategoryBySlug(categorySlug)?.name ?? "";
}

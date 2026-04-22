import { ProductRestockForm } from "@/app/(admin)/admin/products/product-restock-form";

export default async function AddStockPage({ params }) {
  const { productId } = await params;

  return <ProductRestockForm productId={productId} />;
}

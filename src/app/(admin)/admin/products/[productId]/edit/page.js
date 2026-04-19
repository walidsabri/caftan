import { ProductForm } from "@/app/(admin)/admin/products/product-form";

export default async function EditProductPage({ params }) {
  const { productId } = await params;

  return <ProductForm mode="edit" productId={productId} />;
}

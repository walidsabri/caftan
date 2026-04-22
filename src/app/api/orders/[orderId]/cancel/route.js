import { NextResponse } from "next/server";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { restoreStockForCancelledOrderItem } from "@/lib/orders/stock";

export async function POST(request, { params }) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { unauthorizedResponse, adminProfile } =
      await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const adminId = adminProfile?.id ?? null;

    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("id, assigned_stock_owner_id")
      .eq("order_id", orderId);

    if (orderItemsError) {
      return NextResponse.json(
        { error: orderItemsError.message },
        { status: 400 },
      );
    }

    if (!orderItems.length) {
      return NextResponse.json(
        { error: "This order has no items to cancel." },
        { status: 400 },
      );
    }

    for (const item of orderItems) {
      await restoreStockForCancelledOrderItem({
        orderItemId: item.id,
        adminId,
      });
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        assigned_stock_owner_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateOrderError) {
      return NextResponse.json(
        { error: updateOrderError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: "cancelled",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to cancel order.",
      },
      { status: 500 },
    );
  }
}

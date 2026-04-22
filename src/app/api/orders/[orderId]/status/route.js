import { NextResponse } from "next/server";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set([
  "pending",
  "confirmed",
  "assigned",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export async function POST(request, { params }) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const nextStatus = String(body?.status || "").trim().toLowerCase();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 },
      );
    }

    if (nextStatus === "cancelled") {
      return NextResponse.json(
        { error: "Use the cancel route to cancel an order." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    if (nextStatus === "assigned") {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, assigned_stock_owner_id")
        .eq("id", orderId)
        .single();

      if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 400 });
      }

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

      const allItemsAssigned =
        (orderItems ?? []).length > 0 &&
        (orderItems ?? []).every((orderItem) =>
          Boolean(orderItem.assigned_stock_owner_id),
        );

      if (!order.assigned_stock_owner_id && !allItemsAssigned) {
        return NextResponse.json(
          {
            error:
              "Assign each order item before setting the order as assigned.",
          },
          { status: 400 },
        );
      }
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: nextStatus,
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
      status: nextStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update order status.",
      },
      { status: 500 },
    );
  }
}

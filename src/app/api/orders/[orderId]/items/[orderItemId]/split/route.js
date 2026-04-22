import { NextResponse } from "next/server";

import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { splitOrderItemIntoUnits, syncOrderAssignmentState } from "@/lib/orders/stock";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request, { params }) {
  try {
    const { orderId, orderItemId } = await params;

    if (!orderId || !orderItemId) {
      return NextResponse.json(
        { error: "orderId and orderItemId are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select("id, order_id, quantity")
      .eq("id", orderItemId)
      .single();

    if (orderItemError || !orderItem) {
      return NextResponse.json(
        { error: orderItemError?.message || "Order item not found." },
        { status: 400 },
      );
    }

    if (orderItem.order_id !== orderId) {
      return NextResponse.json(
        { error: "This order item does not belong to the selected order." },
        { status: 400 },
      );
    }

    const splitResult = await splitOrderItemIntoUnits({
      orderItemId,
      supabaseClient: supabase,
    });
    const syncResult = await syncOrderAssignmentState({
      orderId,
      supabaseClient: supabase,
    });

    return NextResponse.json({
      success: true,
      unchanged: splitResult.unchanged ?? false,
      orderId,
      orderItemId,
      quantity: Number(orderItem.quantity) || 0,
      createdOrderItemIds: splitResult.orderItemIds ?? [],
      status: syncResult.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to split order item.",
      },
      { status: 500 },
    );
  }
}

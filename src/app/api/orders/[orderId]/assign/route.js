import { NextResponse } from "next/server";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  assignAndDeductStockForOrderItem,
  syncOrderAssignmentState,
} from "@/lib/orders/stock";

export async function POST(request, { params }) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const ownerName = body?.ownerName;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 },
      );
    }

    if (!ownerName) {
      return NextResponse.json(
        { error: "Owner name is required." },
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

    const { data: stockOwner, error: stockOwnerError } = await supabase
      .from("stock_owners")
      .select("id, name")
      .eq("name", ownerName)
      .eq("is_active", true)
      .single();

    if (stockOwnerError || !stockOwner) {
      return NextResponse.json(
        { error: "Stock owner not found." },
        { status: 400 },
      );
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

    if (!orderItems.length) {
      return NextResponse.json(
        { error: "This order has no items to assign." },
        { status: 400 },
      );
    }

    const alreadyAssignedItems = orderItems.filter(
      (item) => item.assigned_stock_owner_id,
    );

    if (alreadyAssignedItems.length) {
      return NextResponse.json(
        { error: "Some items in this order are already assigned." },
        { status: 400 },
      );
    }

    for (const item of orderItems) {
      await assignAndDeductStockForOrderItem({
        orderItemId: item.id,
        stockOwnerId: stockOwner.id,
        adminId,
      });
    }

    const syncResult = await syncOrderAssignmentState({
      orderId,
      supabaseClient: supabase,
    });

    return NextResponse.json({
      success: true,
      orderId,
      stockOwnerId: stockOwner.id,
      stockOwnerName: stockOwner.name,
      status: syncResult.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to assign order.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import {
  assignAndDeductStockForOrderItem,
  moveAssignedOrderItemToReservation,
  syncOrderAssignmentState,
} from "@/lib/orders/stock";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  try {
    const { orderId, orderItemId } = await params;
    const body = await request.json();
    const ownerName =
      typeof body?.ownerName === "string" ? body.ownerName.trim() : "";

    if (!orderId || !orderItemId) {
      return NextResponse.json(
        { error: "orderId and orderItemId are required." },
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

    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select("id, order_id, assigned_stock_owner_id, orders!inner(status)")
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

    const orderStatus = orderItem.orders?.status ?? "";

    if (
      ["preparing", "shipped", "delivered", "cancelled", "returned"].includes(
        orderStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Assigned owners can no longer be changed for this order." },
        { status: 400 },
      );
    }

    if (!ownerName) {
      if (orderItem.assigned_stock_owner_id) {
        await moveAssignedOrderItemToReservation({
          orderItemId,
          adminId,
          supabaseClient: supabase,
        });
      }

      const syncResult = await syncOrderAssignmentState({
        orderId,
        supabaseClient: supabase,
      });

      return NextResponse.json({
        success: true,
        unchanged: !orderItem.assigned_stock_owner_id,
        orderId,
        orderItemId,
        stockOwnerId: null,
        stockOwnerName: "",
        status: syncResult.status,
      });
    }

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

    if (orderItem.assigned_stock_owner_id === stockOwner.id) {
      const syncResult = await syncOrderAssignmentState({
        orderId,
        supabaseClient: supabase,
      });

      return NextResponse.json({
        success: true,
        unchanged: true,
        orderId,
        orderItemId,
        stockOwnerId: stockOwner.id,
        stockOwnerName: stockOwner.name,
        status: syncResult.status,
      });
    }

    if (orderItem.assigned_stock_owner_id) {
      await moveAssignedOrderItemToReservation({
        orderItemId,
        adminId,
        supabaseClient: supabase,
      });
    }

    await assignAndDeductStockForOrderItem({
      orderItemId,
      stockOwnerId: stockOwner.id,
      adminId,
      supabaseClient: supabase,
    });

    const syncResult = await syncOrderAssignmentState({
      orderId,
      supabaseClient: supabase,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderItemId,
      stockOwnerId: stockOwner.id,
      stockOwnerName: stockOwner.name,
      status: syncResult.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to assign order item.",
      },
      { status: 500 },
    );
  }
}

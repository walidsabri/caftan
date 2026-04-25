import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchOrderToZr } from "@/lib/zr/parcels";
import { resolveShippingRates } from "@/lib/zr/rates";

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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        customer_name,
        customer_phone,
        wilaya,
        commune,
        address,
        status,
        assigned_stock_owner_id,
        subtotal,
        shipping_fee,
        total_amount,
        shipping_method,
        shipping_company,
        shipping_status,
        tracking_number,
        shipping_external_id,
        zr_city_territory_id,
        zr_district_territory_id,
        stock_owners (
          id,
          name
        )
      `,
      )
      .eq("id", orderId)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed orders can be dispatched." },
        { status: 400 },
      );
    }

    if (order.shipping_external_id || order.tracking_number) {
      return NextResponse.json(
        { error: "This order is already dispatched." },
        { status: 400 },
      );
    }

    const ownerName = order.stock_owners?.name;

    if (!ownerName) {
      return NextResponse.json(
        { error: "Order must be assigned before dispatch." },
        { status: 400 },
      );
    }

    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select(
        `
        id,
        product_name,
        color_name,
        size_name,
        unit_price,
        quantity
      `,
      )
      .eq("order_id", order.id);

    if (orderItemsError) {
      return NextResponse.json(
        { error: orderItemsError.message },
        { status: 400 },
      );
    }

    if (!orderItems?.length) {
      return NextResponse.json(
        { error: "Order has no items." },
        { status: 400 },
      );
    }

    let orderForDispatch = order;

    if (!order.zr_city_territory_id || !order.zr_district_territory_id) {
      const shippingResolution = await resolveShippingRates({
        wilaya: order.wilaya,
        commune: order.commune,
      });
      const cityTerritoryId = shippingResolution.zrAddress?.cityTerritoryId;
      const districtTerritoryId =
        shippingResolution.zrAddress?.districtTerritoryId;

      if (!cityTerritoryId || !districtTerritoryId) {
        return NextResponse.json(
          {
            error:
              "Unable to resolve ZR territory ids for this order before dispatch.",
          },
          { status: 400 },
        );
      }

      orderForDispatch = {
        ...order,
        zr_city_territory_id: cityTerritoryId,
        zr_district_territory_id: districtTerritoryId,
      };
    }

    const dispatchResult = await dispatchOrderToZr({
      order: orderForDispatch,
      orderItems,
      ownerName,
    });

    const parcelId = dispatchResult.response?.id;

    if (!parcelId) {
      return NextResponse.json(
        { error: "ZR did not return a parcel id." },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        shipping_company: "zr-express",
        shipping_status: "created",
        shipping_account: dispatchResult.accountKey,
        shipping_external_id: parcelId,
        tracking_number: parcelId,
        zr_city_territory_id: orderForDispatch.zr_city_territory_id,
        zr_district_territory_id: orderForDispatch.zr_district_territory_id,
        dispatched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      parcelId,
      trackingNumber: parcelId,
      shippingAccount: dispatchResult.accountKey,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to dispatch order.",
      },
      { status: 500 },
    );
  }
}

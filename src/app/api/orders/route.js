import { NextResponse } from "next/server";
import { createStorefrontClient } from "@/lib/supabase/storefront";
import { getShippingFeeForMethod, resolveShippingRates } from "@/lib/zr/rates";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizePhone(value) {
  return normalizeText(value).replace(/\D/g, "");
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      variantId: normalizeText(
        item?.variantId ??
          item?.variant_id ??
          item?.selectedVariantId ??
          item?.id,
      ),
      quantity: Number(item?.quantity),
    }))
    .filter(
      (item) =>
        item.variantId && Number.isInteger(item.quantity) && item.quantity > 0,
    );
}

function validateOrderPayload(payload) {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const fullName = normalizeText(payload?.fullName);
  const phone = normalizePhone(payload?.phone);
  const wilaya = normalizeText(payload?.wilaya);
  const commune = normalizeText(payload?.commune);
  const address = normalizeText(payload?.address);
  const notes = normalizeOptionalText(payload?.notes);
  const shippingMethod = normalizeText(payload?.shippingMethod).toLowerCase();
  const wilayaCode = normalizeText(payload?.wilayaCode);
  const items = normalizeItems(rawItems);

  if (!fullName) {
    return { error: "Veuillez entrer votre nom complet." };
  }

  if (!phone) {
    return { error: "Veuillez entrer votre numero de telephone." };
  }

  if (phone.length !== 10) {
    return { error: "Le numero doit contenir exactement 10 chiffres." };
  }

  if (!/^(05|06|07)/.test(phone)) {
    return { error: "Le numero doit commencer par 05, 06 ou 07." };
  }

  if (!wilaya) {
    return { error: "Veuillez selectionner une wilaya." };
  }

  if (!commune) {
    return { error: "Veuillez selectionner une commune." };
  }

  if (!address) {
    return { error: "Veuillez entrer votre adresse." };
  }

  if (!["home", "desk"].includes(shippingMethod)) {
    return { error: "Veuillez choisir un mode de livraison." };
  }

  if (!rawItems.length) {
    return { error: "Votre panier est vide." };
  }

  if (
    items.length !== rawItems.length ||
    items.some((item) => !UUID_PATTERN.test(item.variantId))
  ) {
    return {
      error:
        "Votre panier contient un article invalide. Veuillez supprimer l'article du panier puis l'ajouter de nouveau.",
    };
  }

  return {
    data: {
      fullName,
      phone,
      wilaya,
      wilayaCode,
      commune,
      address,
      notes,
      shippingMethod,
      items,
    },
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateOrderPayload(body);

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      fullName,
      phone,
      wilaya,
      wilayaCode,
      commune,
      address,
      notes,
      shippingMethod,
      items,
    } = validation.data;

    const shippingResolution = await resolveShippingRates({
      wilaya,
      wilayaCode,
      commune,
    });

    const shippingFee = getShippingFeeForMethod(
      shippingResolution.rates,
      shippingMethod,
    );

    if (!Number.isFinite(shippingFee)) {
      return NextResponse.json(
        {
          error:
            "Aucun tarif ZR Express n'est disponible pour cette combinaison de livraison.",
        },
        { status: 400 },
      );
    }

    const supabase = createStorefrontClient();

    const { data, error } = await supabase.rpc("create_storefront_order", {
      customer_name_input: fullName,
      customer_phone_input: phone,
      wilaya_input: wilaya,
      commune_input: commune,
      address_input: address,
      notes_input: notes,
      shipping_method_input: shippingMethod,
      shipping_fee_input: shippingFee,
      order_items_input: items,
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Impossible d'enregistrer la commande pour le moment.",
        },
        { status: 400 },
      );
    }

    const order = Array.isArray(data) ? data[0] : data;

    if (!order?.order_id || !order?.order_number) {
      return NextResponse.json(
        { error: "La commande a ete creee sans numero de suivi exploitable." },
        { status: 500 },
      );
    }

    const { error: updateTerritoryError } = await supabase
      .from("orders")
      .update({
        zr_city_territory_id:
          shippingResolution.zrAddress?.cityTerritoryId ?? null,
        zr_district_territory_id:
          shippingResolution.zrAddress?.districtTerritoryId ?? null,
      })
      .eq("id", order.order_id);

    if (updateTerritoryError) {
      console.warn(
        "Failed to persist ZR territory ids for storefront order:",
        updateTerritoryError.message,
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.order_id,
        orderNumber: order.order_number,
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No shipping price found for this location."
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun tarif ZR Express n'est disponible pour cette combinaison de livraison.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la commande pour le moment.",
      },
      { status: 500 },
    );
  }
}

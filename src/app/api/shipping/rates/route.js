import { NextResponse } from "next/server";
import { resolveShippingRates } from "@/lib/zr/rates";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const wilaya = searchParams.get("wilaya");
    const commune = searchParams.get("commune");
    const wilayaCode = searchParams.get("wilayaCode");

    if (!wilaya && !commune && !wilayaCode) {
      return NextResponse.json(
        { error: "wilaya, commune or wilayaCode is required." },
        { status: 400 },
      );
    }

    const resolvedShipping = await resolveShippingRates({
      wilaya,
      commune,
      wilayaCode,
    });

    return NextResponse.json({
      success: true,
      territory: resolvedShipping.territory,
      rates: resolvedShipping.rates,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No shipping price found for this location."
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load shipping rates.",
      },
      { status: 500 },
    );
  }
}

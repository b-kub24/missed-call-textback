import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { normalizePhone } from "@/lib/utils";

/**
 * GET /api/clients
 * List all clients, optionally filtered by ?active=true
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active");

    let query = supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly === "true") {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[clients] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data });
  } catch (error) {
    console.error("[clients] GET unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      business_name,
      owner_name,
      owner_email,
      owner_phone,
      twilio_number,
      sms_template,
      after_hours_template,
      booking_link,
      business_hours,
      timezone,
    } = body;

    // Validate required fields
    if (!business_name || !owner_phone || !twilio_number) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: business_name, owner_phone, twilio_number",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const insertData: Record<string, unknown> = {
      business_name,
      owner_name: owner_name || null,
      owner_email: owner_email || null,
      owner_phone: normalizePhone(owner_phone),
      twilio_number: normalizePhone(twilio_number),
      booking_link: booking_link || null,
    };

    // Only set optional fields if provided
    if (sms_template) insertData.sms_template = sms_template;
    if (after_hours_template)
      insertData.after_hours_template = after_hours_template;
    if (business_hours) insertData.business_hours = business_hours;
    if (timezone) insertData.timezone = timezone;

    const { data, error } = await supabase
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[clients] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    console.error("[clients] POST unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients
 * Update a client (requires ?id= query param)
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("id");

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing client id query parameter" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const supabase = getSupabaseServiceClient();

    // Normalize phone numbers if provided
    if (body.owner_phone) body.owner_phone = normalizePhone(body.owner_phone);
    if (body.twilio_number)
      body.twilio_number = normalizePhone(body.twilio_number);

    const { data, error } = await supabase
      .from("clients")
      .update(body)
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      console.error("[clients] PUT error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (error) {
    console.error("[clients] PUT unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients
 * Deactivate a client (soft delete via ?id= query param)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("id");

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing client id query parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("clients")
      .update({ active: false })
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      console.error("[clients] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data, message: "Client deactivated" });
  } catch (error) {
    console.error("[clients] DELETE unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

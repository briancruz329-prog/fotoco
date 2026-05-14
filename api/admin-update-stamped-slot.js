import { requireEmployee, supabaseAdmin, getBody } from "./adminAuth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método no permitido"
      });
    }

    await requireEmployee(req);

    const body = getBody(req);

    const { id, pickup_date, active } = body;

    if (id) {
      const patch = {};

      if (active !== undefined) {
        patch.active = Boolean(active);
      }

      if (pickup_date !== undefined) {
        patch.pickup_date = pickup_date;
      }

      const { error } = await supabaseAdmin
        .from("stamped_tunic_slots")
        .update(patch)
        .eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        updated: true
      });
    }

    if (!pickup_date) {
      return res.status(400).json({
        error: "Falta fecha"
      });
    }

    const { error } = await supabaseAdmin.from("stamped_tunic_slots").upsert(
      {
        pickup_date,
        active: active !== false
      },
      {
        onConflict: "pickup_date"
      }
    );

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      created: true
    });
  } catch (error) {
    console.error("ERROR admin-update-stamped-slot:", error);

    return res.status(500).json({
      error: error.message || "Error actualizando día de túnica estampada"
    });
  }
}
import { requireEmployee, supabaseAdmin } from "./adminAuth.js";

export default async function handler(req, res) {
  try {
    const { employee } = await requireEmployee(req);

    if (!["admin", "employee"].includes(employee.role)) {
      return res.status(403).json({ error: "Sin permiso" });
    }

    const { id, pickup_date, capacity, active } = req.body;

    if (id) {
      const patch = {};

      if (capacity !== undefined) patch.capacity = Number(capacity);
      if (active !== undefined) patch.active = Boolean(active);

      const { error } = await supabaseAdmin
        .from("pickup_slots")
        .update(patch)
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    if (!pickup_date) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    const { error } = await supabaseAdmin
      .from("pickup_slots")
      .insert({
        pickup_date,
        capacity: Number(capacity || 25),
        reserved: 0,
        active: active !== false
      });

    if (error) throw error;

    return res.status(200).json({ ok: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
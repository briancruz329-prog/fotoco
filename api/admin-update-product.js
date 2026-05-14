import { requireEmployee, supabaseAdmin } from "./adminAuth.js";

export default async function handler(req, res) {
  try {
    const { employee } = await requireEmployee(req);

    if (!["admin", "employee"].includes(employee.role)) {
      return res.status(403).json({ error: "Sin permiso" });
    }

    const { id, price, stock, active } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Falta ID" });
    }

    const patch = {};

    if (price !== undefined) patch.price = Number(price);
    if (stock !== undefined) patch.stock = Number(stock);
    if (active !== undefined) patch.active = Boolean(active);

    const { error } = await supabaseAdmin
      .from("products")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ ok: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
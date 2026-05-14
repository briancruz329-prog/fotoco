import { requireEmployee, supabaseAdmin } from "./adminAuth.js";

export default async function handler(req, res) {
  try {
    await requireEmployee(req);

    const { id, status, payment_status } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Falta ID" });
    }

    const patch = {};

    if (status !== undefined) patch.status = status;
    if (payment_status !== undefined) patch.payment_status = payment_status;

    const { error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ ok: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
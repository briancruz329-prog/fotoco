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

    const {
      id,
      status,
      payment_status,
      payment_method
    } = body;

    if (!id) {
      return res.status(400).json({
        error: "Falta ID"
      });
    }

    const patch = {};

    if (status !== undefined) {
      patch.status = status;
    }

    if (payment_status !== undefined) {
      patch.payment_status = payment_status;
    }

    if (payment_method !== undefined) {
      patch.payment_method = payment_method;
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    console.error("ERROR admin-update-order:", error);

    return res.status(500).json({
      error: error.message || "Error actualizando pedido"
    });
  }
}
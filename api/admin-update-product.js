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

    const { id, name, price, stock, active, image_url } = body;

    if (!id) {
      return res.status(400).json({
        error: "Falta ID"
      });
    }

    const patch = {};

    if (name !== undefined) {
      patch.name = String(name).trim();
    }

    if (price !== undefined) {
      patch.price = Number(price);
    }

    if (stock !== undefined) {
      patch.stock = Number(stock);
    }

    if (active !== undefined) {
      patch.active = Boolean(active);
    }

    if (image_url !== undefined) {
      patch.image_url = image_url ? String(image_url).trim() : null;
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update(patch)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
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

    const { size, fitted, stock } = body;

    if (!size || fitted === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Faltan datos de stock"
      });
    }

    const { error } = await supabaseAdmin.from("tunic_stock").upsert(
      {
        size: String(size),
        fitted: Boolean(fitted),
        stock: Number(stock)
      },
      {
        onConflict: "size,fitted"
      }
    );

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    console.error("ERROR admin-update-tunic-stock:", error);

    return res.status(500).json({
      error: error.message || "Error actualizando stock de túnicas"
    });
  }
}
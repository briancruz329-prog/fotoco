import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, category, price, active, stock")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (productsError) {
      return res.status(500).json({
        ok: false,
        error: productsError.message,
        code: productsError.code,
        supabaseUrl: process.env.SUPABASE_URL || "NO DEFINIDA"
      });
    }

    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("pickup_slots")
      .select("id, pickup_date, capacity, reserved, active")
      .order("pickup_date", { ascending: true });

    if (slotsError) {
      return res.status(500).json({
        ok: false,
        error: slotsError.message,
        code: slotsError.code,
        supabaseUrl: process.env.SUPABASE_URL || "NO DEFINIDA"
      });
    }

    const resumenCategorias = {};

    for (const product of products || []) {
      const key = `${product.category} | active=${product.active}`;

      if (!resumenCategorias[key]) {
        resumenCategorias[key] = 0;
      }

      resumenCategorias[key]++;
    }

    return res.status(200).json({
      ok: true,
      supabaseUrl: process.env.SUPABASE_URL || "NO DEFINIDA",
      totalProducts: products ? products.length : 0,
      totalSlots: slots ? slots.length : 0,
      resumenCategorias,
      products: products || [],
      slots: slots || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      supabaseUrl: process.env.SUPABASE_URL || "NO DEFINIDA"
    });
  }
}
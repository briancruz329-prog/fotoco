import { requireEmployee, supabaseAdmin } from "./adminAuth.js";

export default async function handler(req, res) {
  try {
    await requireEmployee(req);

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("*");

    if (itemsError) {
      throw itemsError;
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("category")
      .order("name");

    if (productsError) {
      throw productsError;
    }

    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("pickup_slots")
      .select("*")
      .order("pickup_date", { ascending: true });

    if (slotsError) {
      throw slotsError;
    }

    return res.status(200).json({
      orders,
      items,
      products,
      slots
    });
  } catch (error) {
    return res.status(401).json({
      error: error.message
    });
  }
}
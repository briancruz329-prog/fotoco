import { requireEmployee, supabaseAdmin } from "./adminAuth.js";

function todayISOInUruguay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDaysISO(dateISO, days) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function upcomingCuadernetaDates() {
  const today = todayISOInUruguay();
  const dates = [];

  for (let i = 2; i <= 7; i++) {
    dates.push(addDaysISO(today, i));
  }

  return dates;
}

async function ensureUpcomingPickupSlots() {
  const dates = upcomingCuadernetaDates();

  const rows = dates.map((date) => ({
    pickup_date: date,
    capacity: 25,
    reserved: 0,
    active: true
  }));

  const { error } = await supabaseAdmin.from("pickup_slots").upsert(rows, {
    onConflict: "pickup_date",
    ignoreDuplicates: true
  });

  if (error) {
    throw error;
  }

  return dates;
}

export default async function handler(req, res) {
  try {
    await requireEmployee(req);

    const today = todayISOInUruguay();

    await ensureUpcomingPickupSlots();

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
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (productsError) {
      throw productsError;
    }

    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("pickup_slots")
      .select("*")
      .gte("pickup_date", today)
      .order("pickup_date", { ascending: true });

    if (slotsError) {
      throw slotsError;
    }

    const { data: stampedTunicSlots, error: stampedSlotsError } =
      await supabaseAdmin
        .from("stamped_tunic_slots")
        .select("*")
        .gte("pickup_date", today)
        .order("pickup_date", { ascending: true });

    if (stampedSlotsError) {
      throw stampedSlotsError;
    }

    const { data: tunicStock, error: tunicStockError } = await supabaseAdmin
      .from("tunic_stock")
      .select("*")
      .order("size", { ascending: true })
      .order("fitted", { ascending: false });

    if (tunicStockError) {
      throw tunicStockError;
    }

    return res.status(200).json({
      orders: orders || [],
      items: items || [],
      products: products || [],
      slots: slots || [],
      stampedTunicSlots: stampedTunicSlots || [],
      tunicStock: tunicStock || []
    });
  } catch (error) {
    console.error("ERROR admin-data:", error);

    return res.status(401).json({
      error: error.message || "No autorizado"
    });
  }
}
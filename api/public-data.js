import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function isWeekendISO(dateISO) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function upcomingCuadernetaDates() {
  const today = todayISOInUruguay();
  const dates = [];

  for (let i = 2; i <= 14; i++) {
    const dateISO = addDaysISO(today, i);

    if (!isWeekendISO(dateISO)) {
      dates.push(dateISO);
    }
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
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Método no permitido"
      });
    }

    const validDates = await ensureUpcomingPickupSlots();

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (productsError) {
      throw productsError;
    }

    const { data: pickupSlots, error: pickupSlotsError } = await supabaseAdmin
      .from("pickup_slots")
      .select("id, pickup_date, capacity, reserved, active")
      .in("pickup_date", validDates)
      .eq("active", true)
      .order("pickup_date", { ascending: true });

    if (pickupSlotsError) {
      throw pickupSlotsError;
    }

    const availablePickupSlots = (pickupSlots || [])
      .filter((slot) => Number(slot.capacity) - Number(slot.reserved) > 0)
      .map((slot) => ({
        id: slot.id,
        pickup_date: slot.pickup_date
      }));

    const { data: stampedTunicSlots, error: stampedSlotsError } =
      await supabaseAdmin
        .from("stamped_tunic_slots")
        .select("id, pickup_date")
        .eq("active", true)
        .order("pickup_date", { ascending: true });

    if (stampedSlotsError) {
      throw stampedSlotsError;
    }

    const { data: tunicStock, error: tunicStockError } = await supabaseAdmin
      .from("tunic_stock")
      .select("id, size, fitted, stock")
      .gt("stock", 0)
      .order("size", { ascending: true })
      .order("fitted", { ascending: false });

    if (tunicStockError) {
      throw tunicStockError;
    }

    return res.status(200).json({
      products: products || [],
      pickupSlots: availablePickupSlots,
      stampedTunicSlots: stampedTunicSlots || [],
      tunicStock: tunicStock || []
    });
  } catch (error) {
    console.error("ERROR public-data:", error);

    return res.status(500).json({
      error: error.message || "Error cargando datos públicos"
    });
  }
}
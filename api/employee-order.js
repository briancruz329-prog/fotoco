import { requireEmployee, supabaseAdmin, getBody } from "./adminAuth.js";
import { appendPedidoToSheet } from "./googleSheets.js";

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

function validCuadernetaDates() {
  const today = todayISOInUruguay();
  const dates = [];

  for (let i = 2; i <= 7; i++) {
    dates.push(addDaysISO(today, i));
  }

  return dates;
}

async function ensureUpcomingPickupSlots() {
  const dates = validCuadernetaDates();

  const rows = dates.map((date) => ({
    pickup_date: date,
    capacity: 25,
    reserved: 0,
    active: true
  }));

  const { error } = await supabaseAdmin
    .from("pickup_slots")
    .upsert(rows, {
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
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método no permitido"
      });
    }

    await requireEmployee(req);

    const body = getBody(req);

    const {
      customerName,
      customerPhone,
      customerEmail,
      items,
      pickupDate,
      stampedTunicPickupDate,
      paymentMethod
    } = body;

    const allowedPaymentMethods = ["Efectivo", "POS", "Transferencia"];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        error: "Método de pago inválido"
      });
    }

    if (!customerName || !customerPhone || !customerEmail) {
      return res.status(400).json({
        error: "Faltan datos del cliente"
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "El carrito está vacío"
      });
    }

    const productNames = items.map((item) => item.name);

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("name", productNames)
      .eq("active", true);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return res.status(400).json({
        error: "No se encontraron productos válidos"
      });
    }

    const productMap = new Map();

    products.forEach((product) => {
      productMap.set(product.name, product);
    });

    for (const item of items) {
      if (!productMap.has(item.name)) {
        return res.status(400).json({
          error: "Producto inválido: " + item.name
        });
      }
    }

    const counts = {};

    items.forEach((item) => {
      counts[item.name] = (counts[item.name] || 0) + 1;
    });

    const hasCuaderneta = items.some((item) => {
      const product = productMap.get(item.name);
      return product.category === "cuaderneta";
    });

    const hasTunicaEstampada = items.some((item) => {
      const product = productMap.get(item.name);

      return (
        product.category === "tunica" &&
        product.name.toLowerCase().includes("estampada")
      );
    });

    if (hasCuaderneta && !pickupDate) {
      return res.status(400).json({
        error: "Falta seleccionar fecha de retiro de cuaderneta"
      });
    }

    if (hasTunicaEstampada && !stampedTunicPickupDate) {
      return res.status(400).json({
        error: "Falta seleccionar fecha de retiro de túnica estampada"
      });
    }

    for (const [productName, quantity] of Object.entries(counts)) {
      const product = productMap.get(productName);

      if (product.category !== "cuaderneta") {
        const stockDisponible = Number(product.stock || 0);

        if (stockDisponible < quantity) {
          return res.status(400).json({
            error: "Sin stock suficiente de " + productName
          });
        }
      }
    }

    let slot = null;

    if (hasCuaderneta) {
      const allowedDates = await ensureUpcomingPickupSlots();

      if (!allowedDates.includes(pickupDate)) {
        return res.status(400).json({
          error: "La fecha seleccionada para cuaderneta está fuera del rango permitido"
        });
      }

      const { data: slotData, error: slotError } = await supabaseAdmin
        .from("pickup_slots")
        .select("*")
        .eq("pickup_date", pickupDate)
        .eq("active", true)
        .single();

      if (slotError || !slotData) {
        return res.status(400).json({
          error: "La fecha seleccionada para cuaderneta no está disponible"
        });
      }

      const capacity = Number(slotData.capacity || 0);
      const reserved = Number(slotData.reserved || 0);

      if (reserved >= capacity) {
        return res.status(400).json({
          error: "No quedan cupos disponibles para cuadernetas en esa fecha"
        });
      }

      slot = slotData;
    }

    if (hasTunicaEstampada) {
      const { data: stampedSlotData, error: stampedSlotError } =
        await supabaseAdmin
          .from("stamped_tunic_slots")
          .select("*")
          .eq("pickup_date", stampedTunicPickupDate)
          .eq("active", true)
          .single();

      if (stampedSlotError || !stampedSlotData) {
        return res.status(400).json({
          error: "La fecha seleccionada para túnica estampada no está disponible"
        });
      }
    }

    let total = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.name);

      total += Number(product.price);

      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: Number(product.price),
        quantity: 1,
        talle: product.category === "tunica" ? item.talle || "" : "",
        entallada: product.category === "tunica" ? item.entallada || "" : ""
      };
    });

    if (total <= 0) {
      return res.status(400).json({
        error: "Total inválido"
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        total,
        pickup_date: hasCuaderneta ? pickupDate : null,
        stamped_tunic_pickup_date: hasTunicaEstampada
          ? stampedTunicPickupDate
          : null,
        status: "no_entregado",
        payment_status: "pagado",
        payment_method: paymentMethod
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    const itemsWithOrderId = orderItems.map((item) => {
      return {
        ...item,
        order_id: order.id
      };
    });

    const { error: itemError } = await supabaseAdmin
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemError) {
      throw itemError;
    }

    for (const [productName, quantity] of Object.entries(counts)) {
      const product = productMap.get(productName);

      if (product.category !== "cuaderneta") {
        const newStock = Number(product.stock || 0) - Number(quantity);

        const { error: stockError } = await supabaseAdmin
          .from("products")
          .update({
            stock: newStock
          })
          .eq("id", product.id);

        if (stockError) {
          throw stockError;
        }
      }
    }

    if (hasCuaderneta && slot) {
      const { error: slotUpdateError } = await supabaseAdmin
        .from("pickup_slots")
        .update({
          reserved: Number(slot.reserved || 0) + 1
        })
        .eq("id", slot.id);

      if (slotUpdateError) {
        throw slotUpdateError;
      }
    }

    try {
      await appendPedidoToSheet({
        orderId: order.id,
        customerName,
        customerPhone,
        customerEmail,
        productos: orderItems.map((item) => item.product_name).join(", "),
        total,
        pickupDate: [
          hasCuaderneta ? `Cuaderneta: ${pickupDate}` : "",
          hasTunicaEstampada
            ? `Túnica estampada: ${stampedTunicPickupDate}`
            : ""
        ]
          .filter(Boolean)
          .join(" | "),
        status: "no_entregado",
        paymentStatus: `pagado - ${paymentMethod}`,
        paymentUrl: "",
        preferenceId: "",
        paymentId: ""
      });
    } catch (sheetError) {
      console.error("Error escribiendo en Google Sheets:", sheetError);
    }

    return res.status(200).json({
      ok: true,
      orderId: order.id,
      total
    });
  } catch (error) {
    console.error("ERROR employee-order:", error);

    return res.status(500).json({
      error: error.message || "Error creando pedido de empleado"
    });
  }
}
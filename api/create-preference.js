import { createClient } from "@supabase/supabase-js";
import { appendPedidoToSheet } from "./googleSheets.js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function leerBody(req) {
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const body = leerBody(req);

    const { customerName, customerPhone, customerEmail, items, pickupDate, stampedTunicPickupDate } =
      body;

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
      const { data: slotData, error: slotError } = await supabaseAdmin
        .from("pickup_slots")
        .select("*")
        .eq("pickup_date", pickupDate)
        .eq("active", true)
        .single();

      if (slotError || !slotData) {
        return res.status(400).json({
          error: "La fecha seleccionada no está disponible"
        });
      }

      const capacity = Number(slotData.capacity || 0);
      const reserved = Number(slotData.reserved || 0);

      if (reserved >= capacity) {
        return res.status(400).json({
          error: "Cupo completo de cuadernetas para esa fecha"
        });
      }

      slot = slotData;
    }

    let stampedTunicSlot = null;

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

  stampedTunicSlot = stampedSlotData;
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
stamped_tunic_pickup_date: hasTunicaEstampada ? stampedTunicPickupDate : null,
        status: "esperando_pago",
        payment_status: "pendiente"
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

    const mpPayload = {
      items: [
        {
          title: "Pedido Fotocopiadora AEQ",
          description: orderItems.map((item) => item.product_name).join(", "),
          quantity: 1,
          currency_id: "UYU",
          unit_price: total
        }
      ],
      payer: {
        name: customerName,
        email: customerEmail
      },
      external_reference: order.id,
      notification_url: `${process.env.SITE_URL}/api/mp-webhook`,
      back_urls: {
        success: `${process.env.SITE_URL}/success`,
        failure: `${process.env.SITE_URL}/failure`,
        pending: `${process.env.SITE_URL}/pending`
      },
      auto_return: "approved"
    };

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        },
        body: JSON.stringify(mpPayload)
      }
    );

    const mpData = await mpResponse.json();

    if (!mpResponse.ok || !mpData.init_point) {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "error_pago",
          payment_status: "error_creando_pago"
        })
        .eq("id", order.id);

      return res.status(500).json({
        error: "No se pudo crear el pago en Mercado Pago",
        detail: mpData
      });
    }

    await supabaseAdmin
      .from("orders")
      .update({
        mp_preference_id: mpData.id,
        mp_init_point: mpData.init_point
      })
      .eq("id", order.id);

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
  hasTunicaEstampada ? `Túnica estampada: ${stampedTunicPickupDate}` : ""
]
  .filter(Boolean)
  .join(" | "),
        status: "esperando_pago",
        paymentStatus: "pendiente",
        paymentUrl: mpData.init_point,
        preferenceId: mpData.id,
        paymentId: ""
      });
    } catch (sheetError) {
      console.error("Error escribiendo en Google Sheets:", sheetError);
    }

    return res.status(200).json({
      ok: true,
      orderId: order.id,
      paymentUrl: mpData.init_point
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Error interno del servidor"
    });
  }
}
import { requireEmployee, supabaseAdmin, getBody } from "./adminAuth.js";

function entalladaToBoolean(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return normalized === "si" || normalized === "true";
}

async function devolverStockDeItems(items) {
  for (const item of items || []) {
    if (item.category === "cuaderneta") {
      continue;
    }

    const cantidad = Number(item.quantity || 1);

    if (item.category === "tunica") {
      if (!item.talle) {
        continue;
      }

      const fitted = entalladaToBoolean(item.entallada);

      const { data: stockRow, error: stockError } = await supabaseAdmin
        .from("tunic_stock")
        .select("id, stock")
        .eq("size", String(item.talle))
        .eq("fitted", fitted)
        .single();

      if (stockError || !stockRow) {
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("tunic_stock")
        .update({
          stock: Number(stockRow.stock || 0) + cantidad
        })
        .eq("id", stockRow.id);

      if (updateError) {
        throw updateError;
      }

      continue;
    }

    if (!item.product_id) {
      continue;
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, stock")
      .eq("id", item.product_id)
      .single();

    if (productError || !product) {
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        stock: Number(product.stock || 0) + cantidad
      })
      .eq("id", product.id);

    if (updateError) {
      throw updateError;
    }
  }
}

async function liberarCupoCuaderneta(order, items) {
  const tieneCuaderneta = (items || []).some((item) => {
    return item.category === "cuaderneta";
  });

  if (!tieneCuaderneta || !order.pickup_date) {
    return;
  }

  const { data: slot, error: slotError } = await supabaseAdmin
    .from("pickup_slots")
    .select("id, reserved")
    .eq("pickup_date", order.pickup_date)
    .single();

  if (slotError || !slot) {
    return;
  }

  const reservadoActual = Number(slot.reserved || 0);
  const nuevoReservado = Math.max(0, reservadoActual - 1);

  const { error: updateError } = await supabaseAdmin
    .from("pickup_slots")
    .update({
      reserved: nuevoReservado
    })
    .eq("id", slot.id);

  if (updateError) {
    throw updateError;
  }
}

async function eliminarPedido(orderId, { devolverStockYCupo }) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("No se encontró el pedido");
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError) {
    throw itemsError;
  }

  if (devolverStockYCupo) {
    await devolverStockDeItems(items || []);
    await liberarCupoCuaderneta(order, items || []);
  }

  const { error: deleteItemsError } = await supabaseAdmin
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (deleteItemsError) {
    throw deleteItemsError;
  }

  const { error: deleteOrderError } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (deleteOrderError) {
    throw deleteOrderError;
  }

  return {
    ok: true,
    deleted: true
  };
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

    const { id, status, payment_status, payment_method } = body;

    if (!id) {
      return res.status(400).json({
        error: "Falta ID"
      });
    }

    if (payment_status === "rechazado") {
      const result = await eliminarPedido(id, {
        devolverStockYCupo: true
      });

      return res.status(200).json({
        ...result,
        reason: "rechazado"
      });
    }

    if (status === "entregado") {
      const result = await eliminarPedido(id, {
        devolverStockYCupo: false
      });

      return res.status(200).json({
        ...result,
        reason: "entregado"
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
      ok: true,
      deleted: false
    });
  } catch (error) {
    console.error("ERROR admin-update-order:", error);

    return res.status(500).json({
      error: error.message || "Error actualizando pedido"
    });
  }
}
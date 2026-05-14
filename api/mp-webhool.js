import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const paymentId =
      req.query["data.id"] ||
      req.query.id ||
      req.body?.data?.id;

    if (!paymentId) {
      return res.status(200).json({ ok: true });
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const payment = await response.json();

    const orderId = payment.external_reference;

    if (!orderId) {
      return res.status(200).json({ ok: true });
    }

    let paymentStatus = "pendiente";
    let orderStatus = "esperando_pago";

    if (payment.status === "approved") {
      paymentStatus = "pagado";
      orderStatus = "pagado";
    } else if (payment.status === "rejected") {
      paymentStatus = "rechazado";
      orderStatus = "pago_rechazado";
    } else if (payment.status === "pending") {
      paymentStatus = "pendiente";
      orderStatus = "esperando_pago";
    }

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: paymentStatus,
        status: orderStatus,
        mp_payment_id: String(paymentId)
      })
      .eq("id", orderId);

    return res.status(200).json({ ok: true });

  } catch (error) {
    return res.status(200).json({ ok: false });
  }
}
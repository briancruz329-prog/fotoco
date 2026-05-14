import { google } from "googleapis";

function googleSheetsConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!key) {
    throw new Error("Falta GOOGLE_PRIVATE_KEY");
  }

  return key.replace(/\\n/g, "\n");
}

function getAuth() {
  if (!process.env.GOOGLE_CLIENT_EMAIL) {
    throw new Error("Falta GOOGLE_CLIENT_EMAIL");
  }

  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export async function appendPedidoToSheet(pedido) {
  if (!googleSheetsConfigured()) {
    console.log("Google Sheets no configurado. Se omite escritura.");
    return;
  }

  const auth = getAuth();

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  const values = [
    [
      new Date().toISOString(),
      pedido.orderId || "",
      pedido.customerName || "",
      pedido.customerPhone || "",
      pedido.customerEmail || "",
      pedido.productos || "",
      pedido.total || 0,
      pedido.pickupDate || "",
      pedido.status || "",
      pedido.paymentStatus || "",
      pedido.paymentUrl || "",
      pedido.preferenceId || "",
      pedido.paymentId || ""
    ]
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Pedidos!A:M",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values
    }
  });
}
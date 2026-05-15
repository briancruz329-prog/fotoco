import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

async function requireEmployee(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    throw new Error("No autorizado");
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user?.email) {
    throw new Error("Sesión inválida");
  }

  const email = userData.user.email;

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("email", email)
    .single();

  if (employeeError || !employee) {
    throw new Error("Este usuario no es empleado autorizado");
  }

  return {
    user: userData.user,
    employee
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "admin-update-slot",
        message: "API de cupos funcionando. Usar POST para editar."
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método no permitido"
      });
    }

    await requireEmployee(req);

    const body = getBody(req);

    const { id, pickup_date, capacity, active } = body;

    if (id) {
      const patch = {};

      if (capacity !== undefined) {
        patch.capacity = Number(capacity);
      }

      if (active !== undefined) {
        patch.active = Boolean(active);
      }

      const { error } = await supabaseAdmin
        .from("pickup_slots")
        .update(patch)
        .eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        updated: true
      });
    }

    if (!pickup_date) {
      return res.status(400).json({
        error: "Falta fecha"
      });
    }

    const { error } = await supabaseAdmin.from("pickup_slots").upsert(
      {
        pickup_date,
        capacity: Number(capacity || 40),
        reserved: 0,
        active: active !== false
      },
      {
        onConflict: "pickup_date"
      }
    );

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      created: true
    });
  } catch (error) {
    console.error("ERROR admin-update-slot:", error);

    return res.status(500).json({
      error: error.message || "Error actualizando cupo"
    });
  }
}
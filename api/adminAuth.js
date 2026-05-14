import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function requireEmployee(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    throw new Error("No autorizado");
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

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
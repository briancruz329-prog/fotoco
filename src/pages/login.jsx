import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <form
        onSubmit={login}
        className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full"
      >
        <h1 className="text-3xl font-black text-orange-500 mb-2">
          Panel empleados
        </h1>

        <p className="text-zinc-600 mb-6">
          Iniciá sesión para administrar pedidos, stock y cupos.
        </p>

        <label className="block font-bold mb-2">Mail</label>
        <input
          className="w-full border rounded-xl px-4 py-3 mb-4"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block font-bold mb-2">Contraseña</label>
        <input
          className="w-full border rounded-xl px-4 py-3 mb-6"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl font-bold">
          Entrar
        </button>
      </form>
    </div>
  );
}
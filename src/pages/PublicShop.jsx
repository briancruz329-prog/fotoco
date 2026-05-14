import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PublicShop() {
  const [products, setProducts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("cuaderneta");
  const [search, setSearch] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [talle, setTalle] = useState("");
  const [entallada, setEntallada] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

async function loadData() {
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("*");

  if (productsError) {
    alert("Error cargando productos");
    return;
  }

  const { data: slotsData, error: slotsError } = await supabase
    .from("pickup_slots")
    .select("*");

  if (slotsError) {
    alert("Error cargando cupos");
    return;
  }

  setProducts(productsData || []);

  const availableSlots = (slotsData || []).filter((slot) => {
    return Number(slot.capacity) - Number(slot.reserved) > 0;
  });

  setSlots(availableSlots);
}

  function productStockRemaining(product) {
    if (product.category === "cuaderneta") {
      return 999999;
    }

    const inCart = cart.filter((item) => item.id === product.id).length;
    return Number(product.stock || 0) - inCart;
  }

  function addToCart(product) {
    if (product.category !== "cuaderneta") {
      const remaining = productStockRemaining(product);

      if (remaining <= 0) {
        alert("No hay más stock disponible de " + product.name);
        return;
      }
    }

    setCart([...cart, product]);
  }

  function removeFromCart(index) {
    setCart(cart.filter((_, i) => i !== index));
  }

  function clearCart() {
    setCart([]);
  }

const filteredProducts = products.filter((product) => {
  const sameCategory = product.category === category;
  const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());

  return sameCategory && matchesSearch;
});

  const total = cart.reduce((sum, product) => {
    return sum + Number(product.price);
  }, 0);

  const hasTunica = cart.some((product) => product.category === "tunica");
  const hasCuaderneta = cart.some((product) => product.category === "cuaderneta");

  async function checkout() {
    if (cart.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      alert("Completá nombre, celular y mail");
      return;
    }

    if (hasCuaderneta && !pickupDate) {
      alert("Seleccioná una fecha para retirar la cuaderneta");
      return;
    }

    if (hasTunica && (!talle || !entallada)) {
      alert("Completá talle y si la túnica es entallada");
      return;
    }

    const items = cart.map((product) => {
      return {
        name: product.name,
        talle: product.category === "tunica" ? talle : "",
        entallada: product.category === "tunica" ? entallada : ""
      };
    });

    setLoading(true);

    try {
      const response = await fetch("/api/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          items,
          pickupDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al crear el pedido");
        setLoading(false);
        return;
      }

      if (!data.paymentUrl) {
        alert("No se pudo generar el link de pago");
        setLoading(false);
        return;
      }

      window.location.href = data.paymentUrl;

    } catch (error) {
      console.error(error);
      alert("Error al conectar con el servidor");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 text-zinc-900">
      <button
        onClick={() => document.getElementById("carrito-panel")?.scrollIntoView({ behavior: "smooth" })}
        className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white px-5 py-4 rounded-full shadow-xl z-40 flex items-center gap-2 font-bold"
      >
        🛒 <span>{cart.length}</span>
      </button>

      <a
        href="#top"
        className="fixed bottom-6 left-6 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 rounded-full shadow-xl z-40"
      >
        ⬆️
      </a>

      <div className="max-w-7xl mx-auto p-6">
        <header id="top" className="text-center py-10">
          <img src="/logo-aeq.png" alt="AEQ" className="h-24 mx-auto mb-5" />

          <h1 className="text-5xl md:text-7xl font-black text-orange-500 tracking-tight">
            FOTOCOPIADORA AEQ
          </h1>

          <p className="max-w-4xl mx-auto mt-6 text-zinc-600 leading-relaxed text-lg">
            La fotocopiadora AEQ es un servicio organizado y gestionado desde la asociación de estudiantes.
          </p>

          <div className="mt-6 inline-block bg-orange-100 border border-orange-200 text-orange-600 font-bold rounded-2xl px-6 py-4">
            ¡Apoyá a las y los estudiantes!
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          <main className="md:col-span-2 bg-white border border-orange-100 rounded-3xl p-8 shadow-lg">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 Buscar materia o producto..."
              className="w-full mb-5 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            <div className="flex gap-3 mb-6 flex-wrap">
              <button
                onClick={() => setCategory("cuaderneta")}
                className={
                  "px-5 py-3 rounded-xl font-bold transition " +
                  (category === "cuaderneta"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-orange-100 text-orange-600 hover:bg-orange-200")
                }
              >
                📚 Cuadernetas
              </button>

              <button
                onClick={() => setCategory("tunica")}
                className={
                  "px-5 py-3 rounded-xl font-bold transition " +
                  (category === "tunica"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-orange-100 text-orange-600 hover:bg-orange-200")
                }
              >
                🥼 Túnicas
              </button>

              <button
                onClick={() => setCategory("regla")}
                className={
                  "px-5 py-3 rounded-xl font-bold transition " +
                  (category === "regla"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-orange-100 text-orange-600 hover:bg-orange-200")
                }
              >
                📏 Reglas
              </button>
            </div>

            <div className="space-y-3">
              {filteredProducts.length === 0 && (
                <p className="text-zinc-500">No hay productos para mostrar.</p>
              )}

              {filteredProducts.map((product) => {
                const remaining = productStockRemaining(product);
                const sinStock = product.category !== "cuaderneta" && remaining <= 0;

                return (
                  <div
                    key={product.id}
                    className={
                      "flex justify-between items-center gap-4 border border-zinc-200 rounded-2xl p-4 hover:shadow-md transition bg-white " +
                      (sinStock ? "opacity-50" : "")
                    }
                  >
                    {product.image_url && (
                      <img
                        src={"/" + product.image_url}
                        alt={product.name}
                        className="h-20 w-20 object-cover rounded-xl border"
                      />
                    )}

                    <div className="flex-1">
                      <p className="font-bold text-lg">{product.name}</p>
                      <p className="text-orange-500 font-black">${product.price}</p>

                      <p className={sinStock ? "text-sm text-red-500 font-bold" : "text-sm text-zinc-500"}>
                        {product.category === "cuaderneta"
                          ? "Cupo diario compartido"
                          : sinStock
                            ? "Sin stock"
                            : "Stock disponible: " + remaining}
                      </p>
                    </div>

                    <button
                      disabled={sinStock}
                      onClick={() => addToCart(product)}
                      className={
                        sinStock
                          ? "bg-zinc-300 text-zinc-600 px-5 py-3 rounded-xl font-bold cursor-not-allowed"
                          : "bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold"
                      }
                    >
                      {sinStock ? "Sin stock" : "Agregar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </main>

          <aside
            id="carrito-panel"
            className="bg-white border border-orange-100 rounded-3xl p-8 shadow-lg sticky top-6"
          >
            <h2 className="text-3xl font-black text-orange-500 mb-4">
              🛒 Comprar
            </h2>

            <div className="space-y-2 mb-4">
              {cart.length === 0 && (
                <p className="text-zinc-500">Vacío</p>
              )}

              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between gap-2 border-b border-zinc-200 py-2"
                >
                  <span>{item.name} - ${item.price}</span>

                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <p className="font-black text-2xl mb-4">
              Total: <span className="text-orange-500">${total}</span>
            </p>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-800 p-3 rounded-xl font-bold mb-4"
              >
                Vaciar carrito
              </button>
            )}

            <div className="space-y-3">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full border rounded-xl px-4 py-3"
              />

              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Celular"
                className="w-full border rounded-xl px-4 py-3"
              />

              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Mail"
                type="email"
                className="w-full border rounded-xl px-4 py-3"
              />

              {hasTunica && (
                <div className="border border-orange-200 rounded-2xl p-4 bg-orange-50">
                  <p className="font-black text-orange-500 mb-3">
                    Datos de la túnica
                  </p>

                  <select
                    value={talle}
                    onChange={(e) => setTalle(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 mb-3"
                  >
                    <option value="">Seleccionar talle</option>
                    <option>XS</option>
                    <option>S</option>
                    <option>M</option>
                    <option>L</option>
                    <option>XL</option>
                    <option>XXL</option>
                  </select>

                  <select
                    value={entallada}
                    onChange={(e) => setEntallada(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option value="">¿Entallada?</option>
                    <option>Sí</option>
                    <option>No</option>
                  </select>
                </div>
              )}

              {hasCuaderneta && (
                <div className="border border-orange-200 rounded-2xl p-4 bg-orange-50">
                  <p className="font-black text-orange-500 mb-3">
                    Fecha de retiro de cuaderneta
                  </p>

                  <select
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option value="">Seleccionar fecha</option>

                    {slots.map((slot) => (
                      <option key={slot.id} value={slot.pickup_date}>
                        {slot.pickup_date} — {slot.capacity - slot.reserved} cupos
                      </option>
                    ))}
                  </select>

                  <p className="text-sm text-zinc-600 mt-2">
                    Las cuadernetas comparten cupo diario entre todas las materias.
                  </p>
                </div>
              )}

              <button
                onClick={checkout}
                disabled={loading || cart.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white p-4 rounded-xl font-bold"
              >
                {loading ? "Generando pago..." : "Ir a pagar"}
              </button>
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t border-orange-200 pt-8 text-center text-zinc-600 pb-10">
          <h3 className="text-2xl font-black text-orange-500 mb-4">
            📩 Contacto
          </h3>

          <p>📷 Instagram: @fotocopiadoraaeq</p>
          <p>✉️ Mail: fotocoaeq@gmail.com</p>
          <p>🕒 Horario: 10 a 16hs en fotocopiadora</p>
        </footer>
      </div>
    </div>
  );
}
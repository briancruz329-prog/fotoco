import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const TUNIC_SIZES = ["42", "44", "46", "48", "50", "52", "54", "56"];

const CUADERNETA_GROUPS = [
  {
    title: "Primer semestre",
    items: [
      { match: "Química General 1", label: "Química General 1" },
      { match: "ICB1", label: "ICB 1" },
      { match: "Matemática 01", label: "Matemática 01" },
      { match: "Matemática A", label: "Matemática A" },
      { match: "Matemática 03", label: "Matemática 03" },
      { match: "Manual de Datos", label: "Manual de datos" },
      { match: "PRL", label: "PRL" }
    ]
  },
  {
    title: "Tercer semestre",
    items: [
      {
        match: "Química Analítica 1 Laboratorio",
        label: "Química Analítica 1 Laboratorio"
      },
      {
        match: "Química Analítica 1 Teórico",
        label: "Química Analítica 1 Teórico"
      },
      { match: "Nomenclatura", label: "Nomenclatura" },
      { match: "Inorgánica Teórico", label: "Química Inorgánica Teórico" },
      {
        match: "Inorgánica Laboratorio",
        label: "Química Inorgánica Laboratorio"
      },
      { match: "Matemática 05", label: "Matemática 05" },
      { match: "Física 102", label: "Física 102" },
      { match: "Carey", label: "Carey" },
      { match: "Tratamiento de Datos", label: "Tratamiento de datos" }
    ]
  },
  {
    title: "Quinto semestre",
    items: [
      {
        match: "Química Analítica 3 Laboratorio",
        label: "Química Analítica 3 Laboratorio"
      },
      {
        match: "Química Analítica 3 Teórico",
        label: "Química Analítica 3 Teórico"
      },
      {
        match: "Química Orgánica 103 Laboratorio",
        label: "Química Orgánica 103 Laboratorio"
      },
      { match: "Química Orgánica 104", label: "Orgánica 104" },
      {
        match: "Fisicoquímica 103 Laboratorio",
        label: "Fisicoquímica 103 Laboratorio"
      },
      {
        match: "Fisicoquímica 103 Teórico",
        label: "Fisicoquímica 103 Teórico"
      },
      { match: "Matemática 06", label: "Matemática 06" },
      { match: "Lehninger", label: "Lehninger" }
    ]
  },
  {
    title: "Séptimo semestre",
    items: [
      { match: "Bacteriología y Micología", label: "Bacteriología y Micología" },
      { match: "Parasitología", label: "Parasitología" },
      { match: "SIG", label: "SIG" }
    ]
  }
];

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateDDMM(dateISO) {
  if (!dateISO) return "";

  const parts = String(dateISO).split("-");

  if (parts.length !== 3) {
    return dateISO;
  }

  const [, month, day] = parts;

  return `${day}-${month}`;
}

function entalladaToBoolean(value) {
  const normalized = normalizeText(value);
  return normalized === "si" || normalized === "true";
}

export default function Employee() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [products, setProducts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stampedTunicSlots, setStampedTunicSlots] = useState([]);
  const [tunicStock, setTunicStock] = useState([]);

  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("cuaderneta");
  const [search, setSearch] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [stampedTunicPickupDate, setStampedTunicPickupDate] = useState("");

  const [talle, setTalle] = useState("");
  const [entallada, setEntallada] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const tunicaCount = cart.filter((product) => product.category === "tunica").length;

    if (tunicaCount === 0) {
      setTalle("");
      setEntallada("");
      return;
    }

    if (talle) {
      const stockSi = getTunicStock(talle, true);
      const stockNo = getTunicStock(talle, false);

      if (stockSi < tunicaCount && stockNo < tunicaCount) {
        setTalle("");
        setEntallada("");
        return;
      }
    }

    if (talle && entallada) {
      const fitted = entalladaToBoolean(entallada);
      const stock = getTunicStock(talle, fitted);

      if (stock < tunicaCount) {
        setEntallada("");
      }
    }
  }, [cart, talle, entallada, tunicStock]);

  async function init() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      window.location.href = "/login?next=/employee";
      return;
    }

    setSession(data.session);
    setCheckingSession(false);
    await loadData();
  }

  async function loadData() {
    try {
      const response = await fetch("/api/public-data");
      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respuesta no JSON:", text);
        alert("El servidor no respondió JSON al cargar datos");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Error cargando datos");
      }

      setProducts(data.products || []);
      setSlots(data.pickupSlots || []);
      setStampedTunicSlots(data.stampedTunicSlots || []);
      setTunicStock(data.tunicStock || []);
    } catch (error) {
      console.error(error);
      alert("Error cargando productos");
    }
  }

  function getTunicStock(size, fitted) {
    const found = tunicStock.find((row) => {
      return String(row.size) === String(size) && Boolean(row.fitted) === Boolean(fitted);
    });

    return Number(found?.stock || 0);
  }

  function getTotalTunicStock() {
    return tunicStock.reduce((sum, row) => {
      return sum + Number(row.stock || 0);
    }, 0);
  }

  function getAvailableTunicSizes(quantity) {
    return TUNIC_SIZES.filter((size) => {
      const stockSi = getTunicStock(size, true);
      const stockNo = getTunicStock(size, false);

      return stockSi >= quantity || stockNo >= quantity;
    });
  }

  function getAvailableFittedOptions(size, quantity) {
    if (!size) {
      return [];
    }

    const options = [];

    if (getTunicStock(size, true) >= quantity) {
      options.push("Sí");
    }

    if (getTunicStock(size, false) >= quantity) {
      options.push("No");
    }

    return options;
  }

  function productStockRemaining(product) {
    if (product.category === "cuaderneta") {
      return 999999;
    }

    if (product.category === "tunica") {
      return getTotalTunicStock();
    }

    const inCart = cart.filter((item) => item.id === product.id).length;
    return Number(product.stock || 0) - inCart;
  }

  function addToCart(product) {
    if (product.category === "tunica") {
      if (getTotalTunicStock() <= 0) {
        alert("No hay stock disponible de túnicas");
        return;
      }

      const nextTunicaCount =
        cart.filter((item) => item.category === "tunica").length + 1;

      if (talle && entallada) {
        const fitted = entalladaToBoolean(entallada);
        const selectedStock = getTunicStock(talle, fitted);

        if (selectedStock < nextTunicaCount) {
          alert("No hay suficiente stock para ese talle y tipo de túnica");
          return;
        }
      }
    }

    if (product.category !== "cuaderneta" && product.category !== "tunica") {
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

  function clearOrder() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setPickupDate("");
    setStampedTunicPickupDate("");
    setTalle("");
    setEntallada("");
    setPaymentMethod("Efectivo");
  }

  function getProductDisplayName(product) {
    if (product.category !== "cuaderneta") {
      return product.name;
    }

    const normalizedName = normalizeText(product.name);

    for (const group of CUADERNETA_GROUPS) {
      const found = group.items.find((item) => {
        return normalizeText(item.match) === normalizedName;
      });

      if (found) {
        return found.label;
      }
    }

    return product.name;
  }

  const filteredProducts = products.filter((product) => {
    const sameCategory = product.category === category;
    const matchesSearch = getProductDisplayName(product)
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!sameCategory || !matchesSearch) {
      return false;
    }

    if (product.category === "tunica") {
      return getTotalTunicStock() > 0;
    }

    if (product.category !== "cuaderneta") {
      return productStockRemaining(product) > 0;
    }

    return true;
  });

  const groupedCuadernetas = CUADERNETA_GROUPS.map((group) => {
    const groupItems = group.items
      .map((definition) => {
        const product = products.find((productItem) => {
          return normalizeText(productItem.name) === normalizeText(definition.match);
        });

        if (!product) {
          return null;
        }

        const matchesSearch =
          normalizeText(definition.label).includes(normalizeText(search)) ||
          normalizeText(product.name).includes(normalizeText(search));

        if (!matchesSearch) {
          return null;
        }

        return {
          product,
          label: definition.label
        };
      })
      .filter(Boolean);

    return {
      title: group.title,
      items: groupItems
    };
  }).filter((group) => group.items.length > 0);

  const total = cart.reduce((sum, product) => {
    return sum + Number(product.price);
  }, 0);

  const tunicaCount = cart.filter((product) => product.category === "tunica").length;
  const hasTunica = tunicaCount > 0;

  const hasCuaderneta = cart.some((product) => {
    return product.category === "cuaderneta";
  });

  const hasTunicaEstampada = cart.some((product) => {
    return (
      product.category === "tunica" &&
      product.name.toLowerCase().includes("estampada")
    );
  });

  const availableTunicSizes = getAvailableTunicSizes(tunicaCount || 1);
  const availableFittedOptions = getAvailableFittedOptions(talle, tunicaCount || 1);

  async function submitOrder(paymentStatus) {
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

    if (hasTunicaEstampada && !stampedTunicPickupDate) {
      alert("Seleccioná una fecha para retirar la túnica estampada");
      return;
    }

    if (hasTunica && (!talle || !entallada)) {
      alert("Completá talle y si la túnica es entallada");
      return;
    }

    if (hasTunica) {
      const fitted = entalladaToBoolean(entallada);
      const stock = getTunicStock(talle, fitted);

      if (stock < tunicaCount) {
        alert("No hay stock suficiente para ese talle y tipo de túnica");
        return;
      }
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
      const response = await fetch("/api/employee-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          items,
          pickupDate,
          stampedTunicPickupDate,
          paymentMethod,
          paymentStatus
        })
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respuesta no JSON:", text);
        alert("El servidor no respondió JSON");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        alert(data.error || "Error creando pedido");
        setLoading(false);
        return;
      }

      if (paymentStatus === "pagado") {
        alert("Pedido creado como pagado. Total: $" + data.total);
      } else {
        alert("Pedido creado como pendiente. Total: $" + data.total);
      }

      clearOrder();
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al conectar con el servidor");
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function renderProductCard(product, displayName = product.name) {
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
            alt={displayName}
            className="h-20 w-20 object-cover rounded-xl border"
          />
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-lg">{displayName}</p>

            <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600">
              {product.category === "cuaderneta"
                ? "Cuaderneta"
                : product.category === "tunica"
                  ? "Túnica"
                  : "Regla"}
            </span>
          </div>

          <p className="text-orange-500 font-black">${product.price}</p>

          {sinStock && (
            <p className="text-sm text-red-500 font-bold">Sin stock</p>
          )}
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
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 font-bold">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 text-zinc-900">
      <div className="max-w-7xl mx-auto p-6">
        <header className="flex flex-col md:flex-row justify-between gap-4 md:items-center py-8">
          <div>
            <h1 className="text-5xl font-black text-orange-500">
              Pedido empleado
            </h1>

            <p className="text-zinc-600 mt-2">
              Crear pedido directo sin Mercado Pago.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <a href="/admin" className="bg-zinc-200 px-4 py-3 rounded-xl font-bold">
              Panel admin
            </a>

            <a href="/" className="bg-zinc-200 px-4 py-3 rounded-xl font-bold">
              Tienda pública
            </a>

            <button
              onClick={logout}
              className="bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold"
            >
              Salir
            </button>
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

            <div className="space-y-6">
              {category === "cuaderneta" ? (
                <>
                  {groupedCuadernetas.length === 0 && (
                    <p className="text-zinc-500">No hay cuadernetas para mostrar.</p>
                  )}

                  {groupedCuadernetas.map((group) => (
                    <section key={group.title}>
                      <h2 className="text-2xl font-black text-orange-500 mb-3">
                        {group.title}
                      </h2>

                      <div className="space-y-3">
                        {group.items.map(({ product, label }) => {
                          return renderProductCard(product, label);
                        })}
                      </div>
                    </section>
                  ))}
                </>
              ) : (
                <>
                  {filteredProducts.length === 0 && (
                    <p className="text-zinc-500">No hay productos para mostrar.</p>
                  )}

                  <div className="space-y-3">
                    {filteredProducts.map((product) => {
                      return renderProductCard(product, product.name);
                    })}
                  </div>
                </>
              )}
            </div>
          </main>

          <aside className="bg-white border border-orange-100 rounded-3xl p-8 shadow-lg sticky top-6">
            <h2 className="text-3xl font-black text-orange-500 mb-4">
              Pedido
            </h2>

            <div className="space-y-2 mb-4">
              {cart.length === 0 && <p className="text-zinc-500">Vacío</p>}

              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between gap-2 border-b border-zinc-200 py-2"
                >
                  <span>
                    {getProductDisplayName(item)} - ${item.price}
                  </span>

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

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="POS">POS</option>
                <option value="Transferencia">Transferencia</option>
              </select>

              {hasTunica && (
                <div className="border border-orange-200 rounded-2xl p-4 bg-orange-50">
                  <p className="font-black text-orange-500 mb-3">
                    Datos de la túnica
                  </p>

                  <select
                    value={talle}
                    onChange={(e) => {
                      setTalle(e.target.value);
                      setEntallada("");
                    }}
                    className="w-full border rounded-xl px-4 py-3 mb-3"
                  >
                    <option value="">Seleccionar talle</option>

                    {availableTunicSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>

                  <select
                    value={entallada}
                    onChange={(e) => setEntallada(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                    disabled={!talle}
                  >
                    <option value="">¿Entallada?</option>

                    {availableFittedOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
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
                        {formatDateDDMM(slot.pickup_date)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasTunicaEstampada && (
                <div className="border border-orange-200 rounded-2xl p-4 bg-orange-50">
                  <p className="font-black text-orange-500 mb-3">
                    Fecha de retiro de túnica estampada
                  </p>

                  <select
                    value={stampedTunicPickupDate}
                    onChange={(e) => setStampedTunicPickupDate(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option value="">Seleccionar fecha</option>

                    {stampedTunicSlots.map((slot) => (
                      <option key={slot.id} value={slot.pickup_date}>
                        {formatDateDDMM(slot.pickup_date)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => submitOrder("pagado")}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white p-4 rounded-xl font-bold"
                >
                  {loading ? "Creando pedido..." : "Pagar ahora"}
                </button>

                <button
                  onClick={() => submitOrder("pendiente")}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white p-4 rounded-xl font-bold"
                >
                  {loading ? "Creando pedido..." : "Pagar después"}
                </button>

                <button
                  onClick={clearOrder}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 text-zinc-800 p-3 rounded-xl font-bold"
                >
                  Vaciar pedido
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
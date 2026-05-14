import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [slots, setSlots] = useState([]);

  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(25);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      window.location.href = "/login";
      return;
    }

    setSession(data.session);
    await loadAdminData(data.session.access_token);
    setLoading(false);
  }

  async function apiFetch(url, options = {}) {
    const token = session?.access_token;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error("Respuesta no JSON:", text);
      throw new Error("La API no respondió JSON. Revisá si la ruta existe.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Error en servidor");
    }

    return data;
  }

  async function loadAdminData(token = session?.access_token) {
    const response = await fetch("/api/admin-data", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "No autorizado");
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    setOrders(data.orders || []);
    setItems(data.items || []);
    setProducts(data.products || []);
    setSlots(data.slots || []);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function updateProduct(product, patch) {
    try {
      await apiFetch("/api/admin-update-product", {
        method: "POST",
        body: JSON.stringify({
          id: product.id,
          ...patch
        })
      });

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function updateSlot(slot, patch) {
    try {
      await apiFetch("/api/admin-update-slot", {
        method: "POST",
        body: JSON.stringify({
          id: slot.id,
          ...patch
        })
      });

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function createSlot() {
    if (!newSlotDate) {
      alert("Elegí una fecha");
      return;
    }

    try {
      await apiFetch("/api/admin-update-slot", {
        method: "POST",
        body: JSON.stringify({
          pickup_date: newSlotDate,
          capacity: Number(newSlotCapacity),
          active: true
        })
      });

      setNewSlotDate("");
      setNewSlotCapacity(25);
      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function updateOrder(order, patch) {
    try {
      await apiFetch("/api/admin-update-order", {
        method: "POST",
        body: JSON.stringify({
          id: order.id,
          ...patch
        })
      });

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  function orderProducts(orderId) {
    return items
      .filter((item) => item.order_id === orderId)
      .map((item) => item.product_name)
      .join(", ");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="font-bold text-orange-500">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6 text-zinc-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between gap-4 md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-orange-500">
              Panel empleados AEQ
            </h1>
            <p className="text-zinc-600">
              Editar pedidos, productos, stock y cupos.
            </p>
          </div>

          <div className="flex gap-3">
            <a href="/" className="bg-zinc-200 px-4 py-3 rounded-xl font-bold">
              Ver tienda
            </a>

            <button
              onClick={logout}
              className="bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold"
            >
              Salir
            </button>
          </div>
        </header>

        <section className="bg-white rounded-3xl shadow p-6 mb-8">
          <h2 className="text-2xl font-black text-orange-500 mb-4">
            Pedidos
          </h2>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Celular</th>
                  <th className="p-2">Productos</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Pago</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Link</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b align-top">
                    <td className="p-2">
                      {new Date(order.created_at).toLocaleString()}
                    </td>

                    <td className="p-2">
                      <b>{order.customer_name}</b>
                      <br />
                      <span className="text-zinc-500">
                        {order.customer_email}
                      </span>
                    </td>

                    <td className="p-2">{order.customer_phone}</td>

                    <td className="p-2">
                      {orderProducts(order.id)}

                      {order.pickup_date && (
                        <p className="text-orange-500 font-bold">
                          Retiro: {order.pickup_date}
                        </p>
                      )}
                    </td>

                    <td className="p-2 font-bold">${order.total}</td>

                    <td className="p-2">
                      <select
                        value={order.payment_status || "pendiente"}
                        onChange={(e) =>
                          updateOrder(order, { payment_status: e.target.value })
                        }
                        className="border rounded-lg p-2"
                      >
                        <option value="pendiente">pendiente</option>
                        <option value="pagado">pagado</option>
                        <option value="rechazado">rechazado</option>
                      </select>
                    </td>

                    <td className="p-2">
                      <select
                        value={order.status || "esperando_pago"}
                        onChange={(e) =>
                          updateOrder(order, { status: e.target.value })
                        }
                        className="border rounded-lg p-2"
                      >
                        <option value="esperando_pago">esperando_pago</option>
                        <option value="pagado">pagado</option>
                        <option value="preparando">preparando</option>
                        <option value="listo_para_retirar">
                          listo_para_retirar
                        </option>
                        <option value="entregado">entregado</option>
                        <option value="cancelado">cancelado</option>
                      </select>
                    </td>

                    <td className="p-2">
                      {order.mp_init_point && (
                        <a
                          className="text-orange-500 font-bold underline"
                          href={order.mp_init_point}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pago
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow p-6 mb-8">
          <h2 className="text-2xl font-black text-orange-500 mb-4">
            Productos, precios y stock
          </h2>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Producto</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Imagen</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Activo</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="p-2 font-bold">
                      <input
                        defaultValue={product.name}
                        className="border rounded-lg p-2 w-64"
                        onBlur={(e) =>
                          updateProduct(product, { name: e.target.value })
                        }
                      />
                    </td>

                    <td className="p-2">{product.category}</td>

                    <td className="p-2">
                      <input
                        defaultValue={product.image_url || ""}
                        placeholder="ej: tunica-normal.jpg"
                        className="border rounded-lg p-2 w-48"
                        onBlur={(e) =>
                          updateProduct(product, { image_url: e.target.value })
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        defaultValue={product.price}
                        className="border rounded-lg p-2 w-24"
                        onBlur={(e) =>
                          updateProduct(product, {
                            price: Number(e.target.value)
                          })
                        }
                      />
                    </td>

                    <td className="p-2">
                      {product.category === "cuaderneta" ? (
                        <span className="text-zinc-500">usa cupo diario</span>
                      ) : (
                        <input
                          type="number"
                          defaultValue={product.stock || 0}
                          className="border rounded-lg p-2 w-24"
                          onBlur={(e) =>
                            updateProduct(product, {
                              stock: Number(e.target.value)
                            })
                          }
                        />
                      )}
                    </td>

                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={product.active}
                        onChange={(e) =>
                          updateProduct(product, { active: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow p-6 mb-8">
          <h2 className="text-2xl font-black text-orange-500 mb-4">
            Cupos de cuadernetas
          </h2>

          <div className="flex gap-3 mb-5 flex-wrap">
            <input
              type="date"
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
              className="border rounded-xl p-3"
            />

            <input
              type="number"
              value={newSlotCapacity}
              onChange={(e) => setNewSlotCapacity(e.target.value)}
              className="border rounded-xl p-3 w-32"
            />

            <button
              onClick={createSlot}
              className="bg-orange-500 text-white px-5 py-3 rounded-xl font-bold"
            >
              Agregar fecha
            </button>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Cupo</th>
                  <th className="p-2">Reservados</th>
                  <th className="p-2">Disponibles</th>
                  <th className="p-2">Activo</th>
                </tr>
              </thead>

              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b">
                    <td className="p-2">{slot.pickup_date}</td>

                    <td className="p-2">
                      <input
                        type="number"
                        defaultValue={slot.capacity}
                        className="border rounded-lg p-2 w-24"
                        onBlur={(e) =>
                          updateSlot(slot, {
                            capacity: Number(e.target.value)
                          })
                        }
                      />
                    </td>

                    <td className="p-2">{slot.reserved}</td>
                    <td className="p-2">
                      {Number(slot.capacity) - Number(slot.reserved)}
                    </td>

                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={slot.active}
                        onChange={(e) =>
                          updateSlot(slot, { active: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
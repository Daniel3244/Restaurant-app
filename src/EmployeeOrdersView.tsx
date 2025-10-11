import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { API_BASE_URL } from "./config";
import { useAuth } from "./context/AuthContext";

const STATUS_FLOW = ["W realizacji", "Gotowe", "Zrealizowane", "Anulowane"] as const;
const TABS = [
  { key: "todo", label: "Do zrealizowania", statuses: ["W realizacji", "Gotowe"] as const },
  { key: "done", label: "Zrealizowane", statuses: ["Zrealizowane"] as const },
  { key: "cancelled", label: "Anulowane", statuses: ["Anulowane"] as const },
] as const;

type OrderRecord = {
  id: number;
  orderNumber: number;
  createdAt: string | null;
  type: string;
  status: typeof STATUS_FLOW[number];
  items: { id: number; name: string; quantity: number; price: number }[];
};

function EmployeeOrdersView() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("todo");
  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, { headers: authHeaders });
      if (!res.ok) throw new Error("Blad pobierania zamowien");
      const data = (await res.json()) as OrderRecord[];
      setOrders(data.sort((a, b) => b.orderNumber - a.orderNumber));
    } catch (e: any) {
      setError(e?.message ?? "Nieznany blad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = window.setInterval(fetchOrders, 10000);
    return () => window.clearInterval(interval);
  }, [authHeaders]);

  const nextStatus = (status: typeof STATUS_FLOW[number]) => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const handleStatusChange = async (order: OrderRecord) => {
    const newStatus = nextStatus(order.status);
    if (!newStatus) return;
    setUpdating(order.id);
    try {
      await fetch(`${API_BASE_URL}/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (order: OrderRecord) => {
    if (!window.confirm("Czy na pewno anulowac zamowienie?")) return;
    setUpdating(order.id);
    try {
      await fetch(`${API_BASE_URL}/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Anulowane" }),
      });
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const todayStamp = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(order => order.createdAt?.slice(0, 10) === todayStamp);
  const filteredOrders = todayOrders.filter(order => {
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return true;
    const statuses = Array.from(tab.statuses);
    return statuses.includes(order.status);
  });

  return (
    <div className="manager-view">
      <div className="manager-view-header">
        <h2>Panel pracownika - Zamowienia</h2>
        <button className="manager-logout-btn" onClick={auth.logout}>Wyloguj</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "manager-save-btn" : "manager-cancel-btn"}
            style={{ fontWeight: activeTab === tab.key ? "bold" : "normal" }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "#ff3b00" }}>{error}</p>
      ) : (
        <table className="manager-table" style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Numer</th>
              <th>Data</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Pozycje</th>
              {activeTab === "todo" && <th>Akcje</th>}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} style={{ opacity: updating === order.id ? 0.5 : 1 }}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt?.replace("T", " ").slice(0, 16)}</td>
                <td>{order.type}</td>
                <td>{order.status}</td>
                <td style={{ verticalAlign: "middle", textAlign: "left", height: "48px" }}>
                  <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "block", width: "100%" }}>
                      {order.items.map(item => (
                        <li key={item.id} style={{ fontSize: "0.98rem", lineHeight: "1.6", display: "inline" }}>
                          {item.name} x {item.quantity} <span style={{ color: "#ff9100" }}>{item.price} zl</span>{" "}
                        </li>
                      ))}
                    </ul>
                  </div>
                </td>
                {activeTab === "todo" && (
                  <td>
                    {order.status !== "Zrealizowane" && order.status !== "Anulowane" && (
                      <button
                        className="manager-save-btn"
                        style={{ marginBottom: 6 }}
                        disabled={updating === order.id}
                        onClick={() => handleStatusChange(order)}
                      >
                        {nextStatus(order.status) ? `Do: ${nextStatus(order.status)}` : "Zrealizowane"}
                      </button>
                    )}
                    <br />
                    {order.status !== "Zrealizowane" && order.status !== "Anulowane" && (
                      <button
                        className="manager-delete-btn"
                        disabled={updating === order.id}
                        onClick={() => handleCancel(order)}
                      >
                        Anuluj
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={activeTab === "todo" ? 6 : 5} style={{ textAlign: "center" }}>
                  Brak zamowien
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeeOrdersView;


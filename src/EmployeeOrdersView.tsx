import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [hasLoaded, setHasLoaded] = useState(false);
  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchOrders = useCallback(async ({ showSpinner = false }: { showSpinner?: boolean } = {}) => {
      const shouldShowSpinner = showSpinner || !hasLoaded;
      if (shouldShowSpinner) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders`, { headers: authHeaders });
        if (!res.ok) throw new Error("Blad pobierania zamowien");
        const data = (await res.json()) as OrderRecord[];
        setOrders(data.sort((a, b) => b.orderNumber - a.orderNumber));
        setHasLoaded(true);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany blad");
      } finally {
        if (shouldShowSpinner) {
          setLoading(false);
        }
      }
  }, [authHeaders, hasLoaded]);

  useEffect(() => {
    fetchOrders({ showSpinner: true });
    const interval = window.setInterval(() => {
      fetchOrders();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchOrders]);

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
    const statuses: readonly typeof STATUS_FLOW[number][] = tab.statuses;
    return statuses.includes(order.status);
  });

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      counts[tab.key] = todayOrders.filter(order => (tab.statuses as readonly typeof STATUS_FLOW[number][]).includes(order.status)).length;
    }
    return counts;
  }, [todayOrders]);

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <div>
          <h2>Panel pracownika - Zamowienia</h2>
        </div>
        <div className="manager-nav-actions">
          <a href="/" className="manager-nav-back">&larr; Powrot do strony glownej</a>
          <button className="manager-logout-btn" onClick={auth.logout}>Wyloguj</button>
        </div>
      </div>
      <div className="employee-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`employee-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <strong>{tab.label}</strong>
            <small>{tabCounts[tab.key] ?? 0} dzisiaj</small>
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "#ff3b00" }}>{error}</p>
      ) : (
        <div className="employee-table-wrapper">
        <table className="manager-table compact" style={{ marginTop: 12 }}>
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
                <td>
                  {order.createdAt?.replace("T", " ").slice(0, 16)}
                  <div className="manager-order-meta mobile-break">
                    <span>Typ: {order.type}</span>
                    <span>Status: {order.status}</span>
                  </div>
                </td>
                <td>
                  <div className={`manager-status-pill ${order.status === "Gotowe" ? "ready" : "progress"}`}>
                    {order.status}
                  </div>
                </td>
                <td style={{ verticalAlign: "middle", textAlign: "left", height: "48px" }}>
                  <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "block", width: "100%" }}>
                      {order.items.map(item => (
                        <li key={item.id} style={{ fontSize: "0.95rem", lineHeight: "1.6", display: "inline" }}>
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
        </div>
      )}
    </div>
  );
}

export default EmployeeOrdersView;






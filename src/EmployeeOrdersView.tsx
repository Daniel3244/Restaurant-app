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

type OrdersResponse = {
  orders: OrderRecord[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

const DEFAULT_PAGE_SIZE = 100;

function EmployeeOrdersView() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("todo");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchOrders = useCallback(async ({ showSpinner = false, targetPage }: { showSpinner?: boolean; targetPage?: number } = {}) => {
    const pageToLoad = typeof targetPage === "number" ? Math.max(targetPage, 0) : page;
    const shouldShowSpinner = showSpinner || !hasLoaded;
    if (shouldShowSpinner) {
      setLoading(true);
      setError(null);
    }
    try {
      const params = new URLSearchParams();
      params.append("page", String(pageToLoad));
      params.append("size", String(DEFAULT_PAGE_SIZE));
      params.append("todayOnly", "true");
      const res = await fetch(`${API_BASE_URL}/api/orders?${params.toString()}`, { headers: authHeaders });
      if (res.status === 304) {
        setHasLoaded(true);
        return;
      }
      if (!res.ok) throw new Error("Błąd pobierania zamówień");
      const payload = (await res.json()) as OrdersResponse;
      const fetchedOrders = payload.orders ?? [];
      setOrders(fetchedOrders.sort((a, b) => b.orderNumber - a.orderNumber));
      setTotalElements(payload.totalElements ?? fetchedOrders.length);
      setTotalPages(Math.max(payload.totalPages ?? 1, 1));
      const payloadPage = typeof payload.page === "number" ? payload.page : pageToLoad;
      setPage(prev => (prev === payloadPage ? prev : payloadPage));
      setHasLoaded(true);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : "Nieznany blad";
      setError(message);
    } finally {
      if (shouldShowSpinner) {
        setLoading(false);
      }
    }
  }, [authHeaders, hasLoaded, page]);

  useEffect(() => {
    fetchOrders({ showSpinner: true, targetPage: page });
    const interval = window.setInterval(() => {
      fetchOrders({ targetPage: page });
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchOrders, page]);

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
      fetchOrders({ targetPage: page });
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (order: OrderRecord) => {
    if (!window.confirm("Czy na pewno anulować zamówienie?")) return;
    setUpdating(order.id);
    try {
      await fetch(`${API_BASE_URL}/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Anulowane" }),
      });
      fetchOrders({ targetPage: page });
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return true;
    const statuses: readonly typeof STATUS_FLOW[number][] = tab.statuses;
    return statuses.includes(order.status);
  });

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      counts[tab.key] = orders.filter(order => (tab.statuses as readonly typeof STATUS_FLOW[number][]).includes(order.status)).length;
    }
    return counts;
  }, [orders]);

  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;
  const pageLabel = totalPages > 0 ? page + 1 : 0;

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <div>
          <h2>Panel pracownika - Zamówienia</h2>
          <span className="manager-refresh-info">Widoczne: {filteredOrders.length} / {totalElements}</span>
        </div>
        <div className="manager-nav-actions">
          <button className="manager-logout-btn" onClick={auth.logout}>Wyloguj</button>
        </div>
      </div>
      <div className="manager-pagination" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button className="manager-cancel-btn" onClick={() => setPage(prev => Math.max(prev - 1, 0))} disabled={!canGoPrev}>
          &larr; Poprzednia
        </button>
        <span>Strona {pageLabel} z {totalPages}</span>
        <button className="manager-save-btn" onClick={() => setPage(prev => Math.min(prev + 1, Math.max(totalPages - 1, 0)))} disabled={!canGoNext}>
          Następna &rarr;
        </button>
        <button className="manager-save-btn" onClick={() => fetchOrders({ showSpinner: true, targetPage: page })}>
          Odśwież
        </button>
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
                          {item.name} x {item.quantity} <span style={{ color: "#ff9100" }}>{item.price} zł</span>{" "}
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
                  Brak zamówień
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






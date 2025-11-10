import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { API_BASE_URL } from "./config";
import { useAuth } from "./context/AuthContext";
import { useLocale, useTranslate } from "./context/LocaleContext";

const STATUS_FLOW = ["W realizacji", "Gotowe", "Zrealizowane", "Anulowane"] as const;
type Status = typeof STATUS_FLOW[number];

type TabKey = "todo" | "done" | "cancelled";

type TabConfig = {
  key: TabKey;
  labelPl: string;
  labelEn: string;
  statuses: Status[];
};

const TABS: TabConfig[] = [
  { key: "todo", labelPl: "Do zrealizowania", labelEn: "To complete", statuses: ["W realizacji", "Gotowe"] },
  { key: "done", labelPl: "Zrealizowane", labelEn: "Completed", statuses: ["Zrealizowane"] },
  { key: "cancelled", labelPl: "Anulowane", labelEn: "Cancelled", statuses: ["Anulowane"] },
];

type OrderRecord = {
  id: number;
  orderNumber: number;
  createdAt: string | null;
  type: string;
  status: Status;
  items: { id: number; name: string; nameEn?: string | null; quantity: number; price: number }[];
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
  const [activeTab, setActiveTab] = useState<TabKey>("todo");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const auth = useAuth();
  const { language } = useLocale();
  const t = useTranslate();
  const currencySymbol = language === "pl" ? "zł" : "PLN";
  const navigate = useNavigate();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchOrders = useCallback(
    async ({ showSpinner = false, targetPage }: { showSpinner?: boolean; targetPage?: number } = {}) => {
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
        if (!res.ok) throw new Error(t("Błąd pobierania zamówień", "Failed to fetch orders"));
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
        const message = err instanceof Error && err.message ? err.message : t("Nieznany błąd", "Unknown error");
        setError(message);
      } finally {
        if (shouldShowSpinner) {
          setLoading(false);
        }
      }
    },
    [API_BASE_URL, authHeaders, hasLoaded, page, t],
  );

  useEffect(() => {
    fetchOrders({ showSpinner: true, targetPage: page });
    const interval = window.setInterval(() => {
      fetchOrders({ targetPage: page });
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchOrders, page]);

  const nextStatus = (status: Status) => {
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
    if (!window.confirm(t("Czy na pewno anulować zamówienie?", "Cancel this order?"))) return;
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
    return tab.statuses.includes(order.status);
  });

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      todo: 0,
      done: 0,
      cancelled: 0,
    };
    for (const tab of TABS) {
      counts[tab.key] = orders.filter(order => tab.statuses.includes(order.status)).length;
    }
    return counts;
  }, [orders]);

  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;
  const pageLabel = totalPages > 0 ? page + 1 : 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return t("Brak danych", "No data");
    const date = new Date(iso);
    return date.toLocaleString(language === "pl" ? "pl-PL" : "en-US", { hour12: language !== "pl" });
  };

  const statusLabel = (status: Status) => {
    switch (status) {
      case "W realizacji": return t("W realizacji", "In progress");
      case "Gotowe": return t("Gotowe", "Ready");
      case "Zrealizowane": return t("Zrealizowane", "Completed");
      case "Anulowane": return t("Anulowane", "Cancelled");
      default: return status;
    }
  };

  const typeLabel = (type: string) => (type === "na wynos" ? t("Na wynos", "Take away") : t("Na miejscu", "Eat in"));

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <div>
          <h2>{t("Panel pracownika - Zamówienia", "Employee panel - Orders")}</h2>
          <span className="manager-refresh-info">
            {t("Widoczne:", "Visible:")} {filteredOrders.length} / {totalElements}
          </span>
        </div>
        <div className="manager-nav-actions" style={{ gap: 12 }}>
          <button className="manager-cancel-btn" onClick={() => navigate("/")}>
            {t("Powrót", "Back")}
          </button>
          <button className="manager-logout-btn" onClick={auth.logout}>{t("Wyloguj", "Sign out")}</button>
        </div>
      </div>
      <div className="manager-pagination" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button className="manager-cancel-btn" onClick={() => setPage(prev => Math.max(prev - 1, 0))} disabled={!canGoPrev}>
          &larr; {t("Poprzednia", "Previous")}
        </button>
        <span>{t("Strona", "Page")} {pageLabel} {t("z", "of")} {totalPages}</span>
        <button className="manager-save-btn" onClick={() => setPage(prev => Math.min(prev + 1, Math.max(totalPages - 1, 0)))} disabled={!canGoNext}>
          {t("Następna", "Next")} &rarr;
        </button>
        <button className="manager-save-btn" onClick={() => fetchOrders({ showSpinner: true, targetPage: page })}>
          {t("Odśwież", "Refresh")}
        </button>
      </div>
      <div className="employee-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`employee-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <strong>{t(tab.labelPl, tab.labelEn)}</strong>
            <small>{tabCounts[tab.key]} {t("dzisiaj", "today")}</small>
          </button>
        ))}
      </div>
      {loading ? (
        <p>{t("Ładowanie...", "Loading...")}</p>
      ) : error ? (
        <p style={{ color: "#ff3b00" }}>{error}</p>
      ) : (
        <div className="employee-table-wrapper">
          <table className="manager-table compact" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>{t("Numer", "Number")}</th>
                <th>{t("Data", "Date")}</th>
                <th>{t("Typ", "Type")}</th>
                <th>{t("Status", "Status")}</th>
                <th>{t("Pozycje", "Items")}</th>
                {activeTab === "todo" && <th>{t("Akcje", "Actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={{ opacity: updating === order.id ? 0.5 : 1 }}>
                  <td><b>{order.orderNumber}</b></td>
                  <td>
                    {formatDate(order.createdAt)}
                    <div className="manager-order-meta mobile-break">
                      <span>{t("Typ:", "Type:")} {typeLabel(order.type)}</span>
                      <span>{t("Status:", "Status:")} {statusLabel(order.status)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`manager-status-pill ${order.status === "Gotowe" ? "ready" : "progress"}`}>
                      {statusLabel(order.status)}
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "left", height: "48px" }}>
                    <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "block", width: "100%" }}>
                      {order.items.map(item => {
                        const displayName = language === "pl" ? item.name : (item.nameEn?.trim() || item.name);
                        return (
                          <li key={item.id} style={{ fontSize: "0.95rem", lineHeight: "1.6", display: "inline" }}>
                            {displayName} x {item.quantity} <span style={{ color: "#ff9100" }}>{item.price} {currencySymbol}</span>{" "}
                          </li>
                        );
                      })}
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
                          {nextStatus(order.status)
                            ? t(`Do: ${nextStatus(order.status)}`, `Move to: ${statusLabel(nextStatus(order.status) as Status)}`)
                            : t("Zrealizowane", "Completed")}
                        </button>
                      )}
                      <br />
                      {order.status !== "Zrealizowane" && order.status !== "Anulowane" && (
                        <button
                          className="manager-delete-btn"
                          disabled={updating === order.id}
                          onClick={() => handleCancel(order)}
                        >
                          {t("Anuluj", "Cancel")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={activeTab === "todo" ? 6 : 5} style={{ textAlign: "center" }}>
                    {t("Brak zamówień", "No orders")}
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

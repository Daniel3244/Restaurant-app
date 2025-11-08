
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import LandingView from './views/LandingView';
import OrderingKioskView from './views/OrderingKioskView';
import EmployeeOrdersView from './EmployeeOrdersView';
import ManagerMenuView from './ManagerMenuView';
import ManagerOrdersView from './ManagerOrdersView';
import ManagerReportsView from './ManagerReportsView';
import ManagerLayout from './views/ManagerLayout';
import OrderNumbersScreen from './OrderNumbersScreen';
import LoginView from './LoginView';
import { RequireRole } from './routes/RequireAuth';

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/order" element={<OrderingKioskView />} />
        <Route path="/screen" element={<OrderNumbersScreen />} />

        <Route element={<RequireRole roles={['manager','employee']} />}>
          <Route path="/employee" element={<EmployeeOrdersView />} />
        </Route>

        <Route element={<RequireRole roles={['manager']} />}>
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="menu" element={<ManagerMenuView />} />
            <Route path="orders" element={<ManagerOrdersView />} />
            <Route path="reports" element={<ManagerReportsView />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;





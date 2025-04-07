import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import UserManagementPage from './pages/UserManagementPage';
import CustomerIssuesPage from './pages/CustomerIssuesPage';
import AdminOrderManagement from './pages/AdminOrderManagement';
import MenuManagement from './components/MenuManagement';
import Unauthorized from './pages/Unauthorized';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import SalesAnalyticsPage from './pages/SalesAnalyticsPage';
import MenuItemsAnalyticsPage from './pages/MenuItemsAnalyticsPage';
import InventoryAnalyticsPage from './pages/InventoryAnalyticsPage';
import CustomerAnalyticsPage from './pages/CustomerAnalyticsPage';
import FeedbackAnalyticsPage from './pages/FeedbackAnalyticsPage';
import ManagerDashboard from './pages/ManagerDashboard';
import MenuItemForm from './components/MenuItemForm';
import CategoryForm from './components/CategoryForm';
import StaffManagementPage from './pages/StaffManagementPage';
import CustomerDashboard from './pages/CustomerDashboard';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import Feedback from './pages/Feedback';
import AdminReservations from './pages/AdminReservations';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Context
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Menu Item Components
import MenuItemList from './components/MenuItemList';
import MenuItemDetail from './components/MenuItemDetail';
import TableManagement from './components/TableManagement';

const ProtectedDashboard = () => {
  const { currentUser } = useAuth();
  return (
    <React.Fragment>
      <Navbar />
      {currentUser?.role === 'admin' ? (
        <Navigate to="/admin" replace />
      ) : currentUser?.role === 'customer' ? (
        <Navigate to="/customer" replace />
      ) : (
        <Dashboard />
      )}
    </React.Fragment>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster position="top-right" />
        <CartProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes for authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<ProtectedDashboard />} />
              <Route path="/dashboard" element={<ProtectedDashboard />} />
              <Route path="/profile" element={<><Navbar /><Profile /></>} />
              <Route path="/feedback" element={<><Navbar /><Feedback /></>} />
            </Route>
            
            {/* Protected routes for customer users */}
            <Route element={<ProtectedRoute requiredRole={['customer']} />}>
<<<<<<< Updated upstream
              <Route path="/customer" element={<><Navbar /><CustomerDashboard /></>} />
=======
              <Route path="/customer" element={<CustomerDashboard />} />
>>>>>>> Stashed changes
            </Route>
            
            {/* Protected routes for admin users */}
            <Route element={<ProtectedRoute requiredRole={['admin']} />}>
              <Route path="/admin" element={<><Navbar /><AdminDashboard /></>} />
              <Route path="/admin/users" element={<><Navbar /><UserManagementPage /></>} />
              <Route path="/admin/support" element={<><Navbar /><CustomerIssuesPage /></>} />
              <Route path="/admin/menu" element={<><Navbar /><MenuManagement /></>} />
              <Route path="/admin/orders" element={<><Navbar /><AdminOrderManagement /></>} />
              <Route path="/admin/analytics" element={<><Navbar /><AnalyticsDashboard /></>} />
              <Route path="/admin/analytics/sales" element={<><Navbar /><SalesAnalyticsPage /></>} />
              <Route path="/admin/analytics/menu-items" element={<><Navbar /><MenuItemsAnalyticsPage /></>} />
              <Route path="/admin/analytics/inventory" element={<><Navbar /><InventoryAnalyticsPage /></>} />
              <Route path="/admin/analytics/customers" element={<><Navbar /><CustomerAnalyticsPage /></>} />
              <Route path="/admin/analytics/feedback" element={<><Navbar /><FeedbackAnalyticsPage /></>} />
              <Route path="/admin/reservations" element={<><Navbar /><AdminReservations /></>} />
              <Route path="/admin/tables" element={<><Navbar /><TableManagement /></>} />
            </Route>

            {/* Protected routes for manager users */}
            <Route element={<ProtectedRoute requiredRole={['manager']} />}>
              <Route path="/manager/dashboard" element={<><Navbar /><ManagerDashboard /></>} />
              <Route path="/manager/menu/new" element={<><Navbar /><MenuItemForm mode="create" /></>} />
              <Route path="/manager/menu/:id/edit" element={<><Navbar /><MenuItemForm mode="edit" /></>} />
              <Route path="/manager/categories/new" element={<><Navbar /><CategoryForm mode="create" /></>} />
              <Route path="/manager/categories/:id/edit" element={<><Navbar /><CategoryForm mode="edit" /></>} />
              <Route path="/manager/menu" element={<><Navbar /><MenuManagement /></>} />
              <Route path="/manager/orders" element={<><Navbar /><AdminOrderManagement /></>} />
              <Route path="/manager/staff" element={<><Navbar /><StaffManagementPage /></>} />
              <Route path="/manager/tables" element={<><Navbar /><TableManagement /></>} />
            </Route>
            
            {/* Menu Item Routes */}
            <Route path="/menu-items" element={<MenuPage />} />
            <Route path="/menu-items/create" element={<MenuItemForm mode="create" />} />
            <Route path="/menu-items/edit/:id" element={<MenuItemForm mode="edit" />} />
            <Route path="/menu-items/:id" element={<MenuItemDetail />} />
            
            {/* Add new routes for order flow */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </div>
    </AuthProvider>
  );
};

export default App;
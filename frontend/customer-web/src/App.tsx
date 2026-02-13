import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './design-system/ThemeProvider';
import { ReactQueryProvider } from './lib/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalToastFunction, unregisterGlobalToastFunction } from './utils/api';
import { Layout } from './components/Layout';
import { PageTransition } from './components/PageTransition';
import { FloatingCart } from './components/FloatingCart';
import { VoiceAssistant } from './components/VoiceAssistant';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Skeleton } from './design-system/Skeleton';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

// Code Splitting - Lazy Loading für alle Routes
const RestaurantList = lazy(() => import('./components/RestaurantList').then(m => ({ default: m.RestaurantList })));
const Menu = lazy(() => import('./components/Menu').then(m => ({ default: m.Menu })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./components/Register').then(m => ({ default: m.Register })));
const OrderHistory = lazy(() => import('./components/OrderHistory').then(m => ({ default: m.OrderHistory })));
const OrderTracking = lazy(() => import('./components/OrderTracking').then(m => ({ default: m.OrderTracking })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const Addresses = lazy(() => import('./components/Addresses').then(m => ({ default: m.Addresses })));
const Favorites = lazy(() => import('./components/Favorites').then(m => ({ default: m.Favorites })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const MealPlanner = lazy(() => import('./components/MealPlanner').then(m => ({ default: m.MealPlanner })));
const LegalPage = lazy(() => import('./components/LegalPage').then(m => ({ default: m.LegalPage })));
const LoyaltyProgram = lazy(() => import('./components/LoyaltyProgram').then(m => ({ default: m.LoyaltyProgram })));
const ScheduledOrders = lazy(() => import('./components/ScheduledOrders').then(m => ({ default: m.ScheduledOrders })));
const GiftCards = lazy(() => import('./components/GiftCards').then(m => ({ default: m.GiftCards })));
const RestaurantDetails = lazy(() => import('./components/RestaurantDetails').then(m => ({ default: m.RestaurantDetails })));
const SocialFoodNetwork = lazy(() => import('./components/SocialFoodNetwork').then(m => ({ default: m.SocialFoodNetwork })));
const GroupOrdering = lazy(() => import('./components/GroupOrdering').then(m => ({ default: m.GroupOrdering })));
const Chat = lazy(() => import('./components/Chat'));
const Reviews = lazy(() => import('./components/Reviews').then(m => ({ default: m.Reviews })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const PaymentMethods = lazy(() => import('./components/PaymentMethods').then(m => ({ default: m.PaymentMethods })));
const SupportTickets = lazy(() => import('./components/SupportTickets').then(m => ({ default: m.SupportTickets })));
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })));
const Invoices = lazy(() => import('./components/Invoices').then(m => ({ default: m.Invoices })));
const Refunds = lazy(() => import('./components/Refunds').then(m => ({ default: m.Refunds })));
const Promotions = lazy(() => import('./components/Promotions').then(m => ({ default: m.Promotions })));
const AllergiesManager = lazy(() => import('./components/AllergiesManager').then(m => ({ default: m.AllergiesManager })));
const ReferralProgram = lazy(() => import('./components/ReferralProgram').then(m => ({ default: m.ReferralProgram })));
const PartnerApply = lazy(() => import('./components/PartnerApply').then(m => ({ default: m.PartnerApply })));
const SubscriptionManagement = lazy(() => import('./components/SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement })));
const FavoritesCollections = lazy(() => import('./components/FavoritesCollections').then(m => ({ default: m.FavoritesCollections })));
const VoiceOrdering = lazy(() => import('./components/VoiceOrdering').then(m => ({ default: m.VoiceOrdering })));
const ARMenuPreview = lazy(() => import('./components/ARMenuPreview').then(m => ({ default: m.ARMenuPreview })));
const RecipeIntegration = lazy(() => import('./components/RecipeIntegration').then(m => ({ default: m.RecipeIntegration })));

// Component to register global toast function
function GlobalToastRegistrar({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast() as { showToast: (message: string, type: "error" | "success" | "info" | "warning") => void };

  useEffect(() => {
    registerGlobalToastFunction(showToast);
    return () => {
      unregisterGlobalToastFunction();
    };
  }, [showToast]);

  return <>{children}</>;
}

// Component to provide userId to Dashboard
function DashboardWithUserId() {
  const { user } = useAuth();
  return <Dashboard userId={user?.id || ''} />;
}

// Loading Fallback Component
function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton variant="rectangular" width="100%" height="200px" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
    </div>
  );
}

function App() {
  const enableSocial = (import.meta.env.VITE_ENABLE_SOCIAL_FEATURES ?? 'false') === 'true';
  const enableVoice = (import.meta.env.VITE_ENABLE_VOICE_ASSISTANT ?? 'false') === 'true';

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ReactQueryProvider>
          <ToastProvider>
            <GlobalToastRegistrar>
              <AuthProvider>
                <FavoritesProvider>
                  <BrowserRouter>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <PageTransition>
                        <Routes>
                          {/* Öffentliche Routen */}
                          <Route path="/" element={<RestaurantList />} />
                          <Route path="/restaurant/:id" element={<Menu />} />
                          <Route path="/restaurant/:id/details" element={<RestaurantDetails />} />
                          <Route path="/restaurant/:restaurantId/ar-menu" element={<ProtectedRoute element={<ARMenuPreview />} />} />
                          <Route path="/restaurant/:restaurantId/recipes" element={<ProtectedRoute element={<RecipeIntegration />} />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/legal/:slug" element={<LegalPage />} />
                          <Route path="/apply" element={<PartnerApply />} />
                          
                          {/* Geschützte Routen */}
                          <Route path="/dashboard" element={<ProtectedRoute element={<DashboardWithUserId />} />} />
                          <Route path="/orders" element={<ProtectedRoute element={<OrderHistory />} />} />
                          <Route path="/orders/:id" element={<ProtectedRoute element={<OrderTracking />} />} />
                          <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
                          <Route path="/addresses" element={<ProtectedRoute element={<Addresses />} />} />
                          <Route path="/favorites" element={<ProtectedRoute element={<Favorites />} />} />
                          <Route path="/favorites/collections" element={<ProtectedRoute element={<FavoritesCollections />} />} />
                          <Route path="/voice-order/:restaurantId" element={<ProtectedRoute element={<VoiceOrdering restaurantId="" onOrderPlaced={() => {}} />} />} />
                          <Route path="/meal-planner" element={<ProtectedRoute element={<MealPlanner />} />} />
                          <Route path="/loyalty" element={<ProtectedRoute element={<LoyaltyProgram />} />} />
                          <Route path="/scheduled-orders" element={<ProtectedRoute element={<ScheduledOrders />} />} />
                          <Route path="/gift-cards" element={<ProtectedRoute element={<GiftCards />} />} />
                          {enableSocial && (
                          <Route path="/social" element={<ProtectedRoute element={<SocialFoodNetwork />} />} />
                          )}
                          <Route path="/group-orders" element={<ProtectedRoute element={<GroupOrdering />} />} />
                          <Route path="/chat" element={<ProtectedRoute element={<Chat />} />} />
                          <Route path="/chat/:id" element={<ProtectedRoute element={<Chat />} />} />
                          <Route path="/reviews" element={<ProtectedRoute element={<Reviews />} />} />
                          <Route path="/reviews/:id" element={<ProtectedRoute element={<Reviews />} />} />
                          
                          {/* Settings & Support */}
                          <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
                          <Route path="/payment-methods" element={<ProtectedRoute element={<PaymentMethods />} />} />
                          <Route path="/support" element={<ProtectedRoute element={<SupportTickets />} />} />
                          <Route path="/faq" element={<ProtectedRoute element={<FAQ />} />} />
                          <Route path="/invoices" element={<ProtectedRoute element={<Invoices />} />} />
                          <Route path="/refunds" element={<ProtectedRoute element={<Refunds />} />} />
                          <Route path="/promotions" element={<ProtectedRoute element={<Promotions />} />} />
                          <Route path="/allergies" element={<ProtectedRoute element={<AllergiesManager />} />} />
                          <Route path="/referral" element={<ProtectedRoute element={<ReferralProgram />} />} />
                          <Route path="/subscription" element={<ProtectedRoute element={<SubscriptionManagement />} />} />
                          
                          {/* Fallback */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </PageTransition>
                    </Suspense>
                    <FloatingCart />
                    {enableVoice && <VoiceAssistant />}
                    <PWAInstallPrompt />
                  </Layout>
                </BrowserRouter>
              </FavoritesProvider>
            </AuthProvider>
            </GlobalToastRegistrar>
          </ToastProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

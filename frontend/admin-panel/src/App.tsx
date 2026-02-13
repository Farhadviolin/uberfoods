import { AdminApp } from './components/AdminApp';
import { AppProviders } from './components/AppProviders';

// Type definitions for better type safety
interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  isActive: boolean;
  dishes: Dish[];
  status?: string;
  cuisines?: string[];
  rating?: number;
}

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    dish: Dish;
    quantity: number;
    price: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: Order[];
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

function App() {
  return (
    <AppProviders>
      <AdminApp />
    </AppProviders>
  );
}

export default App;

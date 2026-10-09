export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  category: ProductCategory;
}

export interface ApiPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  stock: number;
  available: boolean;
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  total: number;
}

export type OrderStatus = 'CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_DECLINED' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'REFUNDED';

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  paymentStatus: PaymentStatus;
}

export interface Order extends Omit<OrderSummary, 'paymentStatus'> {
  items: OrderItem[];
  payment: { status: PaymentStatus; amount: number; failureReason: string | null } | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function emptyCart(): Cart {
  return { id: null, items: [], itemCount: 0, total: 0 };
}

export type Role = 'ADMIN' | 'MANAGER' | 'USER';
export type OrderStatus = 'PENDING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
export type Genre = 'ACTION' | 'RPG' | 'STRATEGY' | 'SPORTS' | 'HORROR' | 'ADVENTURE' | 'PUZZLE' | 'SIMULATION';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  price: number;
  genre: Genre;
  publisher: string;
  releaseYear: number;
  stock: number;
  isActive: boolean;
  _count?: {
    reviews: number;
    orders: number;
  };
  purchaseStats?: {
    completedOrdersCount: number;
    uniqueBuyersCount: number;
  };
}

export interface LivePurchaseEvent {
  gameId: string;
  gameTitle: string;
  quantity: number;
  timestamp: string;
}

export interface OrderGame {
  id: string;
  title: string;
  genre: Genre;
}

export interface OrderUser {
  id: string;
  fullName: string;
  email: string;
}

export interface Order {
  id: string;
  userId: string;
  gameId: string;
  groupId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount?: number;
  promotionName?: string | null;
  status: OrderStatus;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  game?: OrderGame;
  user?: OrderUser;
}

export interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  game?: OrderGame;
  user?: OrderUser;
}

export interface DashboardAdminResponse {
  role: 'ADMIN';
  stats: {
    totalUsers: number;
    totalGames: number;
    totalOrders: number;
    totalRevenue: number;
    usersByRole: Array<{ role: Role; count: number }>;
  };
  recentOrders: Order[];
  recentReviews: Review[];
  recentAuditLogs: AuditLog[];
}

export interface DashboardManagerResponse {
  role: 'MANAGER';
  stats: {
    activeGames: number;
    totalOrders: number;
    pendingOrders: number;
  };
  recentOrders: Order[];
  recentReviews: Review[];
}

export interface DashboardUserResponse {
  role: 'USER';
  profile: {
    id: string;
    fullName: string;
    email: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalReviews: number;
  };
  ownOrders: Order[];
  ownReviews: Review[];
}

export type DashboardResponse = DashboardAdminResponse | DashboardManagerResponse | DashboardUserResponse;

export interface AuditLog {
  id: string;
  action: string;
  success: boolean;
  ipAddress?: string | null;
  requestId?: string | null;
  createdAt: string;
  details?: Record<string, unknown> | null;
  actorUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  targetUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface AdminGame {
  id: string;
  title: string;
  genre: Genre;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  name: string;
  minDistinctGames: number;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSmtpConfig {
  host: string;
  port: number;
  user: string;
  from: string;
  hasPassword: boolean;
  source: 'database' | 'environment' | 'none';
}

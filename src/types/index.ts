export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  phone: string;
  address: string;
  service: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  region: string;
  amount: number;
}

export interface DailyRevenue {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  customerName: string;
  service: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
  region: string;
}

export interface WorkReview {
  id: string;
  title: string;
  description: string;
  service: string;
  workDate: string | null; // YYYY-MM-DD
  photoUrls: string[];
  videoUrl: string;
  createdAt: string;
}

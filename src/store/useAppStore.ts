import { create } from 'zustand';
import { Appointment, DailyRevenue } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppState {
  appointments: Appointment[];
  revenues: DailyRevenue[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  subscribe: () => () => void;
  addAppointment: (apt: Omit<Appointment, 'id'> & { id?: string }) => Promise<void>;
  updateAppointment: (id: string, apt: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

const mapApt = (r: {
  id: string;
  date: string;
  time: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  service: string | null;
  notes: string | null;
  status: string;
  region: string;
  amount: number | null;
}): Appointment => ({
  id: r.id,
  date: r.date,
  time: r.time,
  customerName: r.customer_name,
  phone: r.phone ?? '',
  address: r.address ?? '',
  service: r.service ?? '',
  notes: r.notes ?? '',
  status: r.status as Appointment['status'],
  region: r.region,
  amount: Number(r.amount ?? 0),
});

const mapRev = (r: {
  id: string;
  date: string;
  amount: number;
  customer_name: string;
  service: string | null;
  payment_method: string;
  notes: string | null;
  region: string;
}): DailyRevenue => ({
  id: r.id,
  date: r.date,
  amount: Number(r.amount),
  customerName: r.customer_name,
  service: r.service ?? '',
  paymentMethod: r.payment_method as DailyRevenue['paymentMethod'],
  notes: r.notes ?? '',
  region: r.region,
});

const aptToDb = (a: Partial<Appointment>) => {
  const o: Record<string, string | number> = {};
  if (a.date !== undefined) o.date = a.date;
  if (a.time !== undefined) o.time = a.time;
  if (a.customerName !== undefined) o.customer_name = a.customerName;
  if (a.phone !== undefined) o.phone = a.phone;
  if (a.address !== undefined) o.address = a.address;
  if (a.service !== undefined) o.service = a.service;
  if (a.notes !== undefined) o.notes = a.notes;
  if (a.status !== undefined) o.status = a.status;
  if (a.region !== undefined) o.region = a.region;
  if (a.amount !== undefined) o.amount = a.amount;
  return o;
};

export const useAppStore = create<AppState>()((set, get) => ({
  appointments: [],
  revenues: [],
  loaded: false,

  loadAll: async () => {
    const [{ data: apts, error: e1 }, { data: revs, error: e2 }] = await Promise.all([
      supabase.from('appointments').select('*').order('date', { ascending: false }).order('time'),
      supabase.from('revenues').select('*').order('date', { ascending: false }),
    ]);
    if (e1) {
      console.error('load appointments error', e1);
      toast.error('일정 불러오기 실패: ' + e1.message);
    }
    if (e2) {
      console.error('load revenues error', e2);
      toast.error('매출 불러오기 실패: ' + e2.message);
    }
    set({
      appointments: (apts ?? []).map(mapApt),
      revenues: (revs ?? []).map(mapRev),
      loaded: true,
    });
  },

  subscribe: () => {
    const channel = supabase
      .channel('app-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        get().loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenues' }, () => {
        get().loadAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  addAppointment: async (apt) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload = {
      date: apt.date,
      time: apt.time,
      customer_name: apt.customerName,
      phone: apt.phone,
      address: apt.address,
      service: apt.service,
      notes: apt.notes,
      status: apt.status,
      region: apt.region,
      amount: apt.amount,
      created_by: user?.id ?? null,
    };
    const { data, error } = await supabase.from('appointments').insert(payload).select().single();
    if (error) {
      toast.error('일정 추가 실패: ' + error.message);
      return;
    }
    set((s) => ({ appointments: [...s.appointments, mapApt(data)] }));
    toast.success('예약이 추가되었습니다');
    await get().loadAll();
  },

  updateAppointment: async (id, updates) => {
    const { data, error } = await supabase
      .from('appointments')
      .update(aptToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast.error('수정 실패: ' + error.message);
      return;
    }
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? mapApt(data) : a)),
    }));
    toast.success('예약이 수정되었습니다');
    await get().loadAll();
  },

  deleteAppointment: async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
      return;
    }
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
    toast.success('예약이 삭제되었습니다');
    await get().loadAll();
  },
}));

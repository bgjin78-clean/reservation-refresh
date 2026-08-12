import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Appointment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  MapPin,
  Phone,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Calendar as CalendarIcon,
  Banknote,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type StatusVal = 'scheduled' | 'completed' | 'cancelled';

const shortService = (service: string) => {
  if (service.includes('싱글')) return '싱글';
  if (service.includes('퀸')) return '퀸';
  if (service.includes('킹')) return '킹';
  if (service.includes('소파')) return '소파';
  if (service.includes('카펫')) return '카펫';
  return service.replace(/\s*클리닝$/, '').slice(0, 4);
};

const Home = () => {
  const { appointments, revenues, addAppointment, updateAppointment, deleteAppointment } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  const emptyForm = {
    time: '09:00',
    customerName: '',
    phone: '',
    address: '',
    service: '싱글 매트리스 클리닝',
    notes: '',
    region: '경남',
    status: 'scheduled' as StatusVal,
    amount: '',
  };
  const [form, setForm] = useState(emptyForm);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthAppointments = appointments.filter((a) =>
    isWithinInterval(parseISO(a.date), { start: monthStart, end: monthEnd })
  );
  const monthScheduledCount = monthAppointments.filter((a) => a.status === 'scheduled').length;
  const monthCompletedCount = monthAppointments.filter((a) => a.status === 'completed').length;
  const monthTotal = revenues
    .filter((r) => isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd }))
    .reduce((sum, r) => sum + r.amount, 0);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const aptsByDate = (date: Date) =>
    appointments
      .filter((a) => a.status !== 'cancelled' && isSameDay(parseISO(a.date), date))
      .sort((a, b) => a.time.localeCompare(b.time));

  const handleSubmit = () => {
    if (!form.customerName || !form.phone) return;
    const amountNum = form.amount ? parseInt(form.amount, 10) : 0;
    if (editingApt) {
      updateAppointment(editingApt.id, {
        time: form.time,
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        service: form.service,
        notes: form.notes,
        region: form.region,
        status: form.status,
        amount: amountNum,
      });
      setEditingApt(null);
    } else {
      addAppointment({
        date: dateStr,
        time: form.time,
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        service: form.service,
        notes: form.notes,
        region: form.region,
        status: form.status,
        amount: amountNum,
      });
    }
    setForm(emptyForm);
    setDialogOpen(false);
  };

  const openEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setForm({
      time: apt.time,
      customerName: apt.customerName,
      phone: apt.phone,
      address: apt.address,
      service: apt.service,
      notes: apt.notes,
      region: apt.region,
      status: apt.status,
      amount: apt.amount ? String(apt.amount) : '',
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingApt(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground text-xs px-2.5 py-0.5">완료</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs px-2.5 py-0.5">취소</Badge>;
      default:
        return <Badge className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5">예정</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">일정관리</h2>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })} 현황 · 로그인 후 팀 공용 저장
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={openAdd}>
              <Plus className="h-4 w-4" /> 예약추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingApt
                  ? '예약 수정'
                  : `${format(selectedDate, 'M월 d일', { locale: ko })} 예약 추가`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>시간</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div>
                <Label>고객명</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="고객 이름"
                />
              </div>
              <div>
                <Label>연락처</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <Label>주소</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="방문 주소"
                />
              </div>
              <div>
                <Label>서비스</Label>
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="싱글 매트리스 클리닝">싱글 매트리스</SelectItem>
                    <SelectItem value="퀸 매트리스 클리닝">퀸 매트리스</SelectItem>
                    <SelectItem value="킹 매트리스 클리닝">킹 매트리스</SelectItem>
                    <SelectItem value="소파 클리닝">소파 클리닝</SelectItem>
                    <SelectItem value="카펫 클리닝">카펫 클리닝</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <Label className="text-sm font-semibold">예약 상태</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={form.status === 'scheduled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, status: 'scheduled' })}
                  >
                    예약
                  </Button>
                  <Button
                    type="button"
                    variant={form.status === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    className={form.status === 'completed' ? 'bg-success hover:bg-success/90' : ''}
                    onClick={() => setForm({ ...form, status: 'completed' })}
                  >
                    완료
                  </Button>
                  <Button
                    type="button"
                    variant={form.status === 'cancelled' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, status: 'cancelled' })}
                  >
                    취소
                  </Button>
                </div>
                <div>
                  <Label>금액 (원)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="80000"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    완료 시 입력한 금액이 매출에 자동 반영됩니다.
                  </p>
                </div>
              </div>

              <div>
                <Label>메모</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="특이사항"
                />
              </div>
              <Button className="w-full" onClick={handleSubmit}>
                {editingApt ? '수정 완료' : '예약 추가'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center p-4">
            <CalendarIcon className="mb-2 h-6 w-6 text-primary" />
            <span className="text-2xl font-bold text-foreground">{monthAppointments.length}</span>
            <span className="text-xs text-muted-foreground">이번 달 일정</span>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center p-4">
            <Clock className="mb-2 h-6 w-6 text-warning" />
            <span className="text-2xl font-bold text-foreground">{monthScheduledCount}</span>
            <span className="text-xs text-muted-foreground">이번 달 예정</span>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center p-4">
            <CheckCircle2 className="mb-2 h-6 w-6 text-success" />
            <span className="text-2xl font-bold text-foreground">{monthCompletedCount}</span>
            <span className="text-xs text-muted-foreground">이번 달 완료</span>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center p-4">
            <Banknote className="mb-2 h-6 w-6 text-primary" />
            <span className="text-2xl font-bold text-foreground">{monthTotal.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">이번 달 매출(원)</span>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="glass-card">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ko}
            className={cn('p-0 pointer-events-auto w-full')}
            classNames={{
              months: 'flex flex-col w-full',
              month: 'space-y-2 w-full',
              table: 'w-full border-collapse',
              head_row: 'flex w-full',
              head_cell: 'text-muted-foreground font-normal text-[0.7rem] sm:text-[0.8rem] flex-1 text-center',
              row: 'flex w-full mt-1 gap-0.5',
              cell: 'flex-1 min-h-[4.5rem] sm:min-h-[5.5rem] text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
              day: 'h-full w-full min-h-[4.5rem] sm:min-h-[5.5rem] p-0.5 font-normal hover:bg-accent rounded-md aria-selected:opacity-100 flex items-stretch',
              day_selected:
                'bg-primary/15 text-foreground hover:bg-primary/20 hover:text-foreground focus:bg-primary/15 focus:text-foreground',
            }}
            components={{
              DayContent: ({ date }) => {
                const dayApts = aptsByDate(date);
                const visible = dayApts.slice(0, 2);
                const extra = dayApts.length - visible.length;
                return (
                  <div className="flex h-full w-full flex-col items-stretch gap-0.5 overflow-hidden px-0.5 py-0.5">
                    <span className="text-[0.7rem] sm:text-xs font-medium leading-none text-center">
                      {date.getDate()}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5 min-h-0">
                      {visible.map((apt) => (
                        <div
                          key={apt.id}
                          className={cn(
                            'rounded px-0.5 py-px text-left leading-tight truncate',
                            'bg-secondary text-secondary-foreground',
                            apt.status === 'completed' && 'bg-success/15 text-success'
                          )}
                          title={`${apt.time} ${apt.service}`}
                        >
                          <span className="block text-[0.55rem] sm:text-[0.65rem] font-medium truncate">
                            {apt.time} {shortService(apt.service)}
                          </span>
                        </div>
                      ))}
                      {extra > 0 && (
                        <span className="text-[0.5rem] sm:text-[0.6rem] text-muted-foreground text-center">
                          +{extra}
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Day appointments */}
      <div>
        <h3 className="mb-3 font-semibold text-foreground">
          {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })} — {dayAppointments.length}건
        </h3>
        <div className="space-y-3">
          {dayAppointments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground">예약이 없습니다</CardContent>
            </Card>
          ) : (
            dayAppointments.map((apt) => (
              <Card key={apt.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-primary">{apt.time}</span>
                        <span className="font-semibold text-foreground">{apt.customerName}</span>
                        {statusBadge(apt.status)}
                        {apt.amount > 0 && (
                          <span className="text-sm font-semibold text-foreground">
                            ₩{apt.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{apt.service}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {apt.phone}
                      </div>
                      {apt.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {apt.address}
                        </div>
                      )}
                      {apt.notes && <p className="text-xs text-muted-foreground">{apt.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {apt.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => updateAppointment(apt.id, { status: 'completed' })}
                        >
                          완료
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(apt)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteAppointment(apt.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;

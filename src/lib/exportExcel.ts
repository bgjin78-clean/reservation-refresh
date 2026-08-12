import * as XLSX from 'xlsx';
import { Appointment, DailyRevenue } from '@/types';
import { format } from 'date-fns';

const paymentLabel = (m: string) => (m === 'cash' ? '현금' : m === 'card' ? '카드' : m === 'transfer' ? '계좌이체' : m);
const statusLabel = (s: string) => (s === 'completed' ? '완료' : s === 'cancelled' ? '취소' : '예정');

export function downloadAllExcel(appointments: Appointment[], revenues: DailyRevenue[]) {
  const sortedApts = [...appointments].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  );
  const sortedRevs = [...revenues].sort((a, b) => a.date.localeCompare(b.date));

  const aoa: (string | number)[][] = [];

  // === 일정 섹션 ===
  aoa.push(['■ 일정 목록']);
  aoa.push(['날짜', '시간', '지역', '고객명', '연락처', '주소', '서비스', '상태', '메모']);
  sortedApts.forEach((a) => {
    aoa.push([a.date, a.time, a.region, a.customerName, a.phone, a.address, a.service, statusLabel(a.status), a.notes]);
  });

  // 빈 줄 2개
  aoa.push([]);
  aoa.push([]);

  // === 매출 섹션 ===
  aoa.push(['■ 매출 목록']);
  aoa.push(['날짜', '지역', '고객명', '서비스', '결제수단', '금액(원)', '메모']);
  let total = 0;
  sortedRevs.forEach((r) => {
    aoa.push([r.date, r.region, r.customerName, r.service, paymentLabel(r.paymentMethod), r.amount, r.notes]);
    total += r.amount;
  });
  aoa.push(['', '', '', '', '합계', total, '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    { wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '리프레시홈');

  const fileName = `리프레시홈_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

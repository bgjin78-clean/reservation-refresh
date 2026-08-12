# 리프레시홈(Refresh Home) 관리자 앱 — Cursor 인수인계 가이드

이 문서 하나만 읽으면 Cursor에서 바로 이어서 개발할 수 있도록 작성했습니다.
아래 "AI 프롬프트" 섹션은 Cursor의 Chat/Composer에 그대로 붙여넣으면 됩니다.

---

## 1. 프로젝트 개요

- **서비스명**: 리프레시홈 (매트리스 청소 전문)
- **용도**: 사장/직원이 함께 쓰는 **일정관리 + 매출 집계** 관리자 웹앱 (모바일 우선 반응형)
- **운영 도메인**: https://admin.refreshhome.co.kr
- **핵심 규칙**
  - 데이터는 **지역(region) 기준**으로 분류. 현재 지역은 **'경남' 하나만** 사용 (경기도는 완전 삭제됨).
  - 로그인한 모든 회원이 **같은 데이터를 공유**해서 보고 편집 (팀 공용 데이터).
  - `jjubu10@gmail.com` 은 가입 시 자동으로 **admin** 역할 부여.
  - 일정 상태가 **완료(completed)** 가 되고 금액이 0보다 크면 **자동으로 매출에 반영** (DB 트리거).

## 2. 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | React 18 + TypeScript 5 + Vite 5 |
| 스타일 | Tailwind CSS v3 + shadcn/ui (Radix) — 민트/틸(teal) 테마 |
| 상태관리 | Zustand (`src/store/useAppStore.ts`) |
| 서버/DB/인증 | Supabase (PostgreSQL + Auth + Realtime) |
| 라우팅 | react-router-dom |
| 데이터 fetch | @tanstack/react-query (설치됨), 실제 조회는 Zustand 스토어에서 직접 supabase-js 호출 |
| 엑셀 | xlsx (SheetJS) |
| 테스트 | vitest, playwright |

## 3. 폴더 구조

```text
src/
  App.tsx                  라우팅 + ProtectedRoute (미로그인 시 /login)
  main.tsx
  index.css                디자인 토큰(HSL 변수) — 색상은 반드시 여기 토큰 사용
  tailwind.config.ts
  contexts/AuthContext.tsx Supabase 세션 관리, signOut, Google 로그인
  components/
    Layout.tsx             상단 헤더(로고/엑셀 다운로드/아바타/로그아웃) + 하단 탭 네비
    ui/                    shadcn 컴포넌트 (수정 자제)
  pages/
    Dashboard.tsx          이번 달 매출 합계, 이번 달 일정/예정/완료 합계, 오늘·내일 일정
    Schedule.tsx           달력 + 날짜별 일정 목록 + 예약추가/수정 다이얼로그
    Login.tsx              Google 로그인
    NotFound.tsx
  store/useAppStore.ts     appointments/revenues CRUD + realtime 구독
  lib/exportExcel.ts       일정+매출을 시트 1장으로 xlsx 다운로드
  types/index.ts           Appointment, DailyRevenue 타입
  integrations/supabase/   client.ts, types.ts (자동 생성 — 수동 편집 금지)
supabase/migrations/       DB 스키마 SQL (순서대로 실행)
```

## 4. 데이터 모델

### appointments (일정)
`id, date(DATE), time(TEXT 'HH:mm'), customer_name, phone, address, service, notes, status('scheduled'|'completed'|'cancelled'), region(기본 '경남'), amount(NUMERIC), created_by, created_at, updated_at`

### revenues (매출)
`id, date, amount, customer_name, service, payment_method('cash'|'card'|'transfer'), notes, region, appointment_id(일정 연동용), created_by, created_at, updated_at`

### user_roles (권한)
`id, user_id, role(app_role enum: 'admin'|'user')` — 권한은 **절대 profiles/users 테이블에 저장하지 않음**.
`public.has_role(uuid, app_role)` SECURITY DEFINER 함수로 RLS에서 검사.

### 트리거
- `handle_new_user` : 가입 시 역할 자동 부여(jjubu10@gmail.com → admin)
- `update_updated_at_column` : updated_at 자동 갱신
- `sync_appointment_revenue` : 일정이 completed + amount>0 → revenues 행 생성/갱신, 상태 해제·취소·삭제 시 연동 매출 삭제
- appointments/revenues 는 **Realtime publication 등록**되어 실시간 동기화

### RLS 정책
로그인 사용자(authenticated)면 조회/생성/수정/삭제 모두 허용 (팀 공용 데이터라는 설계 의도). 각 테이블 생성 시 `GRANT` 필요.

## 5. Cursor에서 실행하기

```bash
# 1) 압축 해제 후 폴더로 이동
cd refreshhome

# 2) 의존성 설치
npm install          # 또는 bun install

# 3) 환경변수 설정
cp .env.example .env
# .env 에 Supabase 값 입력:
# VITE_SUPABASE_PROJECT_ID=...
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>

# 4) 개발 서버
npm run dev          # http://localhost:8080

# 5) 빌드 / 테스트
npm run build
npm run test
```

> `.env` 값은 보안상 ZIP에 포함하지 않았습니다. Lovable 프로젝트 백엔드 설정 또는 Supabase 프로젝트의 URL / anon key 를 넣으세요. anon key 는 공개 키라 프런트엔드에 넣어도 됩니다.

### DB를 새 Supabase 프로젝트에 세팅할 때
`supabase/migrations/` 안의 SQL 파일을 **파일명 순서대로** SQL 에디터에서 실행하세요.
그 후 Auth > Providers 에서 **Google 로그인**을 활성화하고, Site URL / Redirect URL 에 `http://localhost:8080` 및 운영 도메인을 등록합니다.

## 6. 주의사항 (코드 컨벤션)

- 색상은 `src/index.css`의 **시맨틱 토큰**만 사용. `text-white`, `bg-[#hex]` 같은 하드코딩 금지.
- `src/integrations/supabase/client.ts`, `types.ts` 는 자동 생성 파일 — 직접 수정 금지(스키마 변경 시 재생성).
- 지역은 UI에서 '경남'으로 고정. 지역 추가 시 `Schedule.tsx` / `Dashboard.tsx`의 select·탭을 함께 수정.
- 매출은 직접 입력 UI가 없고 **일정의 '완료' 상태 + 금액**으로만 생성됨(트리거). 매출 UI를 되살리려면 `Revenue.tsx` 페이지와 라우트를 다시 연결.

---

## 7. Cursor에 붙여넣을 AI 프롬프트 (컨텍스트 프라이밍용)

```
너는 이 저장소를 이어받아 개발하는 시니어 프런트엔드 개발자야.

[프로젝트]
- 이름: 리프레시홈(Refresh Home) — 매트리스 청소 업체용 관리자 웹앱
- 스택: React 18 + TypeScript + Vite 5 + Tailwind v3 + shadcn/ui + Zustand + Supabase(Postgres/Auth/Realtime)
- 언어: UI 텍스트는 전부 한국어, 모바일 우선 반응형, 민트/틸 테마

[도메인 규칙]
1. 로그인한 모든 회원이 동일한 일정/매출 데이터를 공유하고 편집한다(RLS: authenticated 전체 허용).
2. jjubu10@gmail.com 은 가입 시 자동 admin. 권한은 user_roles 테이블 + has_role() 함수로만 관리한다.
3. 지역(region)은 '경남'만 사용한다. 기술자 기준이 아닌 지역 기준으로 데이터를 분류한다.
4. 일정 상태는 예정(scheduled) / 완료(completed) / 취소(cancelled).
   일정이 완료이고 amount > 0 이면 DB 트리거 sync_appointment_revenue 가 revenues 행을 자동 생성/삭제한다.
   따라서 프런트엔드에서 매출을 직접 insert 하지 말 것.
5. 대시보드는 이번 달 매출 합계, 이번 달 일정/예정/완료 건수, 오늘의 일정, 내일의 일정을 보여준다.
6. 헤더의 엑셀 버튼은 일정+매출을 시트 1장(xlsx)에 담아 다운로드한다(src/lib/exportExcel.ts).

[코드 규칙]
- 색상/그림자/그라디언트는 src/index.css 의 시맨틱 토큰만 사용. 하드코딩 색상 클래스 금지.
- src/integrations/supabase/client.ts 와 types.ts 는 자동 생성 파일이므로 수정 금지.
- 데이터 접근은 src/store/useAppStore.ts(Zustand)를 통해서만 하고, 실패 시 sonner toast로 한국어 에러를 띄운다.
- 컴포넌트는 작게 쪼개고 기존 shadcn/ui 컴포넌트를 재사용한다.
- DB 스키마를 바꾸면 supabase/migrations 에 새 SQL 파일을 추가하고, 새 public 테이블에는 반드시 GRANT + RLS + 정책을 함께 작성한다.

먼저 src/App.tsx, src/store/useAppStore.ts, src/pages/Schedule.tsx, src/pages/Dashboard.tsx 를 읽고 구조를 파악한 뒤 작업을 시작해줘.
```

## 8. 앞으로 해볼 만한 작업 아이디어

- 고객 목록/재방문 주기 관리 페이지
- 월별 매출 차트(recharts 설치되어 있음)
- 일정 알림(카카오/문자) 연동
- admin 전용 기능 분리(직원 계정 관리)

# Supabase 연동 설정 가이드

로그인(Google) + 팀 공용 DB로 동작합니다. **무료 플랜**으로 충분합니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입/로그인
2. **New project** 생성 (Region: Northeast Asia 권장)
3. **Project Settings → API** 에서 아래 값을 복사

```
VITE_SUPABASE_PROJECT_ID=프로젝트_REF
VITE_SUPABASE_URL=https://프로젝트_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=anon_public_key
```

프로젝트 루트의 `.env` 파일에 붙여넣습니다. (없으면 `.env.example` 복사)

## 2. DB 마이그레이션 실행

Supabase 대시보드 → **SQL Editor** 에서  
`supabase/migrations/` 안의 SQL 파일을 **파일명 순서대로** 실행합니다.

1. `20260423051110_....sql`
2. `20260423051216_....sql`
3. `20260427084451_....sql`

## 3. Google 로그인 설정

### A. Google Cloud Console
1. https://console.cloud.google.com → API 및 서비스 → 사용자 인증 정보
2. **OAuth 클라이언트 ID** (웹 애플리케이션) 생성
3. 승인된 리디렉션 URI에 추가:
   - `https://<프로젝트_REF>.supabase.co/auth/v1/callback`
4. 클라이언트 ID / 시크릿 복사

### B. Supabase
1. **Authentication → Providers → Google** 활성화
2. Client ID / Secret 입력 후 저장
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:8080` (배포 후 운영 도메인으로 변경)
   - Redirect URLs에 추가:
     - `http://localhost:8080`
     - `http://localhost:8080/**`
     - (배포 시) `https://your-domain.com` 및 `https://your-domain.com/**`

## 4. 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:8080` → Google 로그인 → 일정 추가

## 권한 참고

- 로그인한 회원(`authenticated`)은 일정/매출을 함께 조회·수정합니다 (팀 공용).
- `jjubu10@gmail.com` 은 가입 시 자동 **admin** 역할이 부여됩니다.
- 로그인하지 않은 사용자는 데이터에 접근할 수 없습니다.

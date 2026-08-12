import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpg';

const isInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || '';
  return /KAKAOTALK|NAVER|LINE|Instagram|FBAN|FBAV|Twitter|Snapchat|everytimeApp/i.test(ua);
};

const Login = () => {
  const { user, loading } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const inAppBrowser = useMemo(() => isInAppBrowser(), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const redirectTo = `${window.location.origin}${base}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        console.error('Login error:', error);
        toast.error('로그인 실패: ' + error.message);
      }
    } catch (err) {
      console.error('Login failed:', err);
      toast.error('로그인에 실패했습니다');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOpenExternalBrowser = () => {
    const url = window.location.href;
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm glass-card">
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <img src={logo} alt="리프레시홈 로고" className="h-20 w-20 rounded-2xl object-cover" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">리프레시홈</h1>
            <p className="mt-1 text-sm text-muted-foreground">매트리스 청소 전문 일정관리</p>
          </div>

          {inAppBrowser ? (
            <div className="flex w-full flex-col gap-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
                앱 브라우저에서는 Google 로그인이 제한됩니다.
                <br />
                외부 브라우저(Chrome, Safari)에서 열어주세요.
              </div>
              <Button className="w-full gap-2" size="lg" onClick={handleOpenExternalBrowser}>
                <ExternalLink className="h-5 w-5" />
                외부 브라우저로 열기
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                또는 주소를 복사하여 Chrome/Safari에서 직접 열어주세요.
              </p>
            </div>
          ) : (
            <Button className="w-full gap-2" size="lg" onClick={handleGoogleLogin} disabled={loginLoading}>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {loginLoading ? '로그인 중...' : 'Google로 로그인'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

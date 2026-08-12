import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Download, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { downloadAllExcel } from '@/lib/exportExcel';
import logo from '@/assets/logo.jpg';

const Layout = () => {
  const { user, signOut } = useAuth();
  const loadAll = useAppStore((s) => s.loadAll);
  const subscribe = useAppStore((s) => s.subscribe);
  const appointments = useAppStore((s) => s.appointments);
  const revenues = useAppStore((s) => s.revenues);

  useEffect(() => {
    if (!user) return;
    loadAll();
    const unsub = subscribe();
    return unsub;
  }, [user, loadAll, subscribe]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="리프레시홈 로고" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">리프레시홈</h1>
              <p className="text-xs text-muted-foreground">매트리스 청소 전문</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => downloadAllExcel(appointments, revenues)}
              title="엑셀 다운로드"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">엑셀</span>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {user?.email?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} title="로그아웃">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 pb-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

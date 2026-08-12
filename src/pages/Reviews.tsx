import { useState, useRef } from 'react';
import { useReviewsStore } from '@/store/useReviewsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, ImagePlus, Film } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

const youtubeId = (url: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || u.pathname.split('/embed/')[1] || null;
    }
  } catch {
    return null;
  }
  return null;
};

const Reviews = () => {
  const { reviews, loaded, addReview, deleteReview } = useReviewsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    service: '싱글 매트리스 클리닝',
    workDate: format(new Date(), 'yyyy-MM-dd'),
    videoUrl: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      service: '싱글 매트리스 클리닝',
      workDate: format(new Date(), 'yyyy-MM-dd'),
      videoUrl: '',
    });
    setPhotos([]);
    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, 6);
    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return next.map((f) => URL.createObjectURL(f));
    });
    setPhotos(next);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await addReview({
      title: form.title.trim(),
      description: form.description.trim(),
      service: form.service,
      workDate: form.workDate || null,
      photoFiles: photos,
      videoUrl: form.videoUrl.trim(),
    });
    setSaving(false);
    if (ok) {
      resetForm();
      setDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">작업후기</h2>
          <p className="text-sm text-muted-foreground">완료된 작업 사진·영상을 남겨두세요</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> 후기 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>작업후기 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>제목</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 김해 싱글 매트리스 클리닝"
                />
              </div>
              <div>
                <Label>작업일</Label>
                <Input
                  type="date"
                  value={form.workDate}
                  onChange={(e) => setForm({ ...form, workDate: e.target.value })}
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
              <div>
                <Label>설명</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="작업 내용, 특이사항 등"
                />
              </div>
              <div>
                <Label>사진 (최대 6장, 장당 5MB)</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => onPickPhotos(e.target.files)}
                />
                {previews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {previews.map((src) => (
                      <img key={src} src={src} alt="" className="h-24 w-full rounded-md object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>유튜브 영상 링크 (선택)</Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  영상은 YouTube에 올린 뒤 링크만 붙여넣으면 됩니다.
                </p>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                {saving ? '등록 중...' : '등록하기'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!loaded ? (
        <p className="py-12 text-center text-muted-foreground">불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <p>등록된 작업후기가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const yt = youtubeId(review.videoUrl);
            return (
              <Card key={review.id} className="glass-card overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{review.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {review.service}
                        {review.workDate
                          ? ` · ${format(parseISO(review.workDate), 'yyyy.M.d', { locale: ko })}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive shrink-0"
                      onClick={() => {
                        if (confirm('이 후기를 삭제할까요?')) deleteReview(review.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {review.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.description}</p>
                  )}

                  {review.photoUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {review.photoUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={review.title}
                            className="h-36 w-full rounded-md object-cover border border-border"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {yt && (
                    <div className="aspect-video overflow-hidden rounded-md border border-border bg-muted">
                      <iframe
                        title={review.title}
                        src={`https://www.youtube.com/embed/${yt}`}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {!yt && review.videoUrl && (
                    <a
                      href={review.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary"
                    >
                      <Film className="h-4 w-4" /> 영상 보기
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reviews;

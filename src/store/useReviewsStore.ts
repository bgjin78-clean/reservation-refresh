import { create } from 'zustand';
import { WorkReview } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewsState {
  reviews: WorkReview[];
  loaded: boolean;
  loadReviews: () => Promise<void>;
  subscribeReviews: () => () => void;
  addReview: (input: {
    title: string;
    description: string;
    service: string;
    workDate: string | null;
    photoFiles: File[];
    videoUrl: string;
  }) => Promise<boolean>;
  deleteReview: (id: string) => Promise<void>;
}

const mapReview = (r: {
  id: string;
  title: string;
  description: string;
  service: string;
  work_date: string | null;
  photo_urls: string[];
  video_url: string;
  created_at: string;
}): WorkReview => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  service: r.service ?? '',
  workDate: r.work_date,
  photoUrls: r.photo_urls ?? [],
  videoUrl: r.video_url ?? '',
  createdAt: r.created_at,
});

async function uploadPhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} 파일이 5MB를 초과합니다`);
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('review-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('review-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export const useReviewsStore = create<ReviewsState>()((set, get) => ({
  reviews: [],
  loaded: false,

  loadReviews: async () => {
    const { data, error } = await supabase
      .from('work_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('후기 불러오기 실패: ' + error.message);
      set({ loaded: true });
      return;
    }
    set({
      reviews: (data ?? []).map(mapReview),
      loaded: true,
    });
  },

  subscribeReviews: () => {
    const channel = supabase
      .channel('work-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_reviews' }, () => {
        get().loadReviews();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  addReview: async (input) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const photoUrls = input.photoFiles.length > 0 ? await uploadPhotos(input.photoFiles) : [];

      const { data, error } = await supabase
        .from('work_reviews')
        .insert({
          title: input.title,
          description: input.description,
          service: input.service,
          work_date: input.workDate,
          photo_urls: photoUrls,
          video_url: input.videoUrl,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error('후기 등록 실패: ' + error.message);
        return false;
      }
      set((s) => ({ reviews: [mapReview(data), ...s.reviews] }));
      toast.success('작업후기가 등록되었습니다');
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('후기 등록 실패: ' + msg);
      return false;
    }
  },

  deleteReview: async (id) => {
    const { error } = await supabase.from('work_reviews').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
      return;
    }
    set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }));
    toast.success('후기가 삭제되었습니다');
  },
}));

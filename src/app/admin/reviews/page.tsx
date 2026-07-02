'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, AlertTriangle, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Button, Badge, Avatar, Card, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { Review } from '@/types';

interface ReviewWithInfo extends Review {
  profiles: { full_name: string; avatar_url: string | null };
  stores: { name: string };
}

export default function AdminReviews() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [reviews, setReviews] = useState<ReviewWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('reviews')
        .select('*, profiles(full_name, avatar_url), stores(name)')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setReviews((data || []) as unknown as ReviewWithInfo[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleDelete(review: ReviewWithInfo) {
    const shouldDelete = await confirm({
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('reviews').delete().eq('id', review.id);
      if (err) throw err;
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      toast('success', 'Review deleted');
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
      />
    ));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reviews</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Monitor and manage user reviews</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No reviews yet"
          description="Reviews from customers will appear here"
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <div className="flex items-start gap-4">
                  <Avatar name={review.profiles?.full_name || 'User'} src={review.profiles?.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {review.profiles?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            on {review.stores?.name || 'Unknown Store'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-xs text-[var(--color-text-secondary)] ml-2">{formatDate(review.created_at)}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(review)}>
                        <Trash2 className="w-4 h-4 text-[var(--color-error)]" />
                      </Button>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{review.comment}</p>
                    )}
                    {review.reply && (
                      <div className="mt-2 pl-4 border-l-2 border-[var(--color-primary)]">
                        <p className="text-xs font-medium text-[var(--color-primary)]">Store Reply:</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{review.reply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

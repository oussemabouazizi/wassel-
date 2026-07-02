'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Store, ThumbsUp, Reply, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Textarea, Select, Badge, Avatar, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import type { Store as StoreType, Review, Profile } from '@/types';

type ReviewWithUser = Review & { profiles: Profile };

export default function ReviewManagement() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').eq('owner_id', user!.id);
      const list = data || [];
      setStores(list);
      if (list.length > 0) {
        setSelectedStoreId(list[0].id);
      }
    } catch {
      toast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId) loadReviews();
  }, [selectedStoreId]);

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(*)')
      .eq('store_id', selectedStoreId)
      .order('created_at', { ascending: false });
    setReviews(data || []);
  }

  async function handleReply(reviewId: string) {
    if (!replyText[reviewId]?.trim()) {
      toast('error', 'Reply cannot be empty');
      return;
    }
    setSavingReply(reviewId);
    const { error } = await supabase
      .from('reviews')
      .update({ reply: replyText[reviewId].trim() })
      .eq('id', reviewId);
    if (error) {
      toast('error', 'Failed to submit reply');
    } else {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyText[reviewId].trim() } : r));
      setReplyingTo(null);
      setReplyText(p => ({ ...p, [reviewId]: '' }));
      toast('success', 'Reply posted');
    }
    setSavingReply(null);
  }

  function getStoreRating(): { average: number; total: number } {
    if (reviews.length === 0) return { average: 0, total: 0 };
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return { average: sum / reviews.length, total: reviews.length };
  }

  if (loading) return <ReviewsSkeleton />;

  const rating = getStoreRating();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reviews</h1>
          <p className="text-[var(--color-text-secondary)]">Manage customer feedback</p>
        </div>
        {stores.length > 1 && (
          <Select
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
            options={stores.map(s => ({ value: s.id, label: s.name }))}
            className="w-48"
          />
        )}
      </div>

      {!selectedStoreId ? (
        <Card>
          <EmptyState
            icon={<Star className="w-8 h-8" />}
            title="No store selected"
            description="Create a store first to manage reviews"
          />
        </Card>
      ) : (
        <>
          {reviews.length > 0 && (
            <Card>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[var(--color-text-primary)]">{rating.average.toFixed(1)}</p>
                  <div className="flex items-center gap-0.5 mt-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(rating.average) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{rating.total} reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = rating.total > 0 ? (count / rating.total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-[var(--color-text-secondary)]">{star}</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--color-surface)] overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-xs text-[var(--color-text-secondary)]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {reviews.length === 0 ? (
            <Card>
              <EmptyState
                icon={<MessageSquare className="w-8 h-8" />}
                title="No reviews yet"
                description="Reviews from customers will appear here"
              />
            </Card>
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
                      <Avatar
                        name={review.profiles?.full_name || 'Customer'}
                        src={review.profiles?.avatar_url}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">
                              {review.profiles?.full_name || 'Anonymous'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, si) => (
                                  <Star
                                    key={si}
                                    className={`w-3.5 h-3.5 ${si < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                {formatRelativeTime(review.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-[var(--color-text-secondary)] mt-3">{review.comment}</p>
                        )}

                        {review.reply && (
                          <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] mb-1">
                              <Reply className="w-3 h-3" />
                              Your Reply
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)]">{review.reply}</p>
                          </div>
                        )}

                        {!review.reply && (
                          <div className="mt-3">
                            {replyingTo === review.id ? (
                              <div className="space-y-3">
                                <Textarea
                                  placeholder="Write your reply..."
                                  value={replyText[review.id] || ''}
                                  onChange={e => setReplyText(p => ({ ...p, [review.id]: e.target.value }))}
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleReply(review.id)} isLoading={savingReply === review.id}>
                                    <ThumbsUp className="w-4 h-4" />
                                    Post Reply
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(p => ({ ...p, [review.id]: '' })); }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(review.id)}>
                                <Reply className="w-4 h-4" />
                                Reply
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <Card>
        <div className="flex items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-xl" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </Card>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <div className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

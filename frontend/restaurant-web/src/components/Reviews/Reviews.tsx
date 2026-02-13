import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import { useRetry } from "../../hooks/useRetry";
import { formatDateTime } from "../../utils/formatters";
import { useToast } from "../../contexts/ToastContext";
import { OptimizedImage } from "../common/OptimizedImage";
import { VirtualizedList } from "../common/VirtualizedList";
import { Skeleton, SkeletonCard, SkeletonStats } from "../common/Skeleton";
import "./Reviews.css";

interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customer: {
    name: string;
  };
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  reply?: string;
  repliedAt?: string;
}

export function Reviews() {
  const { restaurantId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">(
    "all",
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { showToast } = useToast();

  // Retry-Logik für Reply
  const retryReply = useRetry(
    async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      return await api.post(`/reviews/${reviewId}/reply`, { reply });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reviews/restaurant/${restaurantId}`);
      setReviews(response.data || []);
    } catch (error: unknown) {
      console.error("Error loading reviews:", error);
      let errorMessage = "Fehler beim Laden der Bewertungen";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    if (restaurantId) {
      loadReviews();
    }
  }, [restaurantId, loadReviews]);

  const filteredReviews =
    filter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(filter));

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingDistribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      await retryReply.execute({ reviewId, reply: replyText.trim() });
      showToast("Antwort erfolgreich gesendet!", "success");
      setReplyingTo(null);
      setReplyText("");
      loadReviews();
    } catch (error: unknown) {
      console.error("Error replying to review:", error);
      let errorMessage = "Fehler beim Senden der Antwort";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    }
  };

  if (loading) {
    return (
      <div className="reviews">
        <div style={{ marginBottom: "24px" }}>
          <Skeleton
            variant="text"
            width="250px"
            height={32}
          />
        </div>
        <SkeletonStats />
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="rectangular"
              width="200px"
              height={40}
            />
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {Array.from({ length: 5 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews">
      <h1
        style={{
          fontSize: "var(--fb-font-size-2xl)",
          fontWeight: 700,
          marginBottom: "24px",
        }}
      >
        Bewertungen ({reviews.length})
      </h1>

      <div className="reviews-stats">
        <div className="stat-card">
          <div
            style={{
              fontSize: "var(--fb-font-size-3xl)",
              fontWeight: 700,
              color: "var(--fb-primary)",
            }}
          >
            {averageRating.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: "var(--fb-font-size-sm)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Durchschnittliche Bewertung
          </div>
        </div>
        {Object.entries(ratingDistribution).map(([rating, count]) => (
          <div key={rating} className="stat-card">
            <div
              style={{ fontSize: "var(--fb-font-size-xl)", fontWeight: 700 }}
            >
              {count}
            </div>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
              }}
            >
              {rating} ⭐ Bewertungen
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="fb-input"
          style={{ width: "auto" }}
        >
          <option value="all">Alle Bewertungen</option>
          <option value="5">5 ⭐</option>
          <option value="4">4 ⭐</option>
          <option value="3">3 ⭐</option>
          <option value="2">2 ⭐</option>
          <option value="1">1 ⭐</option>
        </select>
      </div>

      <div className="reviews-list">
        {filteredReviews.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--fb-space-8)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Keine Bewertungen gefunden
          </div>
        ) : filteredReviews.length > 20 ? (
          <div style={{ height: "600px" }}>
            <VirtualizedList
              items={filteredReviews}
              itemHeight={200}
              estimateSize={(index) => {
                const review = filteredReviews[index];
                let height = 120; // Base height
                if (review.comment) height += 40;
                if (review.images && review.images.length > 0) height += 100;
                if (review.reply) height += 60;
                return height;
              }}
              emptyMessage="Keine Bewertungen gefunden"
              renderItem={(review) => (
                <div className="review-card" style={{ marginBottom: "12px" }}>
                  <div className="review-header">
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {review.customer.name}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {formatDateTime(review.createdAt)}
                      </div>
                    </div>
                    <div style={{ fontSize: "var(--fb-font-size-xl)" }}>
                      {"⭐".repeat(review.rating)}
                    </div>
                  </div>

                  {review.comment && (
                    <div className="review-comment">{review.comment}</div>
                  )}

                  {review.images && review.images.length > 0 && (
                    <div className="review-images">
                      {review.images.map((img, idx) => (
                        <OptimizedImage
                          key={idx}
                          src={img}
                          alt={`Review ${idx + 1}`}
                          className="review-image"
                          aspectRatio="1/1"
                          objectFit="cover"
                        />
                      ))}
                    </div>
                  )}

                  {review.reply ? (
                    <div className="review-reply">
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: "4px",
                          color: "var(--fb-primary)",
                        }}
                      >
                        Ihre Antwort
                      </div>
                      <div>{review.reply}</div>
                      {review.repliedAt && (
                        <div
                          style={{
                            fontSize: "var(--fb-font-size-xs)",
                            color: "var(--fb-text-secondary)",
                            marginTop: "4px",
                          }}
                        >
                          {formatDateTime(review.repliedAt)}
                        </div>
                      )}
                    </div>
                  ) : replyingTo === review.id ? (
                    <div className="review-reply-form">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="fb-input"
                        rows={3}
                        placeholder="Antwort eingeben..."
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          onClick={() => handleReply(review.id)}
                          className="fb-button"
                          style={{ fontSize: "var(--fb-font-size-sm)" }}
                        >
                          Antworten
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="fb-button-secondary"
                          style={{ fontSize: "var(--fb-font-size-sm)" }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(review.id)}
                      className="fb-button-secondary"
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        marginTop: "12px",
                      }}
                    >
                      Antworten
                    </button>
                  )}
                </div>
              )}
            />
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    {review.customer.name}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    {formatDateTime(review.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: "var(--fb-font-size-xl)" }}>
                  {"⭐".repeat(review.rating)}
                </div>
              </div>

              {review.comment && (
                <div className="review-comment">{review.comment}</div>
              )}

              {review.images && review.images.length > 0 && (
                <div className="review-images">
                  {review.images.map((img, idx) => (
                    <OptimizedImage
                      key={idx}
                      src={img}
                      alt={`Review ${idx + 1}`}
                      className="review-image"
                      aspectRatio="1/1"
                      objectFit="cover"
                    />
                  ))}
                </div>
              )}

              {review.reply ? (
                <div className="review-reply">
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "4px",
                      color: "var(--fb-primary)",
                    }}
                  >
                    Ihre Antwort
                  </div>
                  <div>{review.reply}</div>
                  {review.repliedAt && (
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-xs)",
                        color: "var(--fb-text-secondary)",
                        marginTop: "4px",
                      }}
                    >
                      {formatDateTime(review.repliedAt)}
                    </div>
                  )}
                </div>
              ) : replyingTo === review.id ? (
                <div className="review-reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="fb-input"
                    rows={3}
                    placeholder="Antwort eingeben..."
                  />
                  <div
                    style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                  >
                    <button
                      onClick={() => handleReply(review.id)}
                      className="fb-button"
                      style={{ fontSize: "var(--fb-font-size-sm)" }}
                    >
                      Antworten
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="fb-button-secondary"
                      style={{ fontSize: "var(--fb-font-size-sm)" }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(review.id)}
                  className="fb-button-secondary"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    marginTop: "12px",
                  }}
                >
                  Antworten
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

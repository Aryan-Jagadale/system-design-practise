package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/sseadmin/fb-live-comments-poc/internal/subscription"

	"github.com/redis/go-redis/v9"
)

const (
	ViewerThresholdForHot = 50000 // 50k viewers = "Hot"
)

type RedisRepository struct {
	Client *redis.Client
	Manager *subscription.SubscriptionManager
}

func NewRedisRepository(host string) (*RedisRepository, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         host + ":6379",
		Password:     "",
		DB:           0,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}
	repo := &RedisRepository{Client: client}
	repo.Manager = subscription.NewSubscriptionManager(client,repo)

	fmt.Println("Connected to Redis && Subscription successfully")
	return repo, nil
}

// Close closes the Redis connection
func (r *RedisRepository) Close() error {
	return r.Client.Close()
}

// Publish comment to a channel
func (r *RedisRepository) PublishComment(videoID string, comment interface{}) error {
	ctx := context.Background()
	channel := "comments:" + videoID

	return r.Client.Publish(ctx, channel, comment).Err()
}

// Subscribe to a video's comment channel
func (r *RedisRepository) SubscribeToVideo(ctx context.Context, videoID string) *redis.PubSub {
	channel := "comments:" + videoID
	return r.Client.Subscribe(ctx, channel)
}

func (r *RedisRepository) IncrementViewerCount(videoID string) error {
	ctx := context.Background()
	key := "viewers:" + videoID
	return r.Client.Incr(ctx, key).Err()
}

func (r *RedisRepository) DecrementViewerCount(videoID string) error {
	ctx := context.Background()
	key := "viewers:" + videoID
	return r.Client.Decr(ctx, key).Err()
}

func (r *RedisRepository) GetViewerCount(videoID string) (int64, error) {
	ctx := context.Background()
	key := "viewers:" + videoID
	count, err := r.Client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func (r *RedisRepository) IsVideoHot(videoID string) (bool, error) {
	count, err := r.GetViewerCount(videoID)
	if err != nil {
		return false, err
	}
	return count >= ViewerThresholdForHot, nil
}

func (r *RedisRepository) AddToRecentComments(videoID string, commentJSON []byte) error {
	ctx := context.Background()
	key := "recent_comments:" + videoID
	
	r.Client.LPush(ctx, key, commentJSON)
	r.Client.LTrim(ctx, key, 0, 199)
	return nil
}

func (r *RedisRepository) GetRecentCommentsCache(videoID string, limit int) ([]string, error) {
	ctx := context.Background()
	key := "recent_comments:" + videoID
	
	result, err := r.Client.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err == redis.Nil {
		return []string{}, nil
	}
	return result, err
}
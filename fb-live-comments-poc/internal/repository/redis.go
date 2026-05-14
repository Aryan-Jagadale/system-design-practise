package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisRepository struct {
	Client *redis.Client
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

	fmt.Println("Connected to Redis successfully")
	return &RedisRepository{Client: client}, nil
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
	return r.Client.Get(ctx, key).Int64()
}
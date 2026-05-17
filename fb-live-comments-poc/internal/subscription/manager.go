package subscription

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type SubscriptionManager struct {
	client  *redis.Client
	pubsubs map[string]*redis.PubSub // videoID -> PubSub
	mu      sync.RWMutex
	viewerProvider  ViewerCountProvider
	timeout time.Duration
	stopCh  chan struct{}
}

func NewSubscriptionManager(client *redis.Client,provider ViewerCountProvider) *SubscriptionManager {
	m := &SubscriptionManager{
		client:  client,
		pubsubs: make(map[string]*redis.PubSub),
		timeout: 45 * time.Second,
		viewerProvider: provider,
		stopCh:  make(chan struct{}),
	}

	go m.startCleanupWorker()

	return m
}

func (m *SubscriptionManager) SubscribeIfNeeded(videoID string) (*redis.PubSub, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if ps, exists := m.pubsubs[videoID]; exists {
		return ps, nil
	}

	channel := "comments:" + videoID
	pubsub := m.client.Subscribe(context.Background(), channel)

	m.pubsubs[videoID] = pubsub
	fmt.Printf("Pubsub: %s\n", m.pubsubs)
	fmt.Printf("Subscribed to new video channel: %s\n", videoID)

	return pubsub, nil
}

func (m *SubscriptionManager) Unsubscribe(videoID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if pubsub, exists := m.pubsubs[videoID]; exists {
		pubsub.Close()
		delete(m.pubsubs, videoID)
		fmt.Printf("Unsubscribed from video channel: %s\n", videoID)
	}
}

// CheckAndCleanupIfIdle immediately checks if a video has no viewers and unsubscribes if so
func (m *SubscriptionManager) CheckAndCleanupIfIdle(videoID string) error {
	count, err := m.viewerProvider.GetViewerCount(videoID)
	if err != nil {
		return err
	}

	if count <= 0 {
		fmt.Printf("Auto-cleanup triggered: No active viewers for %s → Unsubscribing\n", videoID)
		m.Unsubscribe(videoID)
	}
	return nil
}

func (m *SubscriptionManager) GetActiveSubscriptionCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.pubsubs)
}

func (m *SubscriptionManager) startCleanupWorker() {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.cleanupIdleVideos()
		}
	}
}

func (m *SubscriptionManager) cleanupIdleVideos() {
	m.mu.Lock()
	videoIDs := make([]string, 0, len(m.pubsubs))
	for vid := range m.pubsubs {
		videoIDs = append(videoIDs, vid)
	}

	m.mu.Unlock()
	if len(videoIDs) == 0 {
		return
	}

	fmt.Printf("Cleanup worker: Checking %d active subscriptions...\n", len(videoIDs))

	for _, videoID := range videoIDs {
		count, err := m.viewerProvider.GetViewerCount(videoID)
		if err != nil {
			fmt.Printf("⚠️  Failed to get viewer count for %s: %v\n", videoID, err)
			continue
		}

		if count <= 0 {
			fmt.Printf("✓ Cleanup: No active viewers for %s → Unsubscribing\n", videoID)
			m.Unsubscribe(videoID)
		} else {
			fmt.Printf("• Video %s still has %d viewers\n", videoID, count)
		}
	}
}

func (m *SubscriptionManager) Shutdown() {
	close(m.stopCh)
	m.mu.Lock()
	for _, pubsub := range m.pubsubs {
		pubsub.Close()
	}
	m.mu.Unlock()
}

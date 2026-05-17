package service

import (
	"github.com/sseadmin/fb-live-comments-poc/internal/repository"
	"sync"
	"time"
	"fmt"
)

type VideoMode string

const (
	ModeNormal VideoMode = "normal" // SSE + Redis Pub/Sub
	ModeHot    VideoMode = "hot"    // Cache + Polling
)


type VideoModeService struct {
	repo     *repository.RedisRepository
	modeMap  map[string]VideoMode
	mu       sync.RWMutex
}


func NewVideoModeService(repo *repository.RedisRepository) *VideoModeService {
	vs := &VideoModeService{
		repo:    repo,
		modeMap: make(map[string]VideoMode),
	}

	go vs.startModeChecker()
	return vs
}

func (vs *VideoModeService) startModeChecker() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {

	}
}

func (vs *VideoModeService) GetMode(videoID string) VideoMode {
	vs.mu.RLock()
	mode, exists := vs.modeMap[videoID]
	vs.mu.RUnlock()

	if !exists {
		return ModeNormal
	}
	return mode
}
func (vs *VideoModeService) UpdateMode(videoID string) {
	isHot, err := vs.repo.IsVideoHot(videoID)
	if err != nil {
		return
	}

	vs.mu.Lock()
	defer vs.mu.Unlock()

	currentMode := vs.modeMap[videoID]

	if isHot && currentMode != ModeHot {
		vs.modeMap[videoID] = ModeHot
		fmt.Printf("[VIRAL] Video %s switched to HOT mode!\n", videoID)
	} else if !isHot && currentMode == ModeHot {
		vs.modeMap[videoID] = ModeNormal
		fmt.Printf("video %s returned to Normal mode\n", videoID)
	}
}
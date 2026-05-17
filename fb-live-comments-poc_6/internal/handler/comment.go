package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/sseadmin/fb-live-comments-poc/internal/model"
	"github.com/sseadmin/fb-live-comments-poc/internal/repository"
	"github.com/sseadmin/fb-live-comments-poc/internal/service"


	"github.com/gin-gonic/gin"
)

func CreateComment(repo *repository.CassandraRepository, rRepo *repository.RedisRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		videoID := c.Param("videoId")
		if videoID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "videoId is required in URL"})
			return
		}

		var req model.CreateCommentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		req.VideoID = videoID

		comment, err := repo.CreateComment(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		commentJSON, err := json.Marshal(comment)
		if err != nil {
			fmt.Printf("Warning: Failed to marshal comment to JSON: %v\n", err)
		} else {
			if err := rRepo.PublishComment(videoID, commentJSON); err != nil {
				fmt.Printf("Warning: Failed to publish to Redis: %v\n", err)
			}
			if err := rRepo.AddToRecentComments(videoID, commentJSON); err != nil {
				fmt.Printf("Warning: Failed to add to recent cache: %v\n", err)
			}
		}

		c.JSON(http.StatusCreated, comment)
	}
}

func GetComments(repo *repository.CassandraRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		videoID := c.Param("videoId")
		if videoID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "videoId is required"})
			return
		}

		limit := 20
		if l := c.Query("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}
		cursor := c.Query("cursor")

		comments, err := repo.GetCommentsPaginated(videoID, limit,cursor)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, comments)
	}
}

func StreamComments(cRepo *repository.CassandraRepository, rRepo *repository.RedisRepository,modeService *service.VideoModeService) gin.HandlerFunc {

	return func(c *gin.Context) {
		videoID := c.Param("videoId")
		if videoID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "videoId is required"})
			return
		}
		modeService.UpdateMode(videoID)
		mode := modeService.GetMode(videoID)

		if mode == service.ModeHot {
			c.JSON(http.StatusOK, gin.H{
				"mode":     "hot",
				"message":  "Video is in viral mode. Please use polling endpoint.",
				"poll_url": "/poll/" + videoID,
			})
			return
		}


		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

		rRepo.IncrementViewerCount(videoID)

		recentComments, err := cRepo.GetRecentComments(videoID, 30)
		if err == nil && len(recentComments) > 0 {
			for _, comment := range recentComments {
				c.SSEvent("history", comment)
				c.Writer.Flush()
			}
		}

		c.SSEvent("connected", gin.H{
			"message":  "Connected to live comments stream",
			"video_id": videoID,
		})

		c.Writer.Flush()

		pubsub, err := rRepo.Manager.SubscribeIfNeeded(videoID)
		if err != nil {
			fmt.Printf("Failed to subscribe: %v\n", err)
			return
		}

		ch := pubsub.Channel()

		defer func() {
			rRepo.DecrementViewerCount(videoID)
			if err := rRepo.Manager.CheckAndCleanupIfIdle(videoID); err != nil {
				fmt.Printf("Cleanup check failed for %s: %v\n", videoID, err)
			}
			fmt.Printf("Client left video %s\n", videoID)
		}()

		ctx := c.Request.Context()

		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				c.SSEvent("comment", msg.Payload)
				c.Writer.Flush()
			}
		}
	}
}

// PollComments - For Hot/Viral videos
func PollComments(cRepo *repository.CassandraRepository, rRepo *repository.RedisRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		videoID := c.Param("videoId")
		if videoID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "videoId is required"})
			return
		}

		limit := 30
		if l := c.Query("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil {
				limit = parsed
			}
		}

		// Get recent comments
		commentsJSON, err := rRepo.GetRecentCommentsCache(videoID, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"mode":     "hot",
			"comments": commentsJSON,
			"count":    len(commentsJSON),
		})
	}
}

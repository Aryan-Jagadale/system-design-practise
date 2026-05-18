package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/sseadmin/fb-live-comments-poc/internal/handler"
	"github.com/sseadmin/fb-live-comments-poc/internal/repository"
	"github.com/sseadmin/fb-live-comments-poc/internal/service"

	"github.com/gin-gonic/gin"
)

var allowedOrigins = map[string]struct{}{
	"http://127.0.0.1:5501": {},
	"http://localhost:5501": {},
}

func main() {
	cassandraHost := getEnv("CASSANDRA_HOST", "localhost")
	redisHost := getEnv("REDIS_HOST", "localhost")

	// Cassandra db connection
	cRepo, err := repository.NewCassandraRepository(cassandraHost)
	if err != nil {
		log.Fatalf("Failed to connect to Cassandra: %v", err)
	}
	defer cRepo.Close()

	//Redis connection
	rRepo, err := repository.NewRedisRepository(redisHost)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer rRepo.Close()

	modeService := service.NewVideoModeService(rRepo)

	r := gin.Default()
	r.Use(corsMiddleware())

	// Routes
	r.POST("/comments/:videoId", handler.CreateComment(cRepo, rRepo))
	r.GET("/comments/:videoId", handler.GetComments(cRepo))

	r.GET("/stream/:videoId", handler.StreamComments(cRepo, rRepo, modeService))
	r.GET("/poll/:videoId", handler.PollComments(cRepo, rRepo))

	r.POST("/make-viral/:videoId", func(c *gin.Context) {
		videoID := c.Param("videoId")
		if err := rRepo.Client.Set(context.Background(), "viewers:"+videoID, 65000, 0).Err(); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "viral", "viewers": 65000})
	})

	r.POST("/reset-normal/:videoId", func(c *gin.Context) {
		videoID := c.Param("videoId")
		if err := rRepo.Client.Set(context.Background(), "viewers:"+videoID, 245, 0).Err(); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "normal", "viewers": 245})
	})

	fmt.Println("Server starting on :8080")
	fmt.Println("📡 SSE Stream available at /stream/{videoId}")

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

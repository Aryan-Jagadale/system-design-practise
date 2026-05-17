package main

import (
	"fmt"
	"log"
	"os"

	"github.com/sseadmin/fb-live-comments-poc/internal/handler"
	"github.com/sseadmin/fb-live-comments-poc/internal/repository"

	"github.com/gin-gonic/gin"
)

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


	r := gin.Default()

	// Routes
	r.POST("/comments/:videoId", handler.CreateComment(cRepo,rRepo))
	r.GET("/comments/:videoId", handler.GetComments(cRepo))

	r.GET("/stream/:videoId", handler.StreamComments(cRepo, rRepo))

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
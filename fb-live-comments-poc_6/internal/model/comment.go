package model

import "time"

type Comment struct {
	ID        string    `json:"id"`
	VideoID   string    `json:"video_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateCommentRequest - for incoming POST request
type CreateCommentRequest struct {
	VideoID string `json:"video_id"`
	UserID  string `json:"user_id" binding:"required"`
	Content string `json:"content" binding:"required,max=500"`
}

type CommentsResponse struct {
	Comments []Comment `json:"comments"`
	NextCursor string   `json:"next_cursor,omitempty"`
	HasMore    bool     `json:"has_more"`
}
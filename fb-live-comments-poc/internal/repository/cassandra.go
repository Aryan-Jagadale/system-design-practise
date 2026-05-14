package repository

import (
	"fmt"
	"time"

	"fb-live-comments-poc/internal/model"

	"github.com/gocql/gocql"
)

type CassandraRepository struct {
	Session *gocql.Session
}

func NewCassandraRepository(host string) (*CassandraRepository, error) {
	cluster := gocql.NewCluster(host)
	cluster.Consistency = gocql.Quorum
	cluster.Port = 9042

	bootstrapSession, err := cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to create cassandra session: %w", err)
	}
	defer bootstrapSession.Close()

	if err := createKeyspace(bootstrapSession); err != nil {
		return nil, err
	}

	clusterWithKeyspace := gocql.NewCluster(host)
	clusterWithKeyspace.Keyspace = "live_comments"
	clusterWithKeyspace.Consistency = gocql.Quorum
	clusterWithKeyspace.Port = 9042

	session, err := clusterWithKeyspace.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to create cassandra session with keyspace: %w", err)
	}

	repo := &CassandraRepository{Session: session}

	if err := repo.createSchema(); err != nil {
		repo.Close()
		return nil, err
	}

	return repo, nil
}

func createKeyspace(session *gocql.Session) error {
	err := session.Query(`
		CREATE KEYSPACE IF NOT EXISTS live_comments
		WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
	`).Exec()
	if err != nil {
		return fmt.Errorf("failed to create keyspace: %w", err)
	}

	return nil
}

func (r *CassandraRepository) createSchema() error {
	// Create table
	err := r.Session.Query(`
		CREATE TABLE IF NOT EXISTS live_comments.comments (
			video_id   text,
			comment_id timeuuid,
			user_id    text,
			content    text,
			created_at timestamp,
			PRIMARY KEY (video_id, comment_id)
		) WITH CLUSTERING ORDER BY (comment_id DESC);
	`).Exec()
	if err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	return nil
}

// CreateComment inserts a new comment
func (r *CassandraRepository) CreateComment(req model.CreateCommentRequest) (*model.Comment, error) {
	commentID := gocql.TimeUUID()
	now := time.Now()

	comment := &model.Comment{
		ID:        commentID.String(),
		VideoID:   req.VideoID,
		UserID:    req.UserID,
		Content:   req.Content,
		CreatedAt: now,
	}

	err := r.Session.Query(`
		INSERT INTO live_comments.comments (video_id, comment_id, user_id, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, comment.VideoID, commentID, comment.UserID, comment.Content, comment.CreatedAt).Exec()

	if err != nil {
		return nil, fmt.Errorf("failed to insert comment: %w", err)
	}

	return comment, nil
}

// GetRecentComments - Get latest comments (for initial load)
func (r *CassandraRepository) GetRecentComments(videoID string, limit int) ([]model.Comment, error) {
	var comments []model.Comment

	iter := r.Session.Query(`
		SELECT comment_id, user_id, content, created_at 
		FROM live_comments.comments 
		WHERE video_id = ? 
		LIMIT ?
	`, videoID, limit).Iter()

	var (
		commentID gocql.UUID
		userID    string
		content   string
		createdAt time.Time
	)

	for iter.Scan(&commentID, &userID, &content, &createdAt) {
		comments = append(comments, model.Comment{
			ID:        commentID.String(),
			VideoID:   videoID,
			UserID:    userID,
			Content:   content,
			CreatedAt: createdAt,
		})
	}

	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("failed to fetch comments: %w", err)
	}

	return comments, nil
}

func (r *CassandraRepository) GetCommentsPaginated(videoID string, limit int, cursor string) (*model.CommentsResponse, error) {
	var comments []model.Comment
	var nextCursor string
	hasMore := false

	query := `
		SELECT comment_id, user_id, content, created_at 
		FROM live_comments.comments 
		WHERE video_id = ?`

	var args []interface{}
	args = append(args, videoID)

	if cursor != "" {
		cursorUUID, err := gocql.ParseUUID(cursor)
		if err != nil {
			return nil, fmt.Errorf("invalid cursor: %w", err)
		}
		query += " AND comment_id < ?"
		args = append(args, cursorUUID)
	}

	query += " LIMIT ?"
	args = append(args, limit+1)

	iter := r.Session.Query(query, args...).Iter()

	var (
		commentID gocql.UUID
		userID    string
		content   string
		createdAt time.Time
	)

	count := 0
	for iter.Scan(&commentID, &userID, &content, &createdAt) {
		count++
		comments = append(comments, model.Comment{
			ID:        commentID.String(),
			VideoID:   videoID,
			UserID:    userID,
			Content:   content,
			CreatedAt: createdAt,
		})

		
		if count == limit {
			nextCursor = commentID.String()
		}
	}
	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("failed to fetch comments: %w", err)
	}
	if len(comments) > limit {
		hasMore = true
		comments = comments[:limit] // remove the extra one
	} else {
		nextCursor = ""
	}

	return &model.CommentsResponse{
		Comments:   comments,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *CassandraRepository) Close() {
	if r.Session != nil {
		r.Session.Close()
	}
}

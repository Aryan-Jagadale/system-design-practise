package subscription

type ViewerCountProvider interface {
	GetViewerCount(videoID string) (int64, error)
}
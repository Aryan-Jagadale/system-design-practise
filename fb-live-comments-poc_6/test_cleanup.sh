#!/bin/bash

echo "Testing auto-unsubscribe feature..."

VIDEO_ID="test-$(date +%s)"
BASE_URL="http://localhost:8080"

echo ""
echo "-->Test 1: Single viewer cleanup"
echo "Starting stream for $VIDEO_ID..."

# Start stream in background
curl -N "$BASE_URL/stream/$VIDEO_ID" &
CURL_PID=$!

echo "Stream PID: $CURL_PID"
sleep 2

echo "Killing stream..."
kill $CURL_PID 2>/dev/null
sleep 2

echo "--> Check logs for: 'Auto-cleanup triggered'"
echo ""
echo "---"
echo ""

echo "--> Test 2: Multiple viewers"
VIDEO_ID2="test2-$(date +%s)"

# Start two streams
curl -N "$BASE_URL/stream/$VIDEO_ID2" &
PID1=$!
sleep 0.5
curl -N "$BASE_URL/stream/$VIDEO_ID2" &
PID2=$!

echo "Started 2 viewers: $PID1, $PID2"
sleep 3

echo "Killing first viewer..."
kill $PID1 2>/dev/null
sleep 2

echo "-----> Check logs should show: 'Video $VIDEO_ID2 still has 1 viewers'"
echo ""

sleep 3
echo "Killing second viewer..."
kill $PID2 2>/dev/null
sleep 2

echo "------>Check logs should show: 'Auto-cleanup triggered'"
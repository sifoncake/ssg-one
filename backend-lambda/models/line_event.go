package models

// LINEWebhookRequest represents the webhook request from LINE
type LINEWebhookRequest struct {
	Events []LINEEvent `json:"events"`
}

// LINEEvent represents a single event from LINE webhook
type LINEEvent struct {
	Type      string      `json:"type"`
	Timestamp int64       `json:"timestamp"`
	Source    LINESource  `json:"source"`
	ReplyToken string     `json:"replyToken"`
	Message   LINEMessage `json:"message"`
}

// LINESource represents the source of the message
type LINESource struct {
	Type   string `json:"type"`
	UserID string `json:"userId"`
}

// LINEMessage represents a message from LINE
type LINEMessage struct {
	Type string `json:"type"`
	ID   string `json:"id"`
	Text string `json:"text"`
}

// LINEReplyRequest represents a reply to LINE
type LINEReplyRequest struct {
	ReplyToken string              `json:"replyToken"`
	Messages   []LINEReplyMessage  `json:"messages"`
}

// LINEReplyMessage represents a single reply message
type LINEReplyMessage struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// LINEBroadcastRequest represents a broadcast request
type LINEBroadcastRequest struct {
	Messages []LINEReplyMessage `json:"messages"`
}

// LINEPushRequest represents a push message request
type LINEPushRequest struct {
	To       string             `json:"to"`
	Messages []LINEReplyMessage `json:"messages"`
}

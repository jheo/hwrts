CREATE TABLE ai_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    review_type VARCHAR(20) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    ai_provider VARCHAR(20) NOT NULL,
    ai_model VARCHAR(50) NOT NULL,
    suggestions_count INT NOT NULL DEFAULT 0,
    accepted_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_reviews_document_id ON ai_reviews(document_id);

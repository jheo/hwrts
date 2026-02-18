CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_hash VARCHAR(32) NOT NULL UNIQUE,
    version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    overall_score REAL NOT NULL,
    grade VARCHAR(20) NOT NULL,
    label VARCHAR(100),
    verification_data JSONB NOT NULL DEFAULT '{}',
    ai_usage_data JSONB NOT NULL DEFAULT '{}',
    content_hash VARCHAR(64) NOT NULL,
    signature TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificates_short_hash ON certificates(short_hash);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_document ON certificates(document_id);

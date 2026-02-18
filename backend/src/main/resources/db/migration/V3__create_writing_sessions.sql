CREATE TABLE writing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT, -- total active editing time
    keystroke_count INTEGER NOT NULL DEFAULT 0,
    word_count_start INTEGER NOT NULL DEFAULT 0,
    word_count_end INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_writing_sessions_document_id ON writing_sessions(document_id);
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);

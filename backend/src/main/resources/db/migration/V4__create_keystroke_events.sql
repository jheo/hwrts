-- TimescaleDB hypertable for keystroke time-series data
CREATE TABLE keystroke_events (
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    keystroke_count INTEGER NOT NULL DEFAULT 0,
    avg_wpm REAL NOT NULL DEFAULT 0,
    wpm_std_dev REAL NOT NULL DEFAULT 0,
    avg_dwell_time REAL NOT NULL DEFAULT 0,
    avg_flight_time REAL NOT NULL DEFAULT 0,
    flight_time_entropy REAL NOT NULL DEFAULT 0,
    error_rate REAL NOT NULL DEFAULT 0,
    pause_count INTEGER NOT NULL DEFAULT 0,
    burst_pause_ratio REAL NOT NULL DEFAULT 0
);

-- Convert to hypertable (TimescaleDB)
-- Falls back gracefully if TimescaleDB extension is not available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('keystroke_events', 'time', chunk_time_interval => INTERVAL '1 day');
        -- Compression policy: compress chunks older than 7 days
        ALTER TABLE keystroke_events SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'session_id'
        );
        PERFORM add_compression_policy('keystroke_events', INTERVAL '7 days');
        -- Retention policy: drop data older than 90 days
        PERFORM add_retention_policy('keystroke_events', INTERVAL '90 days');
    ELSE
        RAISE NOTICE 'TimescaleDB not available, creating regular table';
    END IF;
END$$;

CREATE INDEX idx_keystroke_events_session_id ON keystroke_events(session_id, time DESC);

-- Individual keystroke events (matches Exposed ORM: KeystrokeEvents.kt)
CREATE TABLE keystroke_events (
    id BIGSERIAL,
    session_id UUID NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(10) NOT NULL,
    key_category VARCHAR(20) NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    dwell_time_ms INTEGER,
    flight_time_ms INTEGER,
    time TIMESTAMPTZ NOT NULL
);

-- Convert to hypertable (TimescaleDB)
-- Falls back gracefully if TimescaleDB extension is not available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('keystroke_events', 'time', chunk_time_interval => INTERVAL '1 day');
        ALTER TABLE keystroke_events SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'session_id'
        );
        PERFORM add_compression_policy('keystroke_events', INTERVAL '7 days');
        PERFORM add_retention_policy('keystroke_events', INTERVAL '90 days');
    ELSE
        RAISE NOTICE 'TimescaleDB not available, creating regular table';
    END IF;
END$$;

CREATE INDEX idx_keystroke_events_session_id ON keystroke_events(session_id, time DESC);
CREATE INDEX idx_keystroke_events_timestamp ON keystroke_events(session_id, timestamp_ms);

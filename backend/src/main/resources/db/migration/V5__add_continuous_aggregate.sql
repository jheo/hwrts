-- V5: Add Continuous Aggregate for 5-second keystroke statistics
-- This view auto-materializes aggregated stats for the KeystrokeAnalyzer

-- Create continuous aggregate for 5-second windows
CREATE MATERIALIZED VIEW keystroke_stats_5s
WITH (timescaledb.continuous) AS
SELECT
    session_id,
    time_bucket('5 seconds', time) AS bucket,
    COUNT(*) AS keystroke_count,
    COUNT(*) FILTER (WHERE event_type = 'keydown') AS keydown_count,
    COUNT(*) FILTER (WHERE key_category IN ('letter', 'number')) AS typing_keys,
    COUNT(*) FILTER (WHERE key_category = 'modifier') AS modifier_keys,
    AVG(dwell_time_ms) FILTER (WHERE dwell_time_ms IS NOT NULL) AS avg_dwell_time,
    AVG(flight_time_ms) FILTER (WHERE flight_time_ms IS NOT NULL) AS avg_flight_time,
    MIN(flight_time_ms) FILTER (WHERE flight_time_ms IS NOT NULL) AS min_flight_time,
    MAX(flight_time_ms) FILTER (WHERE flight_time_ms IS NOT NULL) AS max_flight_time,
    STDDEV(flight_time_ms) FILTER (WHERE flight_time_ms IS NOT NULL) AS stddev_flight_time,
    MIN(time) AS window_start,
    MAX(time) AS window_end
FROM keystroke_events
GROUP BY session_id, time_bucket('5 seconds', time)
WITH NO DATA;

-- Auto-refresh policy: refresh every 5 seconds, looking back 1 minute
SELECT add_continuous_aggregate_policy('keystroke_stats_5s',
    start_offset => INTERVAL '1 minute',
    end_offset => INTERVAL '5 seconds',
    schedule_interval => INTERVAL '5 seconds'
);

-- Index for fast session lookups
CREATE INDEX idx_keystroke_stats_session_bucket
    ON keystroke_stats_5s (session_id, bucket DESC);

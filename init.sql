CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- BRONZE: no structure, just raw storage
CREATE TABLE bronze_alerts (
    id              BIGSERIAL    PRIMARY KEY,
    source_system   VARCHAR(20)  NOT NULL,
    raw_payload     TEXT         NOT NULL,
    content_type    VARCHAR(10)  NOT NULL DEFAULT 'json',
    ingested_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_bronze_pending
    ON bronze_alerts (processing_status) WHERE processing_status = 'pending';

-- SILVER: fixed core + flexible JSONB for everything else
CREATE TABLE silver_alerts (
    alert_id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system       VARCHAR(20) NOT NULL,
    source_alert_id     TEXT,

    -- Core fields — every source has these
    alert_name          TEXT        NOT NULL,
    severity            SMALLINT    NOT NULL CHECK (severity BETWEEN 1 AND 4),
    severity_label      VARCHAR(20),
    status              VARCHAR(20) NOT NULL,
    customer_name       TEXT        NOT NULL,
    device_name         TEXT,
    host                TEXT,
    alert_category      VARCHAR(30),
    is_duplicate        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_resolution       BOOLEAN     NOT NULL DEFAULT FALSE,
    fingerprint         CHAR(64)    NOT NULL,
    incident_id         UUID,

    -- Timing
    occurred_at         TIMESTAMPTZ NOT NULL,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unstructured text — for GenAI embedding
    description         TEXT,

    -- Semi-structured — N-Central metric values
    -- Keys vary by service: cpu_usage_pct, disk_free_gb, packet_loss_pct, etc.
    quantitative_data   JSONB,

    -- Fully flexible — source-specific fields
    -- Auvik:    correlation_id, entity_type, alert_url
    -- Meraki:   device_serial, device_mac, device_model, network_name, ingestion_lag_sec
    -- N-Central: trigger_id, old_state, new_state, task_ident, probe_uri
    extra_data          JSONB,

    -- Audit
    bronze_id           BIGINT REFERENCES bronze_alerts(id)
);

CREATE INDEX idx_silver_occurred    ON silver_alerts (occurred_at DESC);
CREATE INDEX idx_silver_severity    ON silver_alerts (severity);
CREATE INDEX idx_silver_customer    ON silver_alerts (customer_name);
CREATE INDEX idx_silver_source      ON silver_alerts (source_system);
CREATE INDEX idx_silver_fingerprint ON silver_alerts (fingerprint);
CREATE INDEX idx_silver_duplicate   ON silver_alerts (is_duplicate);
CREATE INDEX idx_silver_incident    ON silver_alerts (incident_id);
CREATE INDEX idx_silver_category    ON silver_alerts (alert_category);

-- Index inside JSONB for common metric queries
CREATE INDEX idx_silver_cpu
    ON silver_alerts ((quantitative_data->>'cpu_usage_pct'));
CREATE INDEX idx_silver_disk
    ON silver_alerts ((quantitative_data->>'disk_usage_pct'));
CREATE INDEX idx_silver_device_model
    ON silver_alerts ((extra_data->>'device_model'));
CREATE INDEX idx_silver_old_state
    ON silver_alerts ((extra_data->>'old_state'));

-- GOLD: business-level incidents
CREATE TABLE gold_incidents (
    incident_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_title      TEXT        NOT NULL,
    alert_category      VARCHAR(30),
    severity_max        SMALLINT    NOT NULL,
    severity_label      VARCHAR(20),
    status              VARCHAR(20) NOT NULL DEFAULT 'open',
    alert_count         INT         NOT NULL DEFAULT 1,
    incident_start      TIMESTAMPTZ NOT NULL,
    incident_end        TIMESTAMPTZ,
    root_alert_id       UUID,
    root_alert_name     TEXT,
    root_device         TEXT,
    root_customer       TEXT,
    ml_predicted_cause  TEXT,
    ai_summary          TEXT,
    ai_resolution_steps TEXT,
    assigned_team       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status   ON gold_incidents (status);
CREATE INDEX idx_incidents_severity ON gold_incidents (severity_max);
CREATE INDEX idx_incidents_customer ON gold_incidents (root_customer);
CREATE INDEX idx_incidents_start    ON gold_incidents (incident_start DESC);

-- DQ log: tracks data quality failures
CREATE TABLE dq_failures (
    id              BIGSERIAL   PRIMARY KEY,
    alert_id        UUID,
    bronze_id       BIGINT,
    source_system   VARCHAR(20),
    rule_name       TEXT        NOT NULL,
    failure_message TEXT        NOT NULL,
    raw_value       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
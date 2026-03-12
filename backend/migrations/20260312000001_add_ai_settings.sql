CREATE TABLE IF NOT EXISTS ai_settings (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'moonshot',
    model VARCHAR(255) NOT NULL DEFAULT 'moonshot-v1-8k',
    base_url TEXT,
    api_key TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON ai_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO ai_settings (id, provider, model)
VALUES (1, 'moonshot', 'moonshot-v1-8k')
ON CONFLICT (id) DO NOTHING;

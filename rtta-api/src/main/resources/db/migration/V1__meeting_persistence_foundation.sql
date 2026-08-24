CREATE TABLE meetings (
    id UUID PRIMARY KEY,
    live_session_id UUID NOT NULL UNIQUE,
    title TEXT NOT NULL,
    source_language VARCHAR(35) NOT NULL,
    target_language VARCHAR(35) NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT meetings_status_check CHECK (status IN ('LIVE', 'COMPLETED', 'FAILED')),
    CONSTRAINT meetings_time_order_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX meetings_started_at_idx ON meetings (started_at DESC, id);
CREATE INDEX meetings_status_idx ON meetings (status, started_at DESC);

CREATE TABLE transcript_utterances (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    ordinal BIGINT NOT NULL,
    event_key VARCHAR(64) NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    offset_ms BIGINT NOT NULL,
    duration_ms BIGINT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    provider_metadata JSONB,
    CONSTRAINT transcript_utterances_ordinal_unique UNIQUE (meeting_id, ordinal),
    CONSTRAINT transcript_utterances_event_unique UNIQUE (meeting_id, event_key),
    CONSTRAINT transcript_utterances_text_check CHECK (
        length(btrim(source_text)) > 0 OR length(btrim(translated_text)) > 0
    ),
    CONSTRAINT transcript_utterances_offset_check CHECK (offset_ms >= 0),
    CONSTRAINT transcript_utterances_duration_check CHECK (duration_ms >= 0)
);

CREATE INDEX transcript_utterances_timeline_idx
    ON transcript_utterances (meeting_id, offset_ms, ordinal);
CREATE INDEX transcript_utterances_observed_at_idx
    ON transcript_utterances (meeting_id, observed_at);

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    utterance_id UUID REFERENCES transcript_utterances(id) ON DELETE SET NULL,
    offset_ms BIGINT,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    CONSTRAINT bookmarks_target_check CHECK (utterance_id IS NOT NULL OR offset_ms IS NOT NULL),
    CONSTRAINT bookmarks_offset_check CHECK (offset_ms IS NULL OR offset_ms >= 0)
);

CREATE INDEX bookmarks_meeting_created_idx ON bookmarks (meeting_id, created_at, id);
CREATE UNIQUE INDEX bookmarks_utterance_unique
    ON bookmarks (meeting_id, utterance_id)
    WHERE utterance_id IS NOT NULL;

CREATE TABLE research_notes (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    utterance_id UUID REFERENCES transcript_utterances(id) ON DELETE SET NULL,
    bookmark_id UUID REFERENCES bookmarks(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT research_notes_content_check CHECK (length(btrim(content)) > 0)
);

CREATE INDEX research_notes_meeting_created_idx
    ON research_notes (meeting_id, created_at, id);

CREATE TABLE ai_explanations (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    utterance_id UUID REFERENCES transcript_utterances(id) ON DELETE SET NULL,
    selected_text TEXT NOT NULL,
    user_question TEXT,
    context_snapshot JSONB NOT NULL,
    model VARCHAR(200) NOT NULL,
    response_markdown TEXT NOT NULL,
    citations JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ai_explanations_selected_text_check CHECK (length(btrim(selected_text)) > 0),
    CONSTRAINT ai_explanations_response_check CHECK (length(btrim(response_markdown)) > 0)
);

CREATE INDEX ai_explanations_meeting_created_idx
    ON ai_explanations (meeting_id, created_at DESC, id);

CREATE TABLE meeting_summaries (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    model VARCHAR(200) NOT NULL,
    summary_markdown TEXT NOT NULL,
    structured_data JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT meeting_summaries_content_check CHECK (length(btrim(summary_markdown)) > 0)
);

CREATE INDEX meeting_summaries_meeting_created_idx
    ON meeting_summaries (meeting_id, created_at DESC, id);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    media_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT documents_status_check CHECK (status IN ('UPLOADED', 'PROCESSING', 'READY', 'FAILED')),
    CONSTRAINT documents_size_check CHECK (size_bytes >= 0),
    CONSTRAINT documents_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX documents_meeting_created_idx ON documents (meeting_id, created_at DESC, id);
CREATE INDEX documents_sha256_idx ON documents (sha256);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR,
    CONSTRAINT document_chunks_index_unique UNIQUE (document_id, chunk_index),
    CONSTRAINT document_chunks_index_check CHECK (chunk_index >= 0),
    CONSTRAINT document_chunks_content_check CHECK (length(btrim(content)) > 0)
);

CREATE INDEX document_chunks_document_idx ON document_chunks (document_id, chunk_index);

CREATE TABLE recordings (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    object_key TEXT NOT NULL UNIQUE,
    format VARCHAR(32) NOT NULL,
    sample_rate INTEGER NOT NULL,
    channels SMALLINT NOT NULL,
    bits_per_sample SMALLINT NOT NULL,
    recording_start_offset_ms BIGINT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,
    size_bytes BIGINT,
    status VARCHAR(16) NOT NULL,
    error_message TEXT,
    CONSTRAINT recordings_status_check CHECK (status IN ('RECORDING', 'UPLOADING', 'READY', 'FAILED')),
    CONSTRAINT recordings_audio_format_check CHECK (
        sample_rate > 0 AND channels > 0 AND bits_per_sample > 0
    ),
    CONSTRAINT recordings_offset_check CHECK (recording_start_offset_ms >= 0),
    CONSTRAINT recordings_duration_check CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT recordings_size_check CHECK (size_bytes IS NULL OR size_bytes >= 0),
    CONSTRAINT recordings_time_order_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX recordings_meeting_started_idx ON recordings (meeting_id, started_at DESC, id);

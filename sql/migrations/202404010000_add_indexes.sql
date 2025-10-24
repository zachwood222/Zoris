-- Example indexes to speed up common lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC);

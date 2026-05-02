-- Initialize PostgreSQL with proper password and authentication
-- This runs automatically when the database is first created

-- Ensure postgres user has password set
ALTER USER postgres WITH PASSWORD 'postgrespassword';

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE mtl_medusa TO postgres;

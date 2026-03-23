import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const runMigrations = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emsp_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(255) UNIQUE NOT NULL,
        party_id VARCHAR(3) NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_website VARCHAR(255),
        business_logo VARCHAR(255),
        version VARCHAR(10) NOT NULL DEFAULT '2.2.1',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        name VARCHAR(255),
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(2) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        time_zone VARCHAR(50),
        operator_name VARCHAR(255),
        charging_when_closed BOOLEAN DEFAULT FALSE,
        facilities JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add facilities column if missing
    await pool.query(`
      ALTER TABLE locations ADD COLUMN IF NOT EXISTS facilities JSONB
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tariff_id VARCHAR(255) NOT NULL UNIQUE,
        currency VARCHAR(3) NOT NULL,
        type VARCHAR(50) NOT NULL,
        display_text TEXT,
        min_price DECIMAL(10, 4),
        max_price DECIMAL(10, 4),
        start_date_time TIMESTAMP,
        end_date_time TIMESTAMP,
        elements JSONB NOT NULL DEFAULT '[]',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new tariff columns if missing
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS display_text TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS min_price DECIMAL(10, 4)`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS max_price DECIMAL(10, 4)`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS evses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        uid VARCHAR(255) NOT NULL,
        evse_id VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        floor_level VARCHAR(10),
        physical_reference VARCHAR(255),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evse_id UUID NOT NULL REFERENCES evses(id) ON DELETE CASCADE,
        connector_id VARCHAR(255) NOT NULL,
        standard VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL,
        power_type VARCHAR(50) NOT NULL,
        voltage INTEGER NOT NULL,
        amperage INTEGER NOT NULL,
        power_kw DECIMAL(6, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        tariff_id VARCHAR(255),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(evse_id, connector_id)
      )
    `);

    // Add tariff_id column if missing
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS tariff_id VARCHAR(255)`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL UNIQUE,
        location_id UUID NOT NULL REFERENCES locations(id),
        evse_id UUID NOT NULL REFERENCES evses(id),
        connector_id UUID NOT NULL REFERENCES connectors(id),
        auth_id VARCHAR(255) NOT NULL,
        auth_method VARCHAR(50) NOT NULL,
        start_date_time TIMESTAMP NOT NULL,
        end_date_time TIMESTAMP,
        kwh DECIMAL(10, 3) DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cdrs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cdr_id VARCHAR(255) NOT NULL UNIQUE,
        session_id UUID REFERENCES sessions(id),
        location_id UUID NOT NULL REFERENCES locations(id),
        evse_id UUID NOT NULL REFERENCES evses(id),
        connector_id UUID NOT NULL REFERENCES connectors(id),
        auth_id VARCHAR(255) NOT NULL,
        auth_method VARCHAR(50) NOT NULL,
        start_date_time TIMESTAMP NOT NULL,
        end_date_time TIMESTAMP NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        total_energy DECIMAL(10, 3) NOT NULL,
        total_time INTEGER NOT NULL,
        total_parking_time INTEGER,
        total_cost_excl_vat DECIMAL(10, 2),
        total_cost_incl_vat DECIMAL(10, 2),
        credit BOOLEAN DEFAULT FALSE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_uid VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        auth_id VARCHAR(255) NOT NULL,
        visual_number VARCHAR(255),
        issuer VARCHAR(255) NOT NULL,
        valid BOOLEAN DEFAULT TRUE,
        whitelist VARCHAR(50),
        language VARCHAR(5),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database migrations completed');
  } catch (err) {
    console.error('✗ Migration error:', err);
    throw err;
  }
};

export default pool;

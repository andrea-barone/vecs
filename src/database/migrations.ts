import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const runMigrations = async () => {
  try {
    // ========================================
    // OCPI REQUEST/RESPONSE LOGS
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocpi_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        direction VARCHAR(10) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path TEXT NOT NULL,
        query_params JSONB,
        request_headers JSONB,
        request_body JSONB,
        response_status INTEGER,
        response_headers JSONB,
        response_body JSONB,
        duration_ms INTEGER,
        emsp_token VARCHAR(255),
        company_id UUID,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON ocpi_logs(timestamp DESC)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_path ON ocpi_logs(path)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_emsp ON ocpi_logs(emsp_token)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_direction ON ocpi_logs(direction)`).catch(() => {});

    // ========================================
    // COMPANIES (Multi-tenancy)
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        party_id VARCHAR(3) NOT NULL,
        webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(country_code, party_id)
      )
    `);

    // ========================================
    // ADMIN USERS
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_super_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ========================================
    // PUSH LOGS (Outbound notifications)
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        emsp_id UUID,
        endpoint_type VARCHAR(50),
        object_type VARCHAR(50),
        object_id VARCHAR(255),
        method VARCHAR(10),
        url TEXT,
        request_headers JSONB,
        request_body JSONB,
        response_status INTEGER,
        response_body JSONB,
        success BOOLEAN,
        error TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_logs_created ON push_logs(created_at DESC)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_logs_emsp ON push_logs(emsp_id)`).catch(() => {});

    // ========================================
    // EMSP CREDENTIALS
    // ========================================
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
        country_code VARCHAR(2) NOT NULL DEFAULT 'DE',
        party_id VARCHAR(3) NOT NULL DEFAULT 'VEC',
        publish BOOLEAN NOT NULL DEFAULT TRUE,
        publish_allowed_to JSONB,
        type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        name VARCHAR(255),
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20),
        state VARCHAR(20),
        country VARCHAR(3) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        related_locations JSONB,
        directions JSONB,
        time_zone VARCHAR(255) NOT NULL DEFAULT 'Europe/Berlin',
        operator_name VARCHAR(255),
        operator_website VARCHAR(255),
        operator_logo VARCHAR(255),
        suboperator_name VARCHAR(255),
        suboperator_website VARCHAR(255),
        owner_name VARCHAR(255),
        owner_website VARCHAR(255),
        charging_when_closed BOOLEAN DEFAULT TRUE,
        facilities JSONB,
        opening_times JSONB,
        images JSONB,
        energy_mix JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing location columns (OCPI 2.2.1 compliance)
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS facilities JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'DE'`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS party_id VARCHAR(3) DEFAULT 'VEC'`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS publish BOOLEAN DEFAULT TRUE`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS publish_allowed_to JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS state VARCHAR(20)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS related_locations JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS directions JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS operator_website VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS operator_logo VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS suboperator_name VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS suboperator_website VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS owner_website VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS opening_times JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS images JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS energy_mix JSONB`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tariff_id VARCHAR(36) NOT NULL UNIQUE,
        country_code VARCHAR(2) NOT NULL DEFAULT 'DE',
        party_id VARCHAR(3) NOT NULL DEFAULT 'VEC',
        currency VARCHAR(3) NOT NULL,
        type VARCHAR(50),
        tariff_alt_text JSONB,
        tariff_alt_url VARCHAR(255),
        min_price JSONB,
        max_price JSONB,
        preauthorize_amount DECIMAL(10, 4),
        elements JSONB NOT NULL DEFAULT '[]',
        tax_included VARCHAR(20) NOT NULL DEFAULT 'YES',
        start_date_time TIMESTAMP,
        end_date_time TIMESTAMP,
        energy_mix JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing tariff columns (OCPI 2.2.1 compliance)
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'DE'`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS party_id VARCHAR(3) DEFAULT 'VEC'`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS tariff_alt_text JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS tariff_alt_url VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS preauthorize_amount DECIMAL(10, 4)`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS tax_included VARCHAR(20) DEFAULT 'YES'`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS energy_mix JSONB`).catch(() => {});
    // Convert min_price/max_price from DECIMAL to JSONB if needed
    await pool.query(`ALTER TABLE tariffs DROP COLUMN IF EXISTS display_text`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS evses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        uid VARCHAR(36) NOT NULL,
        evse_id VARCHAR(48),
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        status_schedule JSONB,
        capabilities JSONB,
        floor_level VARCHAR(4),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        physical_reference VARCHAR(16),
        directions JSONB,
        parking_restrictions JSONB,
        images JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(location_id, uid)
      )
    `);

    // Add missing EVSE columns
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS status_schedule JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS capabilities JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8)`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS directions JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS parking_restrictions JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE evses ADD COLUMN IF NOT EXISTS images JSONB`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evse_id UUID NOT NULL REFERENCES evses(id) ON DELETE CASCADE,
        connector_id VARCHAR(36) NOT NULL,
        standard VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL,
        power_type VARCHAR(20) NOT NULL,
        max_voltage INTEGER NOT NULL,
        max_amperage INTEGER NOT NULL,
        max_electric_power INTEGER,
        tariff_ids JSONB,
        terms_and_conditions VARCHAR(255),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(evse_id, connector_id)
      )
    `);

    // Rename voltage/amperage to max_voltage/max_amperage and add new columns
    await pool.query(`ALTER TABLE connectors RENAME COLUMN voltage TO max_voltage`).catch(() => {});
    await pool.query(`ALTER TABLE connectors RENAME COLUMN amperage TO max_amperage`).catch(() => {});
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS max_voltage INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS max_amperage INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS max_electric_power INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS tariff_ids JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS terms_and_conditions VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE connectors DROP COLUMN IF EXISTS status`).catch(() => {});
    await pool.query(`ALTER TABLE connectors DROP COLUMN IF EXISTS power_kw`).catch(() => {});

    // Add tariff_id column if missing
    await pool.query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS tariff_id VARCHAR(255)`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code VARCHAR(2) NOT NULL DEFAULT 'DE',
        party_id VARCHAR(3) NOT NULL DEFAULT 'VEC',
        session_id VARCHAR(255) NOT NULL UNIQUE,
        location_id UUID NOT NULL REFERENCES locations(id),
        evse_id UUID NOT NULL REFERENCES evses(id),
        connector_id UUID NOT NULL REFERENCES connectors(id),
        cdr_token JSONB,
        auth_method VARCHAR(50) NOT NULL,
        authorization_reference VARCHAR(255),
        start_date_time TIMESTAMP NOT NULL,
        end_date_time TIMESTAMP,
        kwh DECIMAL(10, 3) DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        total_cost JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing session columns (OCPI 2.2.1 compliance)
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'DE'`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS party_id VARCHAR(3) DEFAULT 'VEC'`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cdr_token JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS authorization_reference VARCHAR(255)`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cdrs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code VARCHAR(2) NOT NULL DEFAULT 'DE',
        party_id VARCHAR(3) NOT NULL DEFAULT 'VEC',
        cdr_id VARCHAR(255) NOT NULL UNIQUE,
        session_id UUID REFERENCES sessions(id),
        cdr_token JSONB NOT NULL,
        auth_method VARCHAR(50) NOT NULL,
        authorization_reference VARCHAR(255),
        cdr_location JSONB NOT NULL,
        meter_id VARCHAR(255),
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        tariffs JSONB DEFAULT '[]',
        charging_periods JSONB DEFAULT '[]',
        signed_data JSONB,
        total_cost JSONB NOT NULL,
        total_fixed_cost JSONB,
        total_energy DECIMAL(10, 3) NOT NULL,
        total_energy_cost JSONB,
        total_time DECIMAL(10, 4) NOT NULL,
        total_time_cost JSONB,
        total_parking_time DECIMAL(10, 4),
        total_parking_cost JSONB,
        total_reservation_cost JSONB,
        remark TEXT,
        invoice_reference_id VARCHAR(255),
        credit BOOLEAN DEFAULT FALSE,
        credit_reference_id VARCHAR(255),
        home_charging_compensation BOOLEAN,
        start_date_time TIMESTAMP NOT NULL,
        end_date_time TIMESTAMP NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing CDR columns (OCPI 2.2.1 compliance)
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'DE'`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS party_id VARCHAR(3) DEFAULT 'VEC'`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS cdr_token JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS authorization_reference VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS cdr_location JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS meter_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_fixed_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_energy_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_time_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_parking_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS total_reservation_cost JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS invoice_reference_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS credit_reference_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS home_charging_compensation BOOLEAN`).catch(() => {});
    // Drop old columns that were replaced
    await pool.query(`ALTER TABLE cdrs DROP COLUMN IF EXISTS location_id`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs DROP COLUMN IF EXISTS evse_id`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs DROP COLUMN IF EXISTS connector_id`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs DROP COLUMN IF EXISTS auth_id`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code VARCHAR(2) NOT NULL DEFAULT 'DE',
        party_id VARCHAR(3) NOT NULL DEFAULT 'VEC',
        token_uid VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        contract_id VARCHAR(255) NOT NULL,
        visual_number VARCHAR(255),
        issuer VARCHAR(255) NOT NULL,
        group_id VARCHAR(255),
        valid BOOLEAN DEFAULT TRUE,
        whitelist VARCHAR(50) NOT NULL DEFAULT 'ALLOWED',
        language VARCHAR(2),
        default_profile_type VARCHAR(20),
        energy_contract JSONB,
        company_id UUID,
        emsp_id UUID,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing token columns (OCPI 2.2.1 compliance)
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'DE'`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS party_id VARCHAR(3) DEFAULT 'VEC'`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS contract_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS group_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS default_profile_type VARCHAR(20)`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS energy_contract JSONB`).catch(() => {});
    // Migrate auth_id to contract_id if contract_id is null
    await pool.query(`UPDATE tokens SET contract_id = auth_id WHERE contract_id IS NULL`).catch(() => {});

    // Add company_id to existing tables if missing
    await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE emsp_credentials ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE emsp_credentials ADD COLUMN IF NOT EXISTS endpoints JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS company_id UUID`).catch(() => {});
    await pool.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS emsp_id UUID`).catch(() => {});

    // Add charging_periods to sessions
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS charging_periods JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 4)`).catch(() => {});
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meter_id VARCHAR(255)`).catch(() => {});

    // Add CDR fields
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS charging_periods JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS tariffs JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS signed_data TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE cdrs ADD COLUMN IF NOT EXISTS remark TEXT`).catch(() => {});

    console.log('✓ Database migrations completed');
  } catch (err) {
    console.error('✗ Migration error:', err);
    throw err;
  }
};

export default pool;

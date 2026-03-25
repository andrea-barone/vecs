import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

// OCPI 2.2.1 Token Types
export type TokenType = 'AD_HOC_USER' | 'APP_USER' | 'OTHER' | 'RFID';
export type WhitelistType = 'ALWAYS' | 'ALLOWED' | 'ALLOWED_OFFLINE' | 'NEVER';
export type ProfileType = 'CHEAP' | 'FAST' | 'GREEN' | 'REGULAR';

export interface EnergyContract {
  supplier_name: string;
  contract_id?: string;
}

export interface Token {
  country_code: string;
  party_id: string;
  uid: string;
  type: TokenType;
  contract_id: string;
  visual_number?: string;
  issuer: string;
  group_id?: string;
  valid: boolean;
  whitelist: WhitelistType;
  language?: string;
  default_profile_type?: ProfileType;
  energy_contract?: EnergyContract;
  last_updated: Date;
}

interface CreateTokenInput {
  country_code?: string;
  party_id?: string;
  token_uid: string;
  type: TokenType;
  contract_id: string;
  visual_number?: string;
  issuer: string;
  group_id?: string;
  valid?: boolean;
  whitelist?: WhitelistType;
  language?: string;
  default_profile_type?: ProfileType;
  energy_contract?: EnergyContract;
  emsp_id?: string;
  company_id?: string;
}

interface UpdateTokenInput {
  type?: TokenType;
  contract_id?: string;
  visual_number?: string;
  issuer?: string;
  group_id?: string;
  valid?: boolean;
  whitelist?: WhitelistType;
  language?: string;
  default_profile_type?: ProfileType;
  energy_contract?: EnergyContract;
}

class TokensService {
  /**
   * Create a new token (OCPI 2.2.1 compliant)
   */
  async createToken(input: CreateTokenInput): Promise<Token> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO tokens (
        id, country_code, party_id, token_uid, type, contract_id,
        visual_number, issuer, group_id, valid, whitelist, language,
        default_profile_type, energy_contract, emsp_id, company_id, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        dbId,
        input.country_code || 'DE',
        input.party_id || 'VEC',
        input.token_uid,
        input.type,
        input.contract_id,
        input.visual_number || null,
        input.issuer,
        input.group_id || null,
        input.valid !== false,
        input.whitelist || 'ALLOWED',
        input.language || null,
        input.default_profile_type || null,
        input.energy_contract ? JSON.stringify(input.energy_contract) : null,
        input.emsp_id || null,
        input.company_id || null,
        now,
      ]
    );

    return this.rowToToken(result.rows[0]);
  }

  /**
   * Get a token by UID
   */
  async getToken(tokenUid: string): Promise<Token | null> {
    const result = await pool.query(
      `SELECT * FROM tokens WHERE token_uid = $1`,
      [tokenUid]
    );

    if (result.rows.length === 0) return null;
    return this.rowToToken(result.rows[0]);
  }

  /**
   * Get token by country_code, party_id, uid (OCPI standard lookup)
   */
  async getTokenByOcpiId(countryCode: string, partyId: string, tokenUid: string): Promise<Token | null> {
    const result = await pool.query(
      `SELECT * FROM tokens WHERE country_code = $1 AND party_id = $2 AND token_uid = $3`,
      [countryCode, partyId, tokenUid]
    );

    if (result.rows.length === 0) return null;
    return this.rowToToken(result.rows[0]);
  }

  /**
   * List all tokens with optional filters
   */
  async listTokens(filters: {
    type?: TokenType;
    issuer?: string;
    valid?: boolean;
    emsp_id?: string;
    country_code?: string;
    party_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tokens: Token[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }
    if (filters.issuer) {
      conditions.push(`issuer = $${paramIndex++}`);
      values.push(filters.issuer);
    }
    if (filters.valid !== undefined) {
      conditions.push(`valid = $${paramIndex++}`);
      values.push(filters.valid);
    }
    if (filters.emsp_id) {
      conditions.push(`emsp_id = $${paramIndex++}`);
      values.push(filters.emsp_id);
    }
    if (filters.country_code) {
      conditions.push(`country_code = $${paramIndex++}`);
      values.push(filters.country_code);
    }
    if (filters.party_id) {
      conditions.push(`party_id = $${paramIndex++}`);
      values.push(filters.party_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tokens ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM tokens ${whereClause} ORDER BY last_updated DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      tokens: result.rows.map(row => this.rowToToken(row)),
      total,
    };
  }

  /**
   * Update a token
   */
  async updateToken(tokenUid: string, input: UpdateTokenInput): Promise<Token | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(input.type);
    }
    if (input.contract_id !== undefined) {
      updates.push(`contract_id = $${paramIndex++}`);
      values.push(input.contract_id);
    }
    if (input.visual_number !== undefined) {
      updates.push(`visual_number = $${paramIndex++}`);
      values.push(input.visual_number);
    }
    if (input.issuer !== undefined) {
      updates.push(`issuer = $${paramIndex++}`);
      values.push(input.issuer);
    }
    if (input.group_id !== undefined) {
      updates.push(`group_id = $${paramIndex++}`);
      values.push(input.group_id);
    }
    if (input.valid !== undefined) {
      updates.push(`valid = $${paramIndex++}`);
      values.push(input.valid);
    }
    if (input.whitelist !== undefined) {
      updates.push(`whitelist = $${paramIndex++}`);
      values.push(input.whitelist);
    }
    if (input.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(input.language);
    }
    if (input.default_profile_type !== undefined) {
      updates.push(`default_profile_type = $${paramIndex++}`);
      values.push(input.default_profile_type);
    }
    if (input.energy_contract !== undefined) {
      updates.push(`energy_contract = $${paramIndex++}`);
      values.push(JSON.stringify(input.energy_contract));
    }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(tokenUid);

    const result = await pool.query(
      `UPDATE tokens SET ${updates.join(', ')} WHERE token_uid = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.rowToToken(result.rows[0]);
  }

  /**
   * Delete a token
   */
  async deleteToken(tokenUid: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM tokens WHERE token_uid = $1 RETURNING *`,
      [tokenUid]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Authorize a token (check if it's valid for charging)
   */
  async authorizeToken(tokenUid: string): Promise<{
    allowed: boolean;
    token?: Token;
    info?: {
      allowed: 'ALLOWED' | 'BLOCKED' | 'EXPIRED' | 'NO_CREDIT' | 'NOT_ALLOWED';
    };
  }> {
    const token = await this.getToken(tokenUid);

    if (!token) {
      return {
        allowed: false,
        info: { allowed: 'NOT_ALLOWED' },
      };
    }

    if (!token.valid) {
      return {
        allowed: false,
        token,
        info: { allowed: 'BLOCKED' },
      };
    }

    // Check whitelist status
    if (token.whitelist === 'NEVER') {
      return {
        allowed: false,
        token,
        info: { allowed: 'NOT_ALLOWED' },
      };
    }

    return {
      allowed: true,
      token,
      info: { allowed: 'ALLOWED' },
    };
  }

  /**
   * Create sample tokens for testing (OCPI 2.2.1 compliant)
   */
  async createSampleTokens(): Promise<Token[]> {
    const sampleTokens: CreateTokenInput[] = [
      {
        country_code: 'DE',
        party_id: 'VEC',
        token_uid: 'RFID-001',
        type: 'RFID',
        contract_id: 'DE-VEC-C001',
        visual_number: '****1234',
        issuer: 'VECS Test',
        valid: true,
        whitelist: 'ALWAYS',
      },
      {
        country_code: 'DE',
        party_id: 'VEC',
        token_uid: 'RFID-002',
        type: 'RFID',
        contract_id: 'DE-VEC-C002',
        visual_number: '****5678',
        issuer: 'VECS Test',
        valid: true,
        whitelist: 'ALWAYS',
      },
      {
        country_code: 'DE',
        party_id: 'VEC',
        token_uid: 'APP-001',
        type: 'APP_USER',
        contract_id: 'DE-VEC-A001',
        issuer: 'VECS Test App',
        valid: true,
        whitelist: 'ALLOWED',
        default_profile_type: 'REGULAR',
      },
      {
        country_code: 'DE',
        party_id: 'VEC',
        token_uid: 'BLOCKED-001',
        type: 'RFID',
        contract_id: 'DE-VEC-B001',
        issuer: 'VECS Test',
        valid: false, // Blocked token for testing
        whitelist: 'NEVER',
      },
    ];

    const created: Token[] = [];
    for (const tokenInput of sampleTokens) {
      try {
        const existing = await this.getToken(tokenInput.token_uid);
        if (!existing) {
          const token = await this.createToken(tokenInput);
          created.push(token);
        }
      } catch (err) {
        // Token might already exist
      }
    }

    return created;
  }

  private parseJson(value: any): any {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private rowToToken(row: any): Token {
    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      uid: row.token_uid,
      type: row.type,
      contract_id: row.contract_id || row.auth_id, // Fallback for migration
      visual_number: row.visual_number || undefined,
      issuer: row.issuer,
      group_id: row.group_id || undefined,
      valid: row.valid,
      whitelist: row.whitelist || 'ALLOWED',
      language: row.language || undefined,
      default_profile_type: row.default_profile_type || undefined,
      energy_contract: this.parseJson(row.energy_contract),
      last_updated: row.last_updated,
    };
  }
}

export const tokensService = new TokensService();

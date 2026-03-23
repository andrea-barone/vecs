import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { Location, EVSE, Connector } from '../types/ocpi';

interface CreateLocationInput {
  location_id: string;
  type?: string;
  name?: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  operator_name?: string;
  time_zone?: string;
  charging_when_closed?: boolean;
  facilities?: string[];
}

interface UpdateLocationInput {
  type?: string;
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  operator_name?: string;
  time_zone?: string;
  charging_when_closed?: boolean;
  facilities?: string[];
}

interface CreateEVSEInput {
  evse_id: string;
  uid?: string;
  status?: string;
  floor_level?: string;
  physical_reference?: string;
  parking_restrictions?: string[];
  directions?: string;
}

interface UpdateEVSEInput {
  status?: string;
  floor_level?: string;
  physical_reference?: string;
  parking_restrictions?: string[];
  directions?: string;
}

interface CreateConnectorInput {
  connector_id: string;
  standard: string;
  format: string;
  power_type: string;
  voltage: number;
  amperage: number;
  power_kw?: number;
  tariff_id?: string;
}

interface UpdateConnectorInput {
  standard?: string;
  format?: string;
  power_type?: string;
  voltage?: number;
  amperage?: number;
  power_kw?: number;
  status?: string;
  tariff_id?: string;
}

export class LocationsService {
  // ============ LOCATIONS ============
  
  async createLocation(input: CreateLocationInput): Promise<Location> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO locations (
        id, location_id, type, name, address, city, postal_code,
        country, latitude, longitude, operator_name, time_zone,
        charging_when_closed, facilities, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        dbId,
        input.location_id,
        input.type || 'OTHER',
        input.name || null,
        input.address,
        input.city,
        input.postal_code,
        input.country,
        input.latitude,
        input.longitude,
        input.operator_name || null,
        input.time_zone || null,
        input.charging_when_closed || false,
        input.facilities ? JSON.stringify(input.facilities) : null,
        now,
      ]
    );

    return this.rowToLocation(result.rows[0]);
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<Location | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(input.type); }
    if (input.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(input.name); }
    if (input.address !== undefined) { updates.push(`address = $${paramIndex++}`); values.push(input.address); }
    if (input.city !== undefined) { updates.push(`city = $${paramIndex++}`); values.push(input.city); }
    if (input.postal_code !== undefined) { updates.push(`postal_code = $${paramIndex++}`); values.push(input.postal_code); }
    if (input.country !== undefined) { updates.push(`country = $${paramIndex++}`); values.push(input.country); }
    if (input.latitude !== undefined) { updates.push(`latitude = $${paramIndex++}`); values.push(input.latitude); }
    if (input.longitude !== undefined) { updates.push(`longitude = $${paramIndex++}`); values.push(input.longitude); }
    if (input.operator_name !== undefined) { updates.push(`operator_name = $${paramIndex++}`); values.push(input.operator_name); }
    if (input.time_zone !== undefined) { updates.push(`time_zone = $${paramIndex++}`); values.push(input.time_zone); }
    if (input.charging_when_closed !== undefined) { updates.push(`charging_when_closed = $${paramIndex++}`); values.push(input.charging_when_closed); }
    if (input.facilities !== undefined) { updates.push(`facilities = $${paramIndex++}`); values.push(JSON.stringify(input.facilities)); }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(locationId);

    const result = await pool.query(
      `UPDATE locations SET ${updates.join(', ')} WHERE location_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const location = this.rowToLocation(result.rows[0]);
    location.evses = await this.getEVSEsByLocation(result.rows[0].id);
    return location;
  }

  async deleteLocation(locationId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM locations WHERE location_id = $1 RETURNING *`,
      [locationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getLocation(locationId: string): Promise<Location | null> {
    const result = await pool.query(
      `SELECT * FROM locations WHERE location_id = $1`,
      [locationId]
    );

    if (result.rows.length === 0) return null;

    const location = this.rowToLocation(result.rows[0]);
    location.evses = await this.getEVSEsByLocation(result.rows[0].id);
    return location;
  }

  async listLocations(): Promise<Location[]> {
    const result = await pool.query(`SELECT * FROM locations ORDER BY created_at DESC`);
    const locations: Location[] = [];

    for (const row of result.rows) {
      const location = this.rowToLocation(row);
      location.evses = await this.getEVSEsByLocation(row.id);
      locations.push(location);
    }

    return locations;
  }

  // ============ EVSEs ============

  async addEVSE(locationId: string, input: CreateEVSEInput): Promise<EVSE> {
    const locResult = await pool.query(
      `SELECT id FROM locations WHERE location_id = $1`,
      [locationId]
    );

    if (locResult.rows.length === 0) {
      throw new Error(`Location ${locationId} not found`);
    }

    const dbLocationId = locResult.rows[0].id;
    const dbId = uuidv4();

    const result = await pool.query(
      `INSERT INTO evses (id, location_id, uid, evse_id, status, floor_level, physical_reference, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dbId,
        dbLocationId,
        input.uid || input.evse_id,
        input.evse_id,
        input.status || 'AVAILABLE',
        input.floor_level || null,
        input.physical_reference || null,
        new Date(),
      ]
    );

    const evse = this.rowToEVSE(result.rows[0]);
    evse.connectors = [];
    return evse;
  }

  async updateEVSE(evseId: string, input: UpdateEVSEInput): Promise<EVSE | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(input.status); }
    if (input.floor_level !== undefined) { updates.push(`floor_level = $${paramIndex++}`); values.push(input.floor_level); }
    if (input.physical_reference !== undefined) { updates.push(`physical_reference = $${paramIndex++}`); values.push(input.physical_reference); }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(evseId);

    const result = await pool.query(
      `UPDATE evses SET ${updates.join(', ')} WHERE evse_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const evse = this.rowToEVSE(result.rows[0]);
    const connResult = await pool.query(`SELECT * FROM connectors WHERE evse_id = $1`, [result.rows[0].id]);
    evse.connectors = connResult.rows.map((c: any) => this.rowToConnector(c));
    return evse;
  }

  async deleteEVSE(evseId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM evses WHERE evse_id = $1 RETURNING *`,
      [evseId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============ CONNECTORS ============

  async addConnector(evseId: string, input: CreateConnectorInput): Promise<Connector> {
    const evseResult = await pool.query(
      `SELECT id FROM evses WHERE evse_id = $1`,
      [evseId]
    );

    if (evseResult.rows.length === 0) {
      throw new Error(`EVSE ${evseId} not found`);
    }

    const dbEvseId = evseResult.rows[0].id;
    const dbId = uuidv4();

    const result = await pool.query(
      `INSERT INTO connectors (
        id, evse_id, connector_id, standard, format, power_type,
        voltage, amperage, power_kw, status, tariff_id, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        dbId,
        dbEvseId,
        input.connector_id,
        input.standard,
        input.format,
        input.power_type,
        input.voltage,
        input.amperage,
        input.power_kw || null,
        'AVAILABLE',
        input.tariff_id || null,
        new Date(),
      ]
    );

    return this.rowToConnector(result.rows[0]);
  }

  async updateConnector(evseId: string, connectorId: string, input: UpdateConnectorInput): Promise<Connector | null> {
    // Get the EVSE DB ID first
    const evseResult = await pool.query(`SELECT id FROM evses WHERE evse_id = $1`, [evseId]);
    if (evseResult.rows.length === 0) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.standard !== undefined) { updates.push(`standard = $${paramIndex++}`); values.push(input.standard); }
    if (input.format !== undefined) { updates.push(`format = $${paramIndex++}`); values.push(input.format); }
    if (input.power_type !== undefined) { updates.push(`power_type = $${paramIndex++}`); values.push(input.power_type); }
    if (input.voltage !== undefined) { updates.push(`voltage = $${paramIndex++}`); values.push(input.voltage); }
    if (input.amperage !== undefined) { updates.push(`amperage = $${paramIndex++}`); values.push(input.amperage); }
    if (input.power_kw !== undefined) { updates.push(`power_kw = $${paramIndex++}`); values.push(input.power_kw); }
    if (input.status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(input.status); }
    if (input.tariff_id !== undefined) { updates.push(`tariff_id = $${paramIndex++}`); values.push(input.tariff_id || null); }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(evseResult.rows[0].id);
    values.push(connectorId);

    const result = await pool.query(
      `UPDATE connectors SET ${updates.join(', ')} 
       WHERE evse_id = $${paramIndex} AND connector_id = $${paramIndex + 1} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.rowToConnector(result.rows[0]);
  }

  async deleteConnector(evseId: string, connectorId: string): Promise<boolean> {
    const evseResult = await pool.query(`SELECT id FROM evses WHERE evse_id = $1`, [evseId]);
    if (evseResult.rows.length === 0) return false;

    const result = await pool.query(
      `DELETE FROM connectors WHERE evse_id = $1 AND connector_id = $2 RETURNING *`,
      [evseResult.rows[0].id, connectorId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============ HELPERS ============

  private async getEVSEsByLocation(locationDbId: string): Promise<EVSE[]> {
    const result = await pool.query(
      `SELECT * FROM evses WHERE location_id = $1`,
      [locationDbId]
    );

    const evses: EVSE[] = [];
    for (const row of result.rows) {
      const evse = this.rowToEVSE(row);
      const connResult = await pool.query(
        `SELECT c.*, t.tariff_id as tariff_ref FROM connectors c 
         LEFT JOIN tariffs t ON c.tariff_id = t.tariff_id
         WHERE c.evse_id = $1`,
        [row.id]
      );
      evse.connectors = connResult.rows.map((c: any) => this.rowToConnector(c));
      evses.push(evse);
    }

    return evses;
  }

  private rowToLocation(row: any): Location {
    return {
      id: row.location_id,
      type: row.type,
      name: row.name,
      address: row.address,
      city: row.city,
      postal_code: row.postal_code,
      country: row.country,
      coordinates: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
      },
      evses: [],
      operator: row.operator_name ? { name: row.operator_name } : undefined,
      time_zone: row.time_zone,
      charging_when_closed: row.charging_when_closed,
      facilities: row.facilities ? (typeof row.facilities === 'string' ? JSON.parse(row.facilities) : row.facilities) : undefined,
      last_updated: row.last_updated,
    };
  }

  private rowToEVSE(row: any): EVSE {
    return {
      uid: row.uid,
      evse_id: row.evse_id,
      status: row.status,
      connectors: [],
      floor_level: row.floor_level,
      physical_reference: row.physical_reference,
      last_updated: row.last_updated,
    };
  }

  private rowToConnector(row: any): Connector & { tariff_id?: string } {
    return {
      id: row.connector_id,
      standard: row.standard,
      format: row.format,
      power_type: row.power_type,
      voltage: row.voltage,
      amperage: row.amperage,
      power_kw: row.power_kw ? parseFloat(row.power_kw) : undefined,
      status: row.status,
      tariff_id: row.tariff_id || row.tariff_ref,
      last_updated: row.last_updated,
    };
  }
}

export const locationsService = new LocationsService();

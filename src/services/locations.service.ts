import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { Location, EVSE, Connector, GeoLocation } from '../types/ocpi';

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
}

interface CreateEVSEInput {
  evse_id: string;
  uid?: string;
  status?: string;
}

interface CreateConnectorInput {
  connector_id: string;
  standard: string;
  format: string;
  power_type: string;
  voltage: number;
  amperage: number;
  power_kw?: number;
}

export class LocationsService {
  async createLocation(input: CreateLocationInput): Promise<Location> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO locations (
        id, location_id, type, name, address, city, postal_code,
        country, latitude, longitude, operator_name, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        now,
      ]
    );

    const row = result.rows[0];
    return this.rowToLocation(row);
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
    const result = await pool.query(`SELECT * FROM locations`);
    const locations: Location[] = [];

    for (const row of result.rows) {
      const location = this.rowToLocation(row);
      location.evses = await this.getEVSEsByLocation(row.id);
      locations.push(location);
    }

    return locations;
  }

  async addEVSE(locationId: string, input: CreateEVSEInput): Promise<EVSE> {
    // Get location DB ID
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
      `INSERT INTO evses (id, location_id, uid, evse_id, status, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dbId,
        dbLocationId,
        input.uid || input.evse_id,
        input.evse_id,
        input.status || 'AVAILABLE',
        new Date(),
      ]
    );

    const evse = this.rowToEVSE(result.rows[0]);
    return evse;
  }

  async addConnector(evseId: string, input: CreateConnectorInput): Promise<Connector> {
    // Get EVSE DB ID
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
        voltage, amperage, power_kw, status, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        new Date(),
      ]
    );

    return this.rowToConnector(result.rows[0]);
  }

  private async getEVSEsByLocation(locationDbId: string): Promise<EVSE[]> {
    const result = await pool.query(
      `SELECT * FROM evses WHERE location_id = $1`,
      [locationDbId]
    );

    const evses: EVSE[] = [];
    for (const row of result.rows) {
      const evse = this.rowToEVSE(row);
      const connResult = await pool.query(
        `SELECT * FROM connectors WHERE evse_id = $1`,
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

  private rowToConnector(row: any): Connector {
    return {
      id: row.connector_id,
      standard: row.standard,
      format: row.format,
      power_type: row.power_type,
      voltage: row.voltage,
      amperage: row.amperage,
      power_kw: row.power_kw ? parseFloat(row.power_kw) : undefined,
      status: row.status,
      last_updated: row.last_updated,
    };
  }
}

export const locationsService = new LocationsService();

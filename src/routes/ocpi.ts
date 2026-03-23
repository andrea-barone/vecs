import express, { Router, Response } from 'express';
import { credentialsService } from '../services/credentials.service';
import { locationsService } from '../services/locations.service';
import { ocpiAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper for OCPI response format
const ocpiResponse = (data: any, statusCode: number, message: string, res: Response) => {
  res.status(statusCode === 1000 ? 200 : statusCode >= 2000 ? 400 : 200).json({
    data,
    status_code: statusCode,
    status_message: message,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// CREDENTIALS ENDPOINTS
// ========================================

/**
 * POST /ocpi/2.2.1/credentials
 * Register new eMSP - returns credentials
 */
router.post('/credentials', async (req: AuthRequest, res: Response) => {
  try {
    const { party_id, country_code, business_details } = req.body;

    if (!party_id || !country_code || !business_details?.name) {
      return ocpiResponse(
        null,
        3000,
        'Missing required fields: party_id, country_code, business_details.name',
        res
      );
    }

    const credentials = await credentialsService.createCredentials(
      party_id,
      country_code,
      business_details
    );

    ocpiResponse(credentials, 1000, 'Credentials created successfully', res);
  } catch (err) {
    console.error('Error creating credentials:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

/**
 * GET /ocpi/2.2.1/credentials
 * Get current credentials (requires token)
 */
router.get('/credentials', ocpiAuth, async (req: AuthRequest, res: Response) => {
  try {
    const credentials = await credentialsService.getCredentials(req.token!);

    if (!credentials) {
      return ocpiResponse(null, 2004, 'Credentials not found', res);
    }

    ocpiResponse(credentials, 1000, 'Credentials retrieved successfully', res);
  } catch (err) {
    console.error('Error getting credentials:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// LOCATIONS ENDPOINTS
// ========================================

/**
 * GET /ocpi/2.2.1/locations
 * List all locations (no auth required for admin access)
 */
router.get('/locations', async (req: AuthRequest, res: Response) => {
  try {
    const locations = await locationsService.listLocations();
    ocpiResponse(locations, 1000, 'Locations retrieved successfully', res);
  } catch (err) {
    console.error('Error listing locations:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

/**
 * GET /ocpi/2.2.1/locations/:location_id
 * Get specific location (no auth required for admin access)
 */
router.get('/locations/:location_id', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) 
      ? req.params.location_id[0] 
      : req.params.location_id;
    const location = await locationsService.getLocation(location_id);

    if (!location) {
      return ocpiResponse(null, 2004, `Location ${location_id} not found`, res);
    }

    ocpiResponse(location, 1000, 'Location retrieved successfully', res);
  } catch (err) {
    console.error('Error getting location:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

/**
 * POST /ocpi/2.2.1/locations
 * Create new location (admin API)
 */
router.post('/locations', async (req: AuthRequest, res: Response) => {
  try {
    const {
      location_id,
      type,
      name,
      address,
      city,
      postal_code,
      country,
      latitude,
      longitude,
      operator_name,
    } = req.body;

    if (!location_id || !address || !city || !postal_code || !country) {
      return ocpiResponse(
        null,
        3000,
        'Missing required fields',
        res
      );
    }

    if (latitude === undefined || longitude === undefined) {
      return ocpiResponse(
        null,
        3000,
        'Missing required fields: latitude, longitude',
        res
      );
    }

    const location = await locationsService.createLocation({
      location_id,
      type,
      name,
      address,
      city,
      postal_code,
      country,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      operator_name,
    });

    ocpiResponse(location, 1001, 'Location created successfully', res);
  } catch (err: any) {
    console.error('Error creating location:', err);
    if (err.message.includes('duplicate key')) {
      return ocpiResponse(null, 3002, 'Location already exists', res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

/**
 * POST /ocpi/2.2.1/locations/:location_id/evses
 * Add EVSE to location
 */
router.post('/locations/:location_id/evses', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) 
      ? req.params.location_id[0] 
      : req.params.location_id;
    const { evse_id, uid, status } = req.body;

    if (!evse_id) {
      return ocpiResponse(null, 3000, 'Missing required field: evse_id', res);
    }

    const evse = await locationsService.addEVSE(location_id, {
      evse_id,
      uid,
      status,
    });

    ocpiResponse(evse, 1001, 'EVSE created successfully', res);
  } catch (err: any) {
    console.error('Error adding EVSE:', err);
    if (err.message.includes('not found')) {
      return ocpiResponse(null, 2004, err.message, res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

/**
 * POST /ocpi/2.2.1/locations/:location_id/evses/:evse_id/connectors
 * Add connector to EVSE
 */
router.post(
  '/locations/:location_id/evses/:evse_id/connectors',
  async (req: AuthRequest, res: Response) => {
    try {
      const evse_id = Array.isArray(req.params.evse_id) 
        ? req.params.evse_id[0] 
        : req.params.evse_id;
      const { connector_id, standard, format, power_type, voltage, amperage, power_kw } =
        req.body;

      if (!connector_id || !standard || !format || !power_type || !voltage || !amperage) {
        return ocpiResponse(
          null,
          3000,
          'Missing required fields: connector_id, standard, format, power_type, voltage, amperage',
          res
        );
      }

      const connector = await locationsService.addConnector(evse_id, {
        connector_id,
        standard,
        format,
        power_type,
        voltage: parseInt(voltage),
        amperage: parseInt(amperage),
        power_kw,
      });

      ocpiResponse(connector, 1001, 'Connector created successfully', res);
    } catch (err: any) {
      console.error('Error adding connector:', err);
      if (err.message.includes('not found')) {
        return ocpiResponse(null, 2004, err.message, res);
      }
      ocpiResponse(null, 2000, 'Internal server error', res);
    }
  }
);

export default router;

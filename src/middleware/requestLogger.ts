import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

export interface LoggedRequest extends Request {
  logId?: string;
  startTime?: number;
}

/**
 * Middleware to log all OCPI requests and responses to the database.
 * This is critical for debugging eMSP integrations.
 */
export const requestLogger = async (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
) => {
  // Only log OCPI endpoints
  if (!req.path.startsWith('/ocpi/')) {
    return next();
  }

  const logId = uuidv4();
  const startTime = Date.now();
  req.logId = logId;
  req.startTime = startTime;

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const emspToken = authHeader?.startsWith('Token ') ? authHeader.substring(6) : null;

  // Capture original response methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody: any = null;
  let responseCaptured = false;

  // Override json to capture response
  res.json = function (body: any) {
    if (!responseCaptured) {
      responseBody = body;
      responseCaptured = true;
    }
    return originalJson(body);
  };

  // Override send to capture response
  res.send = function (body: any) {
    if (!responseCaptured) {
      try {
        responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        responseBody = { raw: body?.toString() };
      }
      responseCaptured = true;
    }
    return originalSend(body);
  };

  // Log after response is sent
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    try {
      // Sanitize headers (remove sensitive data for display but keep auth token reference)
      const sanitizedRequestHeaders = { ...req.headers };
      if (sanitizedRequestHeaders.authorization) {
        sanitizedRequestHeaders.authorization = '[REDACTED]';
      }

      const sanitizedResponseHeaders: Record<string, string> = {};
      res.getHeaderNames().forEach(name => {
        sanitizedResponseHeaders[name] = res.getHeader(name)?.toString() || '';
      });

      await pool.query(
        `INSERT INTO ocpi_logs (
          id, timestamp, direction, method, path, query_params,
          request_headers, request_body, response_status, response_headers,
          response_body, duration_ms, emsp_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          logId,
          new Date(),
          'INBOUND',
          req.method,
          req.path,
          Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null,
          JSON.stringify(sanitizedRequestHeaders),
          req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null,
          res.statusCode,
          JSON.stringify(sanitizedResponseHeaders),
          responseBody ? JSON.stringify(responseBody) : null,
          duration,
          emspToken,
        ]
      );
    } catch (err) {
      console.error('Failed to log request:', err);
    }
  });

  next();
};

/**
 * Log an outbound request (push notification to eMSP)
 */
export const logOutboundRequest = async (params: {
  emspId?: string;
  endpointType: string;
  objectType?: string;
  objectId?: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: any;
  success: boolean;
  error?: string;
  durationMs?: number;
}): Promise<string> => {
  const id = uuidv4();
  
  try {
    await pool.query(
      `INSERT INTO push_logs (
        id, emsp_id, endpoint_type, object_type, object_id, method, url,
        request_headers, request_body, response_status, response_body,
        success, error, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        params.emspId || null,
        params.endpointType,
        params.objectType || null,
        params.objectId || null,
        params.method,
        params.url,
        params.requestHeaders ? JSON.stringify(params.requestHeaders) : null,
        params.requestBody ? JSON.stringify(params.requestBody) : null,
        params.responseStatus || null,
        params.responseBody ? JSON.stringify(params.responseBody) : null,
        params.success,
        params.error || null,
        params.durationMs || null,
      ]
    );
  } catch (err) {
    console.error('Failed to log outbound request:', err);
  }

  return id;
};

export default requestLogger;

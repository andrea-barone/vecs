import pool from '../database/migrations';

export interface LogEntry {
  id: string;
  timestamp: Date;
  direction: 'INBOUND' | 'OUTBOUND';
  method: string;
  path: string;
  query_params: any;
  request_headers: any;
  request_body: any;
  response_status: number;
  response_headers: any;
  response_body: any;
  duration_ms: number;
  emsp_token: string | null;
  error: string | null;
}

export interface PushLogEntry {
  id: string;
  emsp_id: string | null;
  endpoint_type: string;
  object_type: string | null;
  object_id: string | null;
  method: string;
  url: string;
  request_headers: any;
  request_body: any;
  response_status: number | null;
  response_body: any;
  success: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: Date;
}

export interface LogFilters {
  direction?: 'INBOUND' | 'OUTBOUND';
  method?: string;
  path?: string;
  statusCode?: number;
  emspToken?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface PushLogFilters {
  emspId?: string;
  endpointType?: string;
  objectType?: string;
  success?: boolean;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

class LogsService {
  /**
   * Get OCPI request/response logs with filtering
   */
  async getLogs(filters: LogFilters = {}): Promise<{ logs: LogEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.direction) {
      conditions.push(`direction = $${paramIndex++}`);
      values.push(filters.direction);
    }
    if (filters.method) {
      conditions.push(`method = $${paramIndex++}`);
      values.push(filters.method);
    }
    if (filters.path) {
      conditions.push(`path LIKE $${paramIndex++}`);
      values.push(`%${filters.path}%`);
    }
    if (filters.statusCode) {
      conditions.push(`response_status = $${paramIndex++}`);
      values.push(filters.statusCode);
    }
    if (filters.emspToken) {
      conditions.push(`emsp_token = $${paramIndex++}`);
      values.push(filters.emspToken);
    }
    if (filters.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM ocpi_logs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    
    const result = await pool.query(
      `SELECT * FROM ocpi_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      logs: result.rows.map(row => this.parseLogRow(row)),
      total,
    };
  }

  /**
   * Get a single log entry by ID
   */
  async getLogById(id: string): Promise<LogEntry | null> {
    const result = await pool.query(
      `SELECT * FROM ocpi_logs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.parseLogRow(result.rows[0]);
  }

  /**
   * Get push notification logs with filtering
   */
  async getPushLogs(filters: PushLogFilters = {}): Promise<{ logs: PushLogEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.emspId) {
      conditions.push(`emsp_id = $${paramIndex++}`);
      values.push(filters.emspId);
    }
    if (filters.endpointType) {
      conditions.push(`endpoint_type = $${paramIndex++}`);
      values.push(filters.endpointType);
    }
    if (filters.objectType) {
      conditions.push(`object_type = $${paramIndex++}`);
      values.push(filters.objectType);
    }
    if (filters.success !== undefined) {
      conditions.push(`success = $${paramIndex++}`);
      values.push(filters.success);
    }
    if (filters.startTime) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM push_logs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    
    const result = await pool.query(
      `SELECT * FROM push_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      logs: result.rows.map(row => this.parsePushLogRow(row)),
      total,
    };
  }

  /**
   * Get push log by ID
   */
  async getPushLogById(id: string): Promise<PushLogEntry | null> {
    const result = await pool.query(
      `SELECT * FROM push_logs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.parsePushLogRow(result.rows[0]);
  }

  /**
   * Get log statistics
   */
  async getLogStats(hours: number = 24): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByMethod: Record<string, number>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as successful,
        COUNT(*) FILTER (WHERE response_status >= 400) as failed,
        AVG(duration_ms) as avg_duration
       FROM ocpi_logs 
       WHERE timestamp >= $1`,
      [since]
    );

    const endpointResult = await pool.query(
      `SELECT path, COUNT(*) as count 
       FROM ocpi_logs 
       WHERE timestamp >= $1 
       GROUP BY path 
       ORDER BY count DESC 
       LIMIT 20`,
      [since]
    );

    const methodResult = await pool.query(
      `SELECT method, COUNT(*) as count 
       FROM ocpi_logs 
       WHERE timestamp >= $1 
       GROUP BY method`,
      [since]
    );

    const stats = statsResult.rows[0];
    const requestsByEndpoint: Record<string, number> = {};
    const requestsByMethod: Record<string, number> = {};

    endpointResult.rows.forEach(row => {
      requestsByEndpoint[row.path] = parseInt(row.count, 10);
    });

    methodResult.rows.forEach(row => {
      requestsByMethod[row.method] = parseInt(row.count, 10);
    });

    return {
      totalRequests: parseInt(stats.total, 10),
      successfulRequests: parseInt(stats.successful, 10),
      failedRequests: parseInt(stats.failed, 10),
      avgResponseTime: Math.round(parseFloat(stats.avg_duration) || 0),
      requestsByEndpoint,
      requestsByMethod,
    };
  }

  /**
   * Clear old logs (older than specified days)
   */
  async clearOldLogs(days: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await pool.query(
      `DELETE FROM ocpi_logs WHERE timestamp < $1`,
      [cutoff]
    );

    return result.rowCount || 0;
  }

  private parseLogRow(row: any): LogEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      direction: row.direction,
      method: row.method,
      path: row.path,
      query_params: this.parseJson(row.query_params),
      request_headers: this.parseJson(row.request_headers),
      request_body: this.parseJson(row.request_body),
      response_status: row.response_status,
      response_headers: this.parseJson(row.response_headers),
      response_body: this.parseJson(row.response_body),
      duration_ms: row.duration_ms,
      emsp_token: row.emsp_token,
      error: row.error,
    };
  }

  private parsePushLogRow(row: any): PushLogEntry {
    return {
      id: row.id,
      emsp_id: row.emsp_id,
      endpoint_type: row.endpoint_type,
      object_type: row.object_type,
      object_id: row.object_id,
      method: row.method,
      url: row.url,
      request_headers: this.parseJson(row.request_headers),
      request_body: this.parseJson(row.request_body),
      response_status: row.response_status,
      response_body: this.parseJson(row.response_body),
      success: row.success,
      error: row.error,
      duration_ms: row.duration_ms,
      created_at: row.created_at,
    };
  }

  private parseJson(value: any): any {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

export const logsService = new LogsService();

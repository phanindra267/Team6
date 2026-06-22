import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface SFEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  manager: string;
  joiningDate: Date;
}

export interface SFEmployeeOutput {
  sfEmployeeId: string;
  email: string;
  status: string;
}

export class SuccessFactorsService {
  private apiUrl: string;
  private clientId: string;
  private privateKey: string;
  private mockMode: boolean;

  constructor() {
    this.apiUrl = env.SF_API_URL;
    this.clientId = env.SF_CLIENT_ID || '';
    this.privateKey = env.SF_PRIVATE_KEY || '';
    this.mockMode = env.SF_MOCK_MODE;
  }

  /**
   * Look up employee by email.
   * Prevents double-creation in SF.
   */
  async lookupEmployeeByEmail(email: string): Promise<SFEmployeeOutput | null> {
    logger.info(`[SuccessFactors] Looking up employee by email: ${email}`);

    if (this.mockMode) {
      return this.mockLookup(email);
    }

    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.apiUrl}/odata/v2/User`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          $filter: `email eq '${email}'`,
          $format: 'json',
          $select: 'userId,username,email,status',
        },
        timeout: 10000,
      });

      const results = response.data?.d?.results || [];
      if (results.length > 0) {
        const user = results[0];
        return {
          sfEmployeeId: user.userId,
          email: user.email,
          status: user.status || 'Active',
        };
      }
      return null;
    } catch (error) {
      this.handleAxiosError(error as AxiosError, 'lookupEmployeeByEmail');
      throw error;
    }
  }

  /**
   * Create employee in SuccessFactors.
   */
  async createEmployee(employee: SFEmployeeInput): Promise<SFEmployeeOutput> {
    logger.info(`[SuccessFactors] Creating employee record for: ${employee.email}`);

    if (this.mockMode) {
      return this.mockCreate(employee);
    }

    try {
      const token = await this.getAccessToken();
      
      // OData Payload for SuccessFactors User / EmpEmployment
      const payload = {
        __metadata: { uri: 'User' },
        userId: `SF_${Math.floor(100000 + Math.random() * 900000)}`,
        username: employee.email.split('@')[0],
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        title: employee.designation,
        department: employee.department,
        status: 'Active',
      };

      const response = await axios.post(`${this.apiUrl}/odata/v2/User`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const createdUser = response.data?.d;
      if (!createdUser || !createdUser.userId) {
        throw new Error('Invalid SuccessFactors response payload during employee creation');
      }

      logger.info(`[SuccessFactors] Employee successfully created in SF. ID: ${createdUser.userId}`);
      return {
        sfEmployeeId: createdUser.userId,
        email: employee.email,
        status: 'Active',
      };
    } catch (error) {
      this.handleAxiosError(error as AxiosError, 'createEmployee');
      throw error;
    }
  }

  /**
   * Generate SuccessFactors OAuth Access Token (SAML Assertions / Client Credentials flow)
   */
  private async getAccessToken(): Promise<string> {
    // Standard OAuth token request to SuccessFactors token endpoint
    try {
      const response = await axios.post(`${this.apiUrl}/oauth/token`, {
        client_id: this.clientId,
        grant_type: 'client_credentials',
        // In actual SuccessFactors, SAML assertion is used; this is standard OAuth mock fallback
      }, { timeout: 5000 });

      return response.data?.access_token || 'mock-access-token';
    } catch (error) {
      logger.error('[SuccessFactors] OAuth Token generation failed');
      throw error;
    }
  }

  /**
   * Detailed translation of Axios / SuccessFactors OData errors.
   */
  private handleAxiosError(error: AxiosError, operation: string) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const sfErrorMsg = data?.error?.message?.value || JSON.stringify(data);

      logger.error(`[SuccessFactors] OData API Error during ${operation} [Status: ${status}]: ${sfErrorMsg}`);
      
      if (status === 401 || status === 403) {
        throw new Error(`SuccessFactors Authentication/Authorization Failed: ${sfErrorMsg}`);
      } else if (status === 404) {
        throw new Error(`SuccessFactors Resource Not Found during ${operation}: ${sfErrorMsg}`);
      } else if (status === 429) {
        throw new Error(`SuccessFactors Rate Limit exceeded: ${sfErrorMsg}`);
      } else if (status >= 500) {
        throw new Error(`SuccessFactors Server Error (5xx) during ${operation}: ${sfErrorMsg}`);
      }
    } else if (error.request) {
      logger.error(`[SuccessFactors] Network/Timeout Error during ${operation}: No response received.`);
      throw new Error(`SuccessFactors Network/Timeout Error during ${operation}`);
    } else {
      logger.error(`[SuccessFactors] Request Error during ${operation}: ${error.message}`);
      throw error;
    }
  }

  // --- MOCK HARNESS FOR TESTING AND DEMO FAILURE INJECTIONS ---
  private async mockLookup(email: string): Promise<SFEmployeeOutput | null> {
    // Allow simulating a user that already exists
    if (email.includes('existing')) {
      return {
        sfEmployeeId: 'SF_999999',
        email,
        status: 'Active',
      };
    }
    return null;
  }

  private async mockCreate(employee: SFEmployeeInput): Promise<SFEmployeeOutput> {
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const email = employee.email.toLowerCase();

    // Failure Injection logic based on employee email syntax:
    if (email.includes('fail-sf')) {
      logger.warn(`[SuccessFactors Mock] Injected 500 Server Error for ${email}`);
      throw new Error('SuccessFactors Server Error (500) - Injected Mock Failure for testing.');
    }
    if (email.includes('timeout-sf')) {
      logger.warn(`[SuccessFactors Mock] Injected Timeout Error for ${email}`);
      throw new Error('SuccessFactors Network/Timeout Error during createEmployee');
    }
    if (email.includes('429-sf')) {
      logger.warn(`[SuccessFactors Mock] Injected 429 Rate Limit Error for ${email}`);
      throw new Error('SuccessFactors Rate Limit exceeded: Mock rate limiter triggered.');
    }
    if (email.includes('401-sf')) {
      logger.warn(`[SuccessFactors Mock] Injected 401 Unauthorized Error for ${email}`);
      throw new Error('SuccessFactors Authentication/Authorization Failed: Invalid client credentials.');
    }

    const randomId = `SF_${Math.floor(100000 + Math.random() * 900000)}`;
    logger.info(`[SuccessFactors Mock] Created mock employee ${randomId} for ${email}`);
    return {
      sfEmployeeId: randomId,
      email: employee.email,
      status: 'Active',
    };
  }
}

export const successFactorsService = new SuccessFactorsService();
export default successFactorsService;

import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as CircuitBreaker from "opossum";

interface HttpClientConfig {
  timeout?: number;
  retries?: number;
  baseURL?: string;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;

  constructor(config: HttpClientConfig = {}) {
    const {
      timeout = 10000, // 10 seconds
      retries = 3,
      baseURL,
    } = config;

    // Configure Axios instance
    this.axiosInstance = axios.create({
      timeout,
      baseURL,
      headers: {
        "User-Agent": "UberFoods-Backend/1.0",
      },
    });

    // Add request/response interceptors for logging
    this.axiosInstance.interceptors.request.use((config) => {
      this.logger.debug(
        `HTTP Request: ${config.method?.toUpperCase()} ${config.url}`,
      );
      return config;
    });

    this.axiosInstance.interceptors.response.use((response) => {
      this.logger.debug(
        `HTTP Response: ${response.status} ${response.config.url}`,
      );
      return response;
    });

    // Configure Circuit Breaker
    this.circuitBreaker = new CircuitBreaker(
      async (requestFn: () => Promise<any>) => {
        return await requestFn();
      },
      {
        timeout: timeout * 2, // Circuit timeout > HTTP timeout
        errorThresholdPercentage: 50, // Open circuit if 50% requests fail
        resetTimeout: 30000, // Try to close circuit after 30 seconds
        rollingCountTimeout: 10000, // Rolling window: 10 seconds
        rollingCountBuckets: 10, // 10 buckets
        name: "HttpClientCircuitBreaker",
      },
    );

    // Circuit breaker event handlers
    this.circuitBreaker.on("open", () => {
      this.logger.warn("HTTP Circuit Breaker OPENED - failing fast");
    });

    this.circuitBreaker.on("close", () => {
      this.logger.log(
        "HTTP Circuit Breaker CLOSED - resuming normal operation",
      );
    });

    this.circuitBreaker.on("halfOpen", () => {
      this.logger.log("HTTP Circuit Breaker HALF-OPEN - testing recovery");
    });
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire(() =>
      this.retryOperation(() => this.axiosInstance.get<T>(url, config)),
    );
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire(() =>
      this.retryOperation(() => this.axiosInstance.post<T>(url, data, config)),
    );
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire(() =>
      this.retryOperation(() => this.axiosInstance.put<T>(url, data, config)),
    );
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire(() =>
      this.retryOperation(() => this.axiosInstance.patch<T>(url, data, config)),
    );
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire(() =>
      this.retryOperation(() => this.axiosInstance.delete<T>(url, config)),
    );
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `HTTP operation failed (attempt ${attempt}/3): ${error.message}`,
        );

        // Don't retry on client errors (4xx) or certain server errors
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (
            status &&
            status >= 400 &&
            status < 500 &&
            status !== 408 &&
            status !== 429
          ) {
            throw error; // Don't retry client errors (except timeout/rate limit)
          }
        }

        // Wait before retry (exponential backoff with jitter)
        if (attempt < 3) {
          const delay = Math.min(
            1000 * Math.pow(2, attempt - 1) + Math.random() * 1000,
            5000,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Circuit breaker status
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.status.stats,
      isOpen: this.circuitBreaker.opened,
      failureCount: this.circuitBreaker.stats.failures,
      successCount: this.circuitBreaker.stats.successes,
    };
  }
}

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface RetryConfig extends InternalAxiosRequestConfig {
    _retry?: number;
}

class APIClient {
    private client: AxiosInstance;
    private maxRetries: number = 3;
    private retryDelay: number = 1000;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.REACT_APP_API_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor for auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor for retry logic
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as RetryConfig;
                if (!originalRequest) return Promise.reject(error);

                if (error.response?.status === 401 && !originalRequest._retry) {
                    // Handle token refresh here if needed
                    return Promise.reject(error);
                }

                const currentRetry = originalRequest._retry || 0;
                if (currentRetry >= this.maxRetries) {
                    return Promise.reject(error);
                }

                originalRequest._retry = currentRetry + 1;

                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(this.client(originalRequest));
                    }, this.retryDelay * (currentRetry + 1));
                });
            }
        );
    }

    async get<T>(url: string, config = {}) {
        return this.client.get<T>(url, config);
    }

    async post<T>(url: string, data = {}, config = {}) {
        return this.client.post<T>(url, data, config);
    }

    async put<T>(url: string, data = {}, config = {}) {
        return this.client.put<T>(url, data, config);
    }

    async delete<T>(url: string, config = {}) {
        return this.client.delete<T>(url, config);
    }
}

export const apiClient = new APIClient();

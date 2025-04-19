const API_URL = 'http://localhost:3000';

const apiService = {
    token: null,

    // Initialize from localStorage
    init() {
        this.token = localStorage.getItem('authToken');
    },

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    },

    // Clear auth token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    },

    // Headers with auth token
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    // Basic AJAX request
    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = this.getHeaders();
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Network response was not ok');
            }

            return data;
        } catch (error) {
            if (error.message === 'Please authenticate.') {
                this.clearToken();
                window.location.href = '/login.html';
            }
            throw error;
        }
    },

    // Auth APIs
    auth: {
        async loginWithGoogle(token) {
            const data = await apiService.request('/auth/google', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            apiService.setToken(data.token);
            return data;
        },

        async logout() {
            await apiService.request('/auth/logout', {
                method: 'POST'
            });
            apiService.clearToken();
        },

        async checkAuth() {
            return apiService.request('/auth/check');
        }
    },

    // User APIs
    user: {
        async getProfile() {
            return apiService.request('/users/me');
        },

        async updateProfile(data) {
            return apiService.request('/users/me', {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
        },

        async deleteAccount() {
            await apiService.request('/users/me', {
                method: 'DELETE'
            });
            apiService.clearToken();
        }
    },

    // License Plate Detection APIs
    detection: {
        async uploadImage(formData) {
            return apiService.request('/detection/upload', {
                method: 'POST',
                headers: {
                    // Remove Content-Type to let browser set it with boundary
                    'Content-Type': undefined
                },
                body: formData
            });
        },

        async processStream(streamData) {
            return apiService.request('/detection/stream', {
                method: 'POST',
                body: JSON.stringify(streamData)
            });
        },

        async saveDetection(data) {
            return apiService.request('/detection/save', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async getHistory(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return apiService.request(`/detection/history?${queryString}`);
        }
    },

    // Records APIs
    records: {
        async getRecords(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return apiService.request(`/records?${queryString}`);
        },

        async getAnalytics(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return apiService.request(`/records/analytics?${queryString}`);
        },

        async verifyDetection(id, data) {
            return apiService.request(`/records/${id}/verify`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
        },

        async searchByLocation(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return apiService.request(`/records/location?${queryString}`);
        },

        async exportRecords(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return apiService.request(`/records/export?${queryString}`);
        }
    }
};
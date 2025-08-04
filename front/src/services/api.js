class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, config);

      // Si le token est expiré, essayer de le rafraîchir
      if (response.status === 401 && token) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Retry la requête avec le nouveau token
          const newToken = localStorage.getItem('accessToken');
          config.headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, config);
        } else {
          // Rediriger vers la page de connexion
          window.location.href = '/admin/login';
          return;
        }
      }

      return response;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return false;
      }
    } catch (error) {
      console.error('Erreur refresh token:', error);
      return false;
    }
  }

  // Méthodes utilitaires
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Méthode spéciale pour l'upload de fichiers
  async uploadFiles(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const config = {
      method: 'POST',
      headers: {},
      body: formData,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, config);

      // Si le token est expiré, essayer de le rafraîchir
      if (response.status === 401 && token) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Retry la requête avec le nouveau token
          const newToken = localStorage.getItem('accessToken');
          config.headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, config);
        } else {
          // Rediriger vers la page de connexion
          window.location.href = '/admin/login';
          return;
        }
      }

      return response;
    } catch (error) {
      console.error('Erreur upload:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
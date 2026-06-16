/**
 * AML Guard — API Client
 * 
 * Náhrada za mock Supabase. Volá priamo na FastAPI backend.
 * Všetky požiadavky idú cez fetch s JWT tokenom.
 */

const API_BASE = (function() {
  // Pre GitHub Pages použi CORS proxy, lokálne priamo backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8222';
  }
  // V produkcii — keď backend beží verejne
  return 'http://localhost:8222';
})();

const API = {
  _token: localStorage.getItem('aml_jwt_token'),

  get token() { return this._token; },
  set token(t) {
    this._token = t;
    if (t) localStorage.setItem('aml_jwt_token', t);
    else localStorage.removeItem('aml_jwt_token');
  },

  async _fetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || `HTTP ${res.status}`);
    }

    return data;
  },

  // ─── AUTH ───
  auth: {
    register: (data) => API._fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    login: async (email, password) => {
      const data = await API._fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      API.token = data.access_token;
      return data;
    },

    me: () => API._fetch('/api/auth/me'),

    logout: () => {
      API.token = null;
    },
  },

  // ─── POLICY ───
  policy: {
    generate: (answers) => API._fetch('/api/policy/generate', {
      method: 'POST',
      body: JSON.stringify(answers),
    }),

    list: () => API._fetch('/api/policy/list'),

    get: (id) => API._fetch(`/api/policy/${id}`),
  },

  // ─── CDD ───
  cdd: {
    create: (data) => API._fetch('/api/cdd/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    list: () => API._fetch('/api/cdd/'),

    get: (id) => API._fetch(`/api/cdd/${id}`),

    verify: (id) => API._fetch(`/api/cdd/${id}/verify`, {
      method: 'PUT',
    }),
  },

  // ─── UBO ───
  ubo: {
    create: (data) => API._fetch('/api/ubo/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    list: () => API._fetch('/api/ubo/'),
  },

  // ─── STR ───
  str: {
    create: (data) => API._fetch('/api/str/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    list: () => API._fetch('/api/str/'),

    submit: (id) => API._fetch(`/api/str/${id}/submit`, {
      method: 'POST',
    }),
  },

  // ─── TRAINING ───
  training: {
    complete: (data) => API._fetch('/api/training/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    list: () => API._fetch('/api/training/'),
  },
};

// Export pre použitie v ostatných moduloch
window.API = API;

/**
 * AML Guard — Supabase Mock Client
 * 
 * Offline-first mock. Keď bude internet, stačí nahradiť importom
 * reálneho @supabase/supabase-js a všetko bude fungovať.
 * 
 * API je identické so Supabase JS klientom:
 *   supabase.from('table').select('*')
 *   supabase.from('table').insert({...})
 *   supabase.from('table').update({...}).eq('id', X)
 *   supabase.from('table').delete().eq('id', X)
 * 
 * Všetky dáta sa ukladajú do localStorage.
 */

class SupabaseMockClient {
  constructor(config) {
    this.config = config;
    this._data = this._load() || {};
    this._currentUser = null;
    this._authListeners = [];
    
    // Try to restore session
    const savedSession = localStorage.getItem('aml_guard_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        this._currentUser = session.user;
        this._session = session;
      } catch(e) {}
    }
  }

  // ─── STORAGE ───
  _load() {
    try {
      return JSON.parse(localStorage.getItem('aml_guard_data') || '{}');
    } catch(e) { return {}; }
  }
  
  _save() {
    localStorage.setItem('aml_guard_data', JSON.stringify(this._data));
  }

  _getTable(name) {
    if (!this._data[name]) {
      this._data[name] = [];
      this._save();
    }
    return this._data[name];
  }

  // ─── QUERY BUILDER ───
  from(table) {
    const self = this;
    return {
      _table: table,
      _filters: [],
      _orderBy: null,
      _orderAsc: true,
      _limit: null,
      _offset: 0,
      _single: false,

      select(columns = '*') {
        this._columns = columns;
        return this;
      },

      eq(column, value) {
        this._filters.push({ op: 'eq', column, value });
        return this;
      },

      neq(column, value) {
        this._filters.push({ op: 'neq', column, value });
        return this;
      },

      gt(column, value) {
        this._filters.push({ op: 'gt', column, value });
        return this;
      },

      lt(column, value) {
        this._filters.push({ op: 'lt', column, value });
        return this;
      },

      gte(column, value) {
        this._filters.push({ op: 'gte', column, value });
        return this;
      },

      lte(column, value) {
        this._filters.push({ op: 'lte', column, value });
        return this;
      },

      in(column, values) {
        this._filters.push({ op: 'in', column, values });
        return this;
      },

      ilike(column, pattern) {
        this._filters.push({ op: 'ilike', column, pattern });
        return this;
      },

      order(column, { ascending = true } = {}) {
        this._orderBy = column;
        this._orderAsc = ascending;
        return this;
      },

      limit(n) {
        this._limit = n;
        return this;
      },

      range(start, end) {
        this._offset = start;
        this._limit = end - start + 1;
        return this;
      },

      single() {
        this._single = true;
        return this;
      },

      async then(resolve, reject) {
        try {
          const result = await this._execute();
          resolve(result);
        } catch(e) {
          if (reject) reject(e);
          else throw e;
        }
      },

      async _execute() {
        let rows = [...self._getTable(this._table)];
        
        // Apply RLS: only show company-owned data
        if (self._currentUser && this._table !== 'profiles' && this._table !== 'company_members') {
          // Filter by company_id if present
          if (rows.length > 0 && 'company_id' in rows[0]) {
            // We'll let the explicit filters handle it
          }
        }

        // Apply filters
        for (const f of this._filters) {
          rows = rows.filter(row => {
            switch (f.op) {
              case 'eq': return row[f.column] === f.value;
              case 'neq': return row[f.column] !== f.value;
              case 'gt': return row[f.column] > f.value;
              case 'lt': return row[f.column] < f.value;
              case 'gte': return row[f.column] >= f.value;
              case 'lte': return row[f.column] <= f.value;
              case 'in': return (f.values || []).includes(row[f.column]);
              case 'ilike': {
                const val = String(row[f.column] || '').toLowerCase();
                const pat = String(f.pattern || '').toLowerCase().replace(/%/g, '.*');
                return new RegExp('^' + pat + '$').test(val);
              }
              default: return true;
            }
          });
        }

        // Sort
        if (this._orderBy) {
          rows.sort((a, b) => {
            const va = a[this._orderBy];
            const vb = b[this._orderBy];
            if (va < vb) return this._orderAsc ? -1 : 1;
            if (va > vb) return this._orderAsc ? 1 : -1;
            return 0;
          });
        }

        // Limit/offset
        if (this._offset > 0 || this._limit !== null) {
          const start = this._offset;
          const end = this._limit !== null ? start + this._limit : rows.length;
          rows = rows.slice(start, end);
        }

        // Single
        if (this._single) {
          return { data: rows.length > 0 ? rows[0] : null, error: rows.length === 0 ? { message: 'Not found' } : null };
        }

        return { data: rows, error: null, count: rows.length };
      },

      // ─── MUTATIONS ───
      async insert(values) {
        const table = self._getTable(this._table);
        const now = new Date().toISOString();
        
        const rows = Array.isArray(values) ? values : [values];
        const inserted = rows.map(row => ({
          id: row.id || crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          ...row,
          created_at: row.created_at || now,
          updated_at: now
        }));
        
        table.push(...inserted);
        self._save();
        
        return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
      },

      async update(values) {
        const table = self._getTable(this._table);
        const now = new Date().toISOString();
        
        const matched = table.filter(row => {
          for (const f of this._filters) {
            if (f.op === 'eq' && row[f.column] !== f.value) return false;
          }
          return true;
        });
        
        matched.forEach(row => {
          Object.assign(row, values, { updated_at: now });
        });
        
        self._save();
        return { data: matched, error: null };
      },

      async delete() {
        const table = self._getTable(this._table);
        const before = table.length;
        
        // Remove matched rows
        const remaining = table.filter(row => {
          for (const f of this._filters) {
            if (f.op === 'eq' && row[f.column] !== f.value) return true;
          }
          return false;
        });
        
        const deleted = before - remaining.length;
        self._data[this._table] = remaining;
        self._save();
        
        return { data: null, error: null, count: deleted };
      },

      // Make it thenable
      catch(fn) {
        return this._execute().catch(fn);
      },

      finally(fn) {
        return this._execute().finally(fn);
      }
    };
  }

  // ─── AUTH ───
  auth = {
    onAuthStateChange: (callback) => {
      this._authListeners.push(callback);
      // Fire initial state
      callback(this._currentUser ? 'SIGNED_IN' : 'SIGNED_OUT', this._currentUser ? { user: this._currentUser } : null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },

    signUp: async ({ email, password, options = {} }) => {
      // Check if exists
      const users = this._data._users || [];
      const existing = users.find(u => u.email === email);
      if (existing) {
        return { data: null, error: { message: 'User already registered' } };
      }
      
      const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'user-' + Date.now(),
        email,
        user_metadata: options.data || {},
        created_at: new Date().toISOString()
      };
      
      users.push(user);
      this._data._users = users;
      this._data._passwords = this._data._passwords || {};
      this._data._passwords[email] = password;
      this._save();
      
      // Auto sign in
      this._currentUser = user;
      this._session = { user, access_token: 'mock-token-' + Date.now() };
      localStorage.setItem('aml_guard_session', JSON.stringify(this._session));
      
      this._authListeners.forEach(cb => cb('SIGNED_IN', { user }));
      
      return { data: { user }, error: null };
    },

    signInWithPassword: async ({ email, password }) => {
      const users = this._data._users || [];
      const passwords = this._data._passwords || {};
      const user = users.find(u => u.email === email);
      
      if (!user || passwords[email] !== password) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
      
      this._currentUser = user;
      this._session = { user, access_token: 'mock-token-' + Date.now() };
      localStorage.setItem('aml_guard_session', JSON.stringify(this._session));
      
      this._authListeners.forEach(cb => cb('SIGNED_IN', { user }));
      
      return { data: { user }, error: null };
    },

    signOut: async () => {
      this._currentUser = null;
      this._session = null;
      localStorage.removeItem('aml_guard_session');
      this._authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    getSession: async () => {
      return { data: { session: this._session }, error: null };
    },

    getUser: async () => {
      return { data: { user: this._currentUser }, error: this._currentUser ? null : { message: 'Not authenticated' } };
    }
  };

  // ─── STORAGE (MOCK) ───
  storage = {
    from: (bucket) => ({
      upload: async (path, file) => {
        // Store file as base64 data URL in localStorage (limited size)
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = (e) => {
            const key = `aml_guard_file_${bucket}_${path}`;
            try {
              localStorage.setItem(key, e.target.result);
              resolve({ data: { path }, error: null });
            } catch(e) {
              resolve({ data: null, error: { message: 'File too large for localStorage' } });
            }
          };
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: `#file:${bucket}/${path}` } };
      }
    })
  };
}

// ─── GLOBAL INSTANCE ───
// Po pripojení internetu stačí nahradiť:
//   import { createClient } from 'https://esm.sh/@supabase/supabase-js'
//   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

window.supabase = new SupabaseMockClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
});

// Seed demo data (pre vývoj)
(function seedDemoData() {
  if (!localStorage.getItem('aml_guard_seeded')) {
    const data = {};
    
    // Demo user
    data._users = [{
      id: 'demo-user-001',
      email: 'demo@amlguard.sk',
      user_metadata: { full_name: 'Ján Demovič', company: 'Demo Real s.r.o.' },
      created_at: new Date().toISOString()
    }];
    data._passwords = { 'demo@amlguard.sk': 'demo1234' };
    
    // Demo company
    data.companies = [{
      id: 'demo-company-001',
      name: 'Demo Real s.r.o.',
      ico: '50123456',
      dic: 'SK50123456',
      address: 'Hlavná 1, 811 01 Bratislava',
      jurisdiction: 'SK',
      company_type: 'realestate',
      employee_count: 12,
      compliance_officer: 'Ján Demovič',
      risk_level: 'low',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }];
    
    // Demo profile
    data.profiles = [{
      id: 'demo-user-001',
      full_name: 'Ján Demovič',
      email: 'demo@amlguard.sk',
      company_name: 'Demo Real s.r.o.',
      company_id: 'demo-company-001',
      company_type: 'realestate',
      employee_count: 12,
      jurisdiction: 'SK',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }];
    
    // Demo CDD records
    data.cdd_records = [
      {
        id: 'cdd-001',
        company_id: 'demo-company-001',
        person_type: 'individual',
        first_name: 'Peter',
        last_name: 'Vzorový',
        nationality: 'SK',
        birth_date: '1985-06-15',
        address: 'Dlhý rad 12, 821 04 Bratislava',
        id_document_type: 'obciansky',
        id_document_number: 'EE123456',
        id_verified: true,
        id_verified_at: '2025-12-01T10:00:00Z',
        is_pep: false,
        risk_level: 'low',
        status: 'active',
        business_relationship: 'Predaj nehnuteľnosti - byt 2i',
        purpose_of_business: 'Kúpa bytu na bývanie',
        created_at: '2025-12-01T10:00:00Z',
        updated_at: '2025-12-01T10:00:00Z'
      },
      {
        id: 'cdd-002',
        company_id: 'demo-company-001',
        person_type: 'individual',
        first_name: 'Mária',
        last_name: 'Podozrivá',
        nationality: 'SK',
        birth_date: '1972-03-22',
        address: 'Tajná 5, 040 01 Košice',
        id_document_type: 'pas',
        id_document_number: 'P987654',
        id_verified: true,
        id_verified_at: '2026-01-15T14:30:00Z',
        is_pep: true,
        pep_source: 'Dcéra starostu obce',
        risk_level: 'medium',
        status: 'active',
        business_relationship: 'Predaj rodinného domu',
        purpose_of_business: 'Investícia do nehnuteľnosti',
        created_at: '2026-01-15T14:30:00Z',
        updated_at: '2026-01-15T14:30:00Z'
      }
    ];
    
    // Demo UBO records
    data.ubo_records = [{
      id: 'ubo-001',
      company_id: 'demo-company-001',
      cdd_record_id: 'cdd-001',
      full_name: 'Peter Vzorový',
      birth_date: '1985-06-15',
      nationality: 'SK',
      citizenship_country: 'Slovenská republika',
      ownership_percent: 100.00,
      ownership_type: 'direct',
      is_statutory: true,
      created_at: '2025-12-01T10:00:00Z',
      updated_at: '2025-12-01T10:00:00Z'
    }];
    
    // Demo policies
    data.policies = [{
      id: 'policy-001',
      company_id: 'demo-company-001',
      title: 'AML politika pre Demo Real s.r.o.',
      version: 1,
      status: 'active',
      policy_type: 'aml_policy',
      jurisdiction: 'SK',
      content: { sections: ['Úvod', 'Rozsah pôsobnosti', 'Zodpovedná osoba'] },
      approved_by: 'Ján Demovič',
      approved_at: '2026-01-10T09:00:00Z',
      valid_until: '2027-01-10T09:00:00Z',
      created_at: '2026-01-10T09:00:00Z',
      updated_at: '2026-01-10T09:00:00Z'
    }];
    
    // Demo training records
    data.training_records = [{
      id: 'train-001',
      company_id: 'demo-company-001',
      profile_id: 'demo-user-001',
      training_type: 'annual',
      module_name: 'Základné AML školenie 2026',
      completed_at: '2026-01-20T11:00:00Z',
      score: 95,
      passed: true,
      valid_until: '2027-01-20T11:00:00Z',
      created_at: '2026-01-20T11:00:00Z'
    }];
    
    localStorage.setItem('aml_guard_data', JSON.stringify(data));
    localStorage.setItem('aml_guard_seeded', 'true');
  }
})();

/**
 * AML Guard — Main Application Controller
 * 
 * Handles routing, auth, navigation, and page rendering.
 */

const APP = {
  currentUser: null,
  currentCompany: null,
  currentPage: 'dashboard',
  
  async init() {
    // Check auth state
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      document.getElementById('auth-checking').style.display = 'none';
      document.getElementById('auth-failed').style.display = 'flex';
      return;
    }
    
    this.currentUser = user;
    this.showApp();
  },
  
  showApp() {
    document.getElementById('auth-checking').style.display = 'none';
    document.getElementById('auth-failed').style.display = 'none';
    document.getElementById('app-shell').style.display = 'block';
    
    // Load user profile
    this.loadUserProfile();
    
    // Setup navigation
    this.setupNavigation();
    
    // Setup logout
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });
    
    // Load initial page
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(hash);
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(page);
    });
  },
  
  async loadUserProfile() {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.currentUser.id)
      .single();
    
    if (profiles) {
      document.getElementById('user-display-name').textContent = profiles.full_name || profiles.email;
      this.currentProfile = profiles;
      
      // Load company
      if (profiles.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profiles.company_id)
          .single();
        
        if (company) {
          this.currentCompany = company;
          document.getElementById('company-display').textContent = company.name;
        }
      }
    }
  },
  
  setupNavigation() {
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        window.location.hash = page;
        this.navigateTo(page);
      });
    });
  },
  
  async navigateTo(page) {
    this.currentPage = page;
    
    // Update active nav
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Update title
    const titles = {
      dashboard: 'Dashboard',
      policy: 'AML Politika',
      cdd: 'KYC / CDD Previerky',
      ubo: 'Register UBO',
      str: 'Podozrivé obchody',
      training: 'Školenia',
      settings: 'Nastavenia'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
    
    // Render page
    const container = document.getElementById('page-content');
    
    switch (page) {
      case 'dashboard':
        await this.renderDashboard(container);
        break;
      case 'policy':
        await APP_MODULES.policy.render(container);
        break;
      case 'cdd':
        await APP_MODULES.cdd.render(container);
        break;
      case 'ubo':
        await APP_MODULES.ubo.render(container);
        break;
      case 'str':
        await APP_MODULES.str.render(container);
        break;
      case 'training':
        await APP_MODULES.training.render(container);
        break;
      case 'settings':
        await APP_MODULES.settings.render(container);
        break;
      default:
        await this.renderDashboard(container);
    }
  },
  
  async renderDashboard(container) {
    const company = this.currentCompany;
    const companyId = company?.id;
    
    // Get stats
    const { data: cddRecords } = companyId ? await supabase.from('cdd_records').select('*').eq('company_id', companyId) : { data: [] };
    const { data: uboRecords } = companyId ? await supabase.from('ubo_records').select('*').eq('company_id', companyId) : { data: [] };
    const { data: policies } = companyId ? await supabase.from('policies').select('*').eq('company_id', companyId) : { data: [] };
    const { data: training } = companyId ? await supabase.from('training_records').select('*').eq('company_id', companyId) : { data: [] };
    const { data: strReports } = companyId ? await supabase.from('str_reports').select('*').eq('company_id', companyId) : { data: [] };
    
    const activePolicy = policies.find(p => p.status === 'active');
    const lastTraining = training.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
    const trainingValid = lastTraining && new Date(lastTraining.valid_until) > new Date();
    
    // Calculate compliance score
    const checks = [
      !!activePolicy,
      (cddRecords || []).length >= 1,
      (uboRecords || []).length >= 1,
      trainingValid,
      company?.compliance_officer
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    
    const scoreClass = score >= 80 ? 'excellent' : score >= 50 ? 'good' : 'poor';
    const scoreEmoji = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';
    
    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-value">${activePolicy ? '✅' : '❌'}</div>
          <div class="stat-label">AML politika</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🪪</div>
          <div class="stat-value">${cddRecords.length}</div>
          <div class="stat-label">KYC záznamov</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏛️</div>
          <div class="stat-value">${uboRecords.length}</div>
          <div class="stat-label">UBO záznamov</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${trainingValid ? '✅' : '⚠️'}</div>
          <div class="stat-value">${trainingValid ? 'OK' : 'Chýba'}</div>
          <div class="stat-label">Školenie</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div class="card" style="text-align: center;">
          <h2 style="margin-bottom: 1rem;">${scoreEmoji} Compliance Score</h2>
          <div class="score-circle ${scoreClass}">${score}%</div>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            ${score === 100 ? 'Všetko v poriadku.' :
              score >= 80 ? 'Dobrý stav, drobnosti na doladenie.' :
              score >= 50 ? 'Niekoľko vecí chýba.' :
              'Viaceré povinnosti nie sú splnené.'}
          </p>
        </div>
        
        <div class="card">
          <h2 style="margin-bottom: 1rem;">📌 Čo treba urobiť</h2>
          <ul class="checklist">
            <li>
              <span class="check ${activePolicy ? 'done' : 'missing'}">${activePolicy ? '✓' : '○'}</span>
              <span>${activePolicy ? 'AML politika vytvorená' : 'Vytvoriť AML politiku'}</span>
            </li>
            <li>
              <span class="check ${cddRecords.length >= 1 ? 'done' : 'missing'}">${cddRecords.length >= 1 ? '✓' : '○'}</span>
              <span>${cddRecords.length >= 1 ? `KYC previerky (${cddRecords.length})` : 'Vykonať KYC previerku'}</span>
            </li>
            <li>
              <span class="check ${uboRecords.length >= 1 ? 'done' : 'missing'}">${uboRecords.length >= 1 ? '✓' : '○'}</span>
              <span>${uboRecords.length >= 1 ? 'UBO záznamy' : 'Doplniť UBO registráciu'}</span>
            </li>
            <li>
              <span class="check ${trainingValid ? 'done' : 'missing'}">${trainingValid ? '✓' : '○'}</span>
              <span>${trainingValid ? 'Ročné školenie absolvované' : 'Absolvovať ročné školenie'}</span>
            </li>
            <li>
              <span class="check ${company?.compliance_officer ? 'done' : 'missing'}">${company?.compliance_officer ? '✓' : '○'}</span>
              <span>${company?.compliance_officer ? `Zodpovedná osoba: ${company.compliance_officer}` : 'Určiť zodpovednú osobu'}</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div class="card" style="margin-top: 1.5rem;">
        <h2>⚡ Rýchle akcie</h2>
        <div class="btn-group">
          <a href="#policy" class="btn btn-primary">${activePolicy ? '📋 Upraviť AML politiku' : '📋 Vytvoriť AML politiku'}</a>
          <a href="#cdd" class="btn btn-secondary">🪪 Nová KYC previerka</a>
          <a href="#training" class="btn btn-secondary">🎓 Školenie</a>
        </div>
      </div>
    `;
  },
  
  async logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }
};

// ─── MODULES (loaded lazily) ───
const APP_MODULES = {
  policy: {
    async render(container) {
      container.innerHTML = '<p style="color: var(--text-muted);">Načítavam modul AML politika...</p>';
      try {
        const module = await import('./policy-module.js');
        module.default.render(container);
      } catch(e) {
        container.innerHTML = `
          <div class="card">
            <h2>📋 AML Politika</h2>
            <p style="color: var(--text-muted); margin: 1rem 0;">
              Modul sa načítava. Medzitým — generátor AML politiky vám umožní vytvoriť kompletnú 
              AML politiku za 15 minút vyplnením jednoduchého dotazníka.
            </p>
            <div class="btn-group">
              <button class="btn btn-primary" onclick="alert('Modul bude dostupný v ďalšom buildu. Zatiaľ môžete použiť demo dáta.')">📝 Vytvoriť AML politiku</button>
            </div>
          </div>
        `;
      }
    }
  },
  cdd: {
    async render(container) {
      const { data: records } = await supabase.from('cdd_records').select('*').eq('company_id', APP.currentCompany?.id).order('created_at', { ascending: false });
      
      let rows = '';
      (records || []).forEach(r => {
        const riskBadge = r.risk_level === 'low' ? 'badge-green' : r.risk_level === 'medium' ? 'badge-yellow' : 'badge-red';
        const pepTag = r.is_pep ? '<span class="badge badge-yellow">PEP</span>' : '';
        rows += `
          <tr>
            <td>${r.first_name || ''} ${r.last_name}</td>
            <td>${r.person_type === 'individual' ? 'Fyzická' : 'Právnická'}</td>
            <td>${r.id_document_type || '-'}</td>
            <td><span class="badge ${riskBadge}">${r.risk_level}</span> ${pepTag}</td>
            <td><span class="badge ${r.id_verified ? 'badge-green' : 'badge-yellow'}">${r.id_verified ? 'Overené' : 'Neoverené'}</span></td>
            <td>${new Date(r.created_at).toLocaleDateString('sk-SK')}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="alert('Detail: ${r.id}')">Detail</button></td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2>🪪 KYC / CDD Previerky</h2>
            <button class="btn btn-sm btn-primary" onclick="alert('Formulár novej KYC previerky bude v ďalšom buildu')">+ Nová previerka</button>
          </div>
          ${records.length === 0 ? '<p style="color: var(--text-muted);">Zatiaľ žiadne KYC záznamy.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Meno</th><th>Typ</th><th>Doklad</th><th>Riziko</th><th>Stav</th><th>Dátum</th><th></th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`}
        </div>
      `;
    }
  },
  ubo: {
    async render(container) {
      const { data: records } = await supabase.from('ubo_records').select('*').eq('company_id', APP.currentCompany?.id);
      
      let rows = '';
      (records || []).forEach(r => {
        rows += `
          <tr>
            <td>${r.full_name}</td>
            <td>${r.birth_date || '-'}</td>
            <td>${r.citizenship_country || r.nationality || '-'}</td>
            <td><strong>${r.ownership_percent}%</strong></td>
            <td>${r.ownership_type === 'direct' ? 'Priame' : 'Nepriame'}</td>
            <td>${r.is_statutory ? '<span class="badge badge-blue">Štatutár</span>' : '-'}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2>🏛️ Register konečných užívateľov výhod</h2>
            <button class="btn btn-sm btn-primary" onclick="alert('UBO formulár bude v ďalšom buildu')">+ Pridať UBO</button>
          </div>
          ${records.length === 0 ? '<p style="color: var(--text-muted);">Zatiaľ žiadne UBO záznamy.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Meno</th><th>Dátum nar.</th><th>Štát</th><th>Podiel</th><th>Typ</th><th>Štatút</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`}
        </div>
        <div class="card">
          <h3 style="margin-bottom: 0.5rem;">ℹ️ Pravidlo 25%</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Podľa AML zákona musíte evidovať všetky fyzické osoby, ktoré priamo alebo nepriamo 
            vlastnia alebo kontrolujú viac ako 25% podiel na spoločnosti. Register UBO musí byť 
            aktuálny a k dispozícii pre kontrolu.
          </p>
        </div>
      `;
    }
  },
  str: {
    async render(container) {
      const { data: reports } = await supabase.from('str_reports').select('*').eq('company_id', APP.currentCompany?.id).order('created_at', { ascending: false });
      
      let rows = '';
      (reports || []).forEach(r => {
        const statusBadge = r.status === 'submitted' ? 'badge-green' : 'badge-yellow';
        rows += `
          <tr>
            <td><strong>${r.report_number || '-'}</strong></td>
            <td>${new Date(r.transaction_date || r.created_at).toLocaleDateString('sk-SK')}</td>
            <td>${r.transaction_amount ? `${parseFloat(r.transaction_amount).toLocaleString('sk-SK')} €` : '-'}</td>
            <td>${r.transaction_type || '-'}</td>
            <td><span class="badge ${statusBadge}">${r.status === 'submitted' ? 'Odoslané' : 'Koncept'}</span></td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2>🚨 Hlásenie podozrivých obchodov</h2>
            <button class="btn btn-sm btn-primary" onclick="alert('STR formulár bude v ďalšom buildu')">+ Nové hlásenie</button>
          </div>
          ${reports.length === 0 ? '<p style="color: var(--text-muted);">Zatiaľ žiadne hlásenia.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Číslo</th><th>Dátum</th><th>Suma</th><th>Typ</th><th>Stav</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`}
          
          <div style="margin-top: 1.5rem; background: var(--yellow-bg); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px; padding: 1rem;">
            <p style="font-size: 0.9rem;">
              ⚠️ Ak máte podozrenie na legalizáciu príjmov z trestnej činnosti, ste povinný 
              bezodkladne podať hlásenie Finančnej polícii (SK) alebo Finančnému úradu (CZ).
            </p>
          </div>
        </div>
      `;
    }
  },
  training: {
    async render(container) {
      const { data: records } = await supabase.from('training_records').select('*').eq('company_id', APP.currentCompany?.id).order('completed_at', { ascending: false });
      
      let rows = '';
      (records || []).forEach(r => {
        const validBadge = new Date(r.valid_until) > new Date() ? 'badge-green' : 'badge-red';
        rows += `
          <tr>
            <td>${r.module_name}</td>
            <td>${r.training_type === 'annual' ? 'Ročné' : 'Vstupné'}</td>
            <td>${new Date(r.completed_at).toLocaleDateString('sk-SK')}</td>
            <td>${r.score}%</td>
            <td><span class="badge ${validBadge}">${new Date(r.valid_until) > new Date() ? 'Platné' : 'Expirované'}</span></td>
            <td>${new Date(r.valid_until).toLocaleDateString('sk-SK')}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2>🎓 AML Školenia</h2>
          </div>
          
          <p style="color: var(--text-muted); margin-bottom: 1rem;">
            Podľa AML zákona sú všetci zamestnanci povinní absolvovať ročné školenie o AML/FT.
          </p>
          
          ${records.length === 0 ? '<p style="color: var(--text-muted);">Zatiaľ žiadne školenia.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Modul</th><th>Typ</th><th>Dátum</th><th>Skóre</th><th>Platnosť</th><th>Do</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`}
          
          <div class="btn-group" style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="alert('Tréningový modul bude v ďalšom buildu. Obsah: AML základy, rozpoznanie podozrivých obchodov, reporting.')">🎬 Spustiť školenie</button>
          </div>
        </div>
      `;
    }
  },
  settings: {
    async render(container) {
      const company = APP.currentCompany;
      const profile = APP.currentProfile;
      
      container.innerHTML = `
        <div class="card">
          <h2>⚙️ Nastavenia firmy</h2>
          <div class="form-group">
            <label>Názov firmy</label>
            <input type="text" value="${company?.name || ''}" disabled>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>IČO</label>
              <input type="text" value="${company?.ico || ''}" disabled>
            </div>
            <div class="form-group">
              <label>DIČ</label>
              <input type="text" value="${company?.dic || ''}" disabled>
            </div>
          </div>
          <div class="form-group">
            <label>Zodpovedná osoba (Compliance Officer)</label>
            <input type="text" value="${company?.compliance_officer || ''}" placeholder="Meno a priezvisko" id="co-name">
          </div>
          <div class="form-group">
            <label>Typ firmy</label>
            <select id="company-type">
              <option value="realestate" ${company?.company_type === 'realestate' ? 'selected' : ''}>Realitná kancelária</option>
              <option value="accounting" ${company?.company_type === 'accounting' ? 'selected' : ''}>Účtovná firma</option>
              <option value="auto" ${company?.company_type === 'auto' ? 'selected' : ''}>Predajca áut</option>
              <option value="legal" ${company?.company_type === 'legal' ? 'selected' : ''}>Advokát / Notár</option>
              <option value="crypto" ${company?.company_type === 'crypto' ? 'selected' : ''}>Crypto poskytovateľ</option>
              <option value="other" ${company?.company_type === 'other' ? 'selected' : ''}>Iné</option>
            </select>
          </div>
          <div class="form-group">
            <label>Jurisdikcia</label>
            <select id="jurisdiction">
              <option value="SK" ${company?.jurisdiction === 'SK' ? 'selected' : ''}>Slovensko</option>
              <option value="CZ" ${company?.jurisdiction === 'CZ' ? 'selected' : ''}>Česká republika</option>
            </select>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" onclick="alert('Nastavenia uložené. (Demo — v produkcii by sa uložili do databázy)')">💾 Uložiť nastavenia</button>
          </div>
        </div>
        
        <div class="card">
          <h2>👤 Profil</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Meno</label>
              <input type="text" value="${profile?.full_name || ''}" disabled>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" value="${profile?.email || ''}" disabled>
            </div>
          </div>
        </div>
        
        <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
          <h2 style="color: var(--red);">🗑️ Odstrániť účet</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0.5rem 0;">
            Po odstránení účtu prídete o všetky dáta. Táto akcia je nenávratná.
          </p>
          <button class="btn btn-danger btn-sm" onclick="if(confirm('Naozaj chcete odstrániť účet? Táto akcia je nenávratná.')) alert('Demo — účet by bol odstránený.')">Odstrániť účet</button>
        </div>
      `;
    }
  }
};

// ─── START ───
document.addEventListener('DOMContentLoaded', () => APP.init());

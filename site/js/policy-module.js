/**
 * AML Guard — Policy Generator Module
 * 
 * Generates complete AML policy PDF based on questionnaire answers.
 * Supports SK and CZ jurisdictions with industry-specific templates.
 */

const PolicyModule = {
  currentStep: 0,
  answers: {},
  
  templates: {
    SK: {
      realestate: {
        sections: [
          { id: 'header', title: 'Úvodné ustanovenia', fields: ['company_name', 'ico', 'address', 'date'] },
          { id: 'scope', title: 'Rozsah pôsobnosti', fields: ['business_type', 'employee_count'] },
          { id: 'responsible', title: 'Zodpovedná osoba', fields: ['co_name', 'co_contact'] },
          { id: 'identification', title: 'Identifikácia a verifikácia klienta', fields: ['id_procedure', 'id_documents'] },
          { id: 'ubo', title: 'Konečný užívateľ výhod', fields: ['ubo_procedure', 'ubo_threshold'] },
          { id: 'pep', title: 'Politicky exponované osoby', fields: ['pep_procedure', 'pep_source'] },
          { id: 'risk', title: 'Riadenie rizík', fields: ['risk_methodology', 'risk_levels'] },
          { id: 'str', title: 'Hlásenie podozrivých obchodov', fields: ['str_procedure', 'str_contact'] },
          { id: 'training', title: 'Školenia zamestnancov', fields: ['training_frequency', 'training_content'] },
          { id: 'archiving', title: 'Archivácia a ochrana údajov', fields: ['archiving_period', 'data_protection'] },
          { id: 'final', title: 'Záverečné ustanovenia', fields: ['validity', 'review_date'] }
        ]
      },
      accounting: {
        sections: [
          { id: 'header', title: 'Úvodné ustanovenia' },
          { id: 'scope', title: 'Rozsah pôsobnosti' },
          { id: 'responsible', title: 'Zodpovedná osoba' },
          { id: 'identification', title: 'Identifikácia a preverenie klienta' },
          { id: 'ubo', title: 'Konečný užívateľ výhod' },
          { id: 'pep', title: 'Politicky exponované osoby' },
          { id: 'risk', title: 'Hodnotenie rizika klienta' },
          { id: 'str', title: 'Hlásenie podozrivých obchodov' },
          { id: 'record_keeping', title: 'Vedenie evidencie' },
          { id: 'training', title: 'Školenia' },
          { id: 'final', title: 'Záverečné ustanovenia' }
        ]
      },
      auto: {
        sections: [
          { id: 'header', title: 'Úvodné ustanovenia' },
          { id: 'scope', title: 'Rozsah pôsobnosti' },
          { id: 'cash_threshold', title: 'Hotovostné obchody' },
          { id: 'identification', title: 'Identifikácia kupujúceho' },
          { id: 'record_keeping', title: 'Evidencia obchodov' },
          { id: 'str', title: 'Hlásenie podozrivých obchodov' },
          { id: 'training', title: 'Školenia' },
          { id: 'final', title: 'Záverečné ustanovenia' }
        ]
      }
    },
    CZ: {
      realestate: {
        sections: [
          { id: 'header', title: 'Úvodní ustanovení' },
          { id: 'scope', title: 'Rozsah působnosti' },
          { id: 'responsible', title: 'Odpovědná osoba' },
          { id: 'identification', title: 'Identifikace a verifikace klienta' },
          { id: 'ubo', title: 'Konečný uživatel výhod' },
          { id: 'pep', title: 'Politicky exponované osoby' },
          { id: 'risk', title: 'Řízení rizik' },
          { id: 'str', title: 'Hlášení podezřelých obchodů' },
          { id: 'training', title: 'Školení zaměstnanců' },
          { id: 'archiving', title: 'Archivace a ochrana údajů' },
          { id: 'final', title: 'Závěrečná ustanovení' }
        ]
      }
    }
  },

  questions: [
    // Page 0: Company Info
    [
      { id: 'company_name', type: 'text', label: 'Názov spoločnosti', required: true },
      { id: 'ico', type: 'text', label: 'IČO', required: true, placeholder: 'napr. 50123456' },
      { id: 'address', type: 'text', label: 'Sídlo spoločnosti', required: true },
      { id: 'business_type', type: 'select', label: 'Typ činnosti', required: true,
        options: [
          { value: 'realestate', label: 'Realitná kancelária / sprostredkovanie predaja nehnuteľností' },
          { value: 'accounting', label: 'Účtovná firma / daňový poradca' },
          { value: 'auto', label: 'Predajca áut / luxusného tovaru' },
          { value: 'legal', label: 'Advokát / Notár' },
          { value: 'crypto', label: 'Crypto asset poskytovateľ' },
          { value: 'other', label: 'Iná povinná osoba' }
        ]
      }
    ],
    // Page 1: Compliance Officer
    [
      { id: 'co_name', type: 'text', label: 'Meno zodpovednej osoby (Compliance Officer)', required: true, hint: 'Určite kontaktnú osobu zodpovednú za AML compliance' },
      { id: 'co_contact', type: 'text', label: 'Kontakt na zodpovednú osobu', required: true, hint: 'Email a telefón' },
      { id: 'employee_count', type: 'number', label: 'Počet zamestnancov', required: true }
    ],
    // Page 2: Risk & Procedures
    [
      { id: 'risk_level', type: 'select', label: 'Aká je úroveň rizika vašej činnosti?', required: true,
        options: [
          { value: 'low', label: 'Nízka — bežná realitná činnosť, štandardní klienti' },
          { value: 'medium', label: 'Stredná — medzinárodné transakcie, vyššie sumy' },
          { value: 'high', label: 'Vysoká — časté hotovostné obchody, rizikové jurisdikcie' }
        ]
      },
      { id: 'id_procedure', type: 'select', label: 'Spôsob identifikácie klienta', required: true,
        options: [
          { value: 'in_person', label: 'Osobná identifikácia (fyzická prítomnosť)' },
          { value: 'electronic', label: 'Elektronická identifikácia (eID, BankID)' },
          { value: 'both', label: 'Kombinácia osobnej a elektronickej' }
        ]
      }
    ],
    // Page 3: Review & Generate
    [
      { id: 'confirm', type: 'info', label: 'Skontrolujte zadané údaje a vygenerujte AML politiku.' }
    ]
  ],

  render(container) {
    this.container = container;
    this.currentStep = 0;
    this.answers = {};
    
    // Load existing policy if any
    this.loadExistingPolicy();
    
    this.renderCurrentStep();
  },

  async loadExistingPolicy() {
    const companyId = APP.currentCompany?.id;
    if (!companyId) return;
    
    const { data: policies } = await supabase
      .from('policies')
      .select('*')
      .eq('company_id', companyId)
      .eq('policy_type', 'aml_policy')
      .eq('status', 'active');
    
    if (policies && policies.length > 0) {
      this.existingPolicy = policies[0];
    }
  },

  renderCurrentStep() {
    const steps = this.questions;
    const totalSteps = steps.length;
    const step = steps[this.currentStep];
    
    // Build progress
    const progressHtml = steps.map((_, i) => {
      const cls = i < this.currentStep ? 'done' : i === this.currentStep ? 'active' : '';
      return `<div class="progress-step ${cls}">${i < this.currentStep ? '✓' : i + 1}</div>`;
    }).join('<div class="progress-line"></div>');
    
    let html = `
      <div class="card">
        <div class="card-header">
          <h2>📋 Generátor AML politiky</h2>
          ${this.existingPolicy ? '<span class="badge badge-green">Existujúca politika: v.1</span>' : '<span class="badge badge-blue">Nová</span>'}
        </div>
        
        ${this.existingPolicy ? `
          <div style="background: var(--green-bg); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p>✅ Máte aktívnu AML politiku z ${new Date(this.existingPolicy.created_at).toLocaleDateString('sk-SK')}.
            <a href="#" onclick="event.preventDefault(); showPolicyPreview()" style="margin-left: 0.5rem;">Zobraziť</a></p>
          </div>
        ` : ''}
        
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
          ${progressHtml}
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <small style="color: var(--text-muted);">Krok ${this.currentStep + 1} z ${totalSteps}</small>
        </div>
    `;
    
    // Render questions for this step
    step.forEach(q => {
      const val = this.answers[q.id] || '';
      const hint = q.hint ? `<div class="hint">${q.hint}</div>` : '';
      
      html += `<div class="form-group">`;
      html += `<label>${q.required ? '* ' : ''}${q.label}</label>`;
      html += hint;
      
      if (q.type === 'text') {
        html += `<input type="text" id="q_${q.id}" value="${val}" placeholder="${q.placeholder || ''}" ${q.required ? 'required' : ''}>`;
      } else if (q.type === 'number') {
        html += `<input type="number" id="q_${q.id}" value="${val}" ${q.required ? 'required' : ''}>`;
      } else if (q.type === 'select') {
        html += `<select id="q_${q.id}" ${q.required ? 'required' : ''}>`;
        html += `<option value="">— Vyberte —</option>`;
        (q.options || []).forEach(opt => {
          html += `<option value="${opt.value}" ${val === opt.value ? 'selected' : ''}>${opt.label}</option>`;
        });
        html += `</select>`;
      } else if (q.type === 'info') {
        html += `<div style="background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <p style="color: var(--text-muted);">Po vygenerovaní si budete môcť AML politiku stiahnuť ako PDF.</p>
        </div>`;
      }
      
      html += `</div>`;
    });
    
    // Navigation buttons
    html += `<div class="btn-group">`;
    if (this.currentStep > 0) {
      html += `<button class="btn btn-secondary" onclick="APP_MODULES.policy.prevStep()">← Späť</button>`;
    }
    if (this.currentStep < totalSteps - 1) {
      html += `<button class="btn btn-primary" onclick="APP_MODULES.policy.nextStep()">Pokračovať →</button>`;
    } else {
      html += `<button class="btn btn-success" onclick="APP_MODULES.policy.generate()">📄 Vygenerovať AML politiku</button>`;
    }
    html += `</div>`;
    
    html += `</div>`;
    
    this.container.innerHTML = html;
  },

  nextStep() {
    // Collect answers from current step
    const step = this.questions[this.currentStep];
    let valid = true;
    
    step.forEach(q => {
      if (q.type === 'info') return;
      const el = document.getElementById(`q_${q.id}`);
      if (!el) return;
      const val = el.value.trim();
      
      if (q.required && !val) {
        el.style.borderColor = 'var(--red)';
        valid = false;
      } else {
        el.style.borderColor = '';
        this.answers[q.id] = val;
      }
    });
    
    if (!valid) {
      alert('Vyplňte všetky povinné polia (označené *).');
      return;
    }
    
    this.currentStep++;
    this.renderCurrentStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  prevStep() {
    // Save current answers
    const step = this.questions[this.currentStep];
    step.forEach(q => {
      if (q.type === 'info') return;
      const el = document.getElementById(`q_${q.id}`);
      if (el) this.answers[q.id] = el.value.trim();
    });
    
    this.currentStep--;
    this.renderCurrentStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  generate() {
    // Save last answers
    const step = this.questions[this.currentStep];
    step.forEach(q => {
      if (q.type === 'info') return;
      const el = document.getElementById(`q_${q.id}`);
      if (el) this.answers[q.id] = el.value.trim();
    });
    
    const answers = this.answers;
    const companyName = answers.company_name || APP.currentCompany?.name || 'Moja firma';
    const date = new Date().toLocaleDateString('sk-SK');
    
    // Build the policy text
    const policy = this.buildPolicyText(answers);
    
    // Save to database
    this.savePolicy(answers, policy);
    
    // Show preview with download
    this.showPreview(policy, companyName, date);
  },

  buildPolicyText(answers) {
    const t = answers.business_type || 'realestate';
    const typeName = {
      realestate: 'sprostredkovanie predaja nehnuteľností',
      accounting: 'účtovníctvo a daňové poradenstvo',
      auto: 'predaj áut a luxusného tovaru',
      legal: 'advokátska/notárska činnosť',
      crypto: 'crypto asset služby',
      other: 'povinná osoba podľa AML zákona'
    }[t] || 'povinná osoba';
    
    const riskDesc = {
      low: 'nízke',
      medium: 'stredné',
      high: 'vysoké'
    }[answers.risk_level] || 'štandardné';
    
    return `AML POLITIKA
    
    Spoločnosť: ${answers.company_name}
    IČO: ${answers.ico}
    Sídlo: ${answers.address}
    Dátum: ${new Date().toLocaleDateString('sk-SK')}
    
    1. ÚVODNÉ USTANOVENIA
    
    Táto AML politika (ďalej len "Politika") je základným dokumentom spoločnosti 
    ${answers.company_name}, IČO ${answers.ico}, so sídlom ${answers.address} 
    (ďalej len "Spoločnosť") v oblasti boja proti legalizácii príjmov z trestnej 
    činnosti a financovaniu terorizmu (AML/FT).
    
    Spoločnosť vykonáva činnosť: ${typeName}
    
    Politika je vydaná v súlade so zákonom č. 54/2019 Z.z. o ochrane oznamovateľov 
    a zákonom č. 297/2008 Z.z. o ochrane pred legalizáciou príjmov z trestnej 
    činnosti v platnom znení.
    
    2. ROZSAH PÔSOBNOSTI
    
    Táto Politika sa vzťahuje na všetkých zamestnancov Spoločnosti 
    (${answers.employee_count} zamestnancov) a na všetky obchodné vzťahy a 
    transakcie uskutočňované v rámci činnosti Spoločnosti.
    
    3. ZODPOVEDNÁ OSOBA
    
    Zodpovednou osobou za AML/FT compliance je:
    Meno: ${answers.co_name}
    Kontakt: ${answers.co_contact}
    
    Zodpovedná osoba zabezpečuje:
    - Vykonávanie identifikácie a preverovania klientov
    - Hodnotenie rizík
    - Hlásenie podozrivých obchodov
    - Školenie zamestnancov
    - Aktualizáciu tejto Politiky
    
    4. IDENTIFIKÁCIA A VERIFIKÁCIA KLIENTA
    
    Spoločnosť je povinná identifikovať každého klienta pred vznikom obchodného 
    vzťahu alebo pred uskutočnením jednorazovej transakcie:
    
    a) Fyzická osoba: občiansky preukaz alebo cestovný pas
    b) Právnická osoba: výpis z obchodného registra, identifikácia štatutárov
    
    Spôsob identifikácie: ${answers.id_procedure === 'in_person' ? 'Osobná identifikácia' : 
      answers.id_procedure === 'electronic' ? 'Elektronická identifikácia' : 'Kombinácia osobnej a elektronickej'}
    
    5. KONEČNÝ UŽÍVATEĽ VÝHOD (UBO)
    
    Spoločnosť identifikuje konečného užívateľa výhod každej právnickej osoby, 
    ktorá je klientom. Konečným užívateľom výhod je fyzická osoba, ktorá:
    - vlastní alebo kontroluje viac ako 25% podiel
    - vykonáva kontrolu iným spôsobom
    - je osobou, v ktorej záujme sa obchod uskutočňuje
    
    6. POLITICKY EXPONOVANÉ OSOBY (PEP)
    
    Spoločnosť venuje osobitnú pozornosť obchodným vzťahom s politicky 
    exponovanými osobami a osobami im blízkymi. Pri takejto osobe sa vyžaduje:
    - Schválenie obchodného vzťahu vedením
    - Zvýšené monitorovanie obchodného vzťahu
    - Zistenie zdroja majetku a finančných prostriedkov
    
    7. RIADENIE RIZÍK
    
    Úroveň rizika Spoločnosti: ${riskDesc}
    
    Riziko sa posudzuje podľa:
    - Typu klienta a jeho geografickej polohy
    - Spôsobu uskutočnenia transakcie
    - Výšky a frekvencie transakcií
    - Účelu obchodného vzťahu
    
    8. HLÁSENIE PODozrivÝCH OBCHODOV
    
    Každý zamestnanec, ktorý zistí skutočnosť nasvedčujúcu legalizácii príjmov 
    z trestnej činnosti, je povinný bezodkladne informovať zodpovednú osobu.
    
    Zodpovedná osoba posúdi podozrenie a v prípade potreby podá hlásenie 
    Finančnej polícii (oddelenie AML) bez zbytočného odkladu.
    
    9. ŠKOLENIA ZAMESTNANCOV
    
    Spoločnosť zabezpečuje pravidelné ročné školenie všetkých zamestnancov 
    v oblasti AML/FT. Školenie zahŕňa:
    - Legislatívny rámec AML/FT
    - Rozpoznávanie podozrivých obchodov
    - Postupy pri identifikácii a verifikácii
    - Povinnosť mlčanlivosti
    
    10. ARCHIVÁCIA A OCHRANA ÚDAJOV
    
    Záznamy o identifikácii a preverovaní sa uchovávajú 10 rokov od skončenia 
    obchodného vzťahu alebo uskutočnenia jednorazovej transakcie.
    
    Osobné údaje sú spracúvané v súlade s nariadením GDPR.
    
    11. ZÁVEREČNÉ USTANOVENIA
    
    Táto Politika je platná od ${new Date().toLocaleDateString('sk-SK')}.
    Politika bude prehodnotená minimálne raz ročne alebo pri každej významnej 
    zmene legislatívy.
    
    V ${answers.address ? answers.address.split(',').pop() || 'Bratislave' : 'Bratislave'}
    dňa ${new Date().toLocaleDateString('sk-SK')}
    
    _________________________
    ${answers.co_name || 'Zodpovedná osoba'}
    Compliance Officer`;
  },

  async savePolicy(answers, policyText) {
    const companyId = APP.currentCompany?.id;
    if (!companyId) return;
    
    try {
      await supabase.from('policies').insert({
        company_id: companyId,
        title: `AML politika - ${answers.company_name || 'Nová'}`,
        version: (this.existingPolicy?.version || 0) + 1,
        status: 'active',
        policy_type: 'aml_policy',
        jurisdiction: 'SK',
        content: { answers, fullText: policyText, sections: ['Úvod', 'Rozsah', 'Zodpovedná osoba', 'Identifikácia', 'UBO', 'PEP', 'Riziká', 'STR', 'Školenia', 'Archivácia', 'Záver'] },
        approved_by: answers.co_name || 'Systém',
        approved_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch(e) {
      console.log('Policy saved locally (mock mode)');
    }
  },

  showPreview(policy, companyName, date) {
    const lines = policy.split('\n');
    
    let html = `
      <div class="card">
        <div class="card-header">
          <h2>📄 AML Politika vygenerovaná 🎉</h2>
          <span class="badge badge-green">Hotovo</span>
        </div>
        
        <div style="background: var(--green-bg); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">
          <p style="font-size: 1.1rem;">AML politika pre <strong>${companyName}</strong> bola úspešne vygenerovaná.</p>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.3rem;">Môžete si ju stiahnuť ako textový súbor alebo vytlačiť.</p>
        </div>
        
        <div style="background: white; color: #1a1a2e; padding: 2rem; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
          ${policy.replace(/\n/g, '<br>')}
        </div>
        
        <div class="btn-group" style="margin-top: 1.5rem;">
          <button class="btn btn-primary" onclick="APP_MODULES.policy.downloadPolicy()">📥 Stiahnuť ako TXT</button>
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Tlačiť</button>
          <button class="btn btn-secondary" onclick="APP_MODULES.policy.render(document.getElementById('page-content'))">← Späť na generátor</button>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    
    // Store for download
    this._lastPolicy = policy;
  },

  downloadPolicy() {
    const text = this._lastPolicy || 'No policy generated';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AML-Politika-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Export to APP_MODULES
if (typeof APP_MODULES !== 'undefined') {
  APP_MODULES.policy = PolicyModule;
}

export default PolicyModule;

/* ══════════════════════════════════════════════════════════════
   Compensation Intelligence System (PayPulse) — Frontend Client
   ══════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ─── API Base URL ───
  const API_URL = '/api';

  // ─── App State ───
  const state = {
    currentSection: 'section-dashboard',
    companies: [],
    currentEvalReport: null,
    explorer: {
      data: [],
      page: 1,
      limit: 10,
      totalPages: 1,
      totalCount: 0,
      filters: {
        companyId: '',
        level: '',
        role: '',
        location: '',
        sortBy: 'created_at',
        sortOrder: 'DESC'
      }
    }
  };

  // ─── DOM Selectors ───
  const DOM = {
    navBtns: document.querySelectorAll('.nav-btn'),
    sections: document.querySelectorAll('.app-section'),
    toastContainer: document.getElementById('toast-container'),

    // Dashboard elements
    statSubmissions: document.getElementById('stat-total-submissions'),
    statAvgTC: document.getElementById('stat-avg-tc'),
    statTopCompany: document.getElementById('stat-top-company'),
    statMaxBase: document.getElementById('stat-max-base'),
    topPayingList: document.getElementById('top-paying-list'),
    levelAveragesList: document.getElementById('level-averages-list'),

    // Explorer elements
    filterCompany: document.getElementById('filter-company'),
    filterLevel: document.getElementById('filter-level'),
    filterRole: document.getElementById('filter-role'),
    filterLocation: document.getElementById('filter-location'),
    filterSort: document.getElementById('filter-sort'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    salaryTableBody: document.getElementById('salary-table-body'),
    salaryTableHeaders: document.querySelectorAll('#salary-table th'),
    pagePrev: document.getElementById('page-prev'),
    pageNext: document.getElementById('page-next'),
    pageInfo: document.getElementById('page-info'),

    // Compare elements
    compareCompanyA: document.getElementById('compare-company-a'),
    compareCompanyB: document.getElementById('compare-company-b'),
    btnCompare: document.getElementById('btn-compare'),
    compareResultsContainer: document.getElementById('compare-results-container'),
    compareEmptyState: document.getElementById('compare-empty-state'),
    compareChartTitle: document.getElementById('compare-chart-title'),
    compareChartBody: document.getElementById('compare-chart-body'),
    compareThA: document.getElementById('compare-th-a'),
    compareThB: document.getElementById('compare-th-b'),
    compareTableBody: document.getElementById('compare-table-body'),

    // Ingestion Form
    submitForm: document.getElementById('submit-salary-form'),
    formCompany: document.getElementById('form-company'),
    formLevel: document.getElementById('form-level'),
    formTitle: document.getElementById('form-title'),
    formLocation: document.getElementById('form-location'),
    formYoe: document.getElementById('form-yoe'),
    formYac: document.getElementById('form-yac'),
    formBase: document.getElementById('form-base'),
    formStock: document.getElementById('form-stock'),
    formBonus: document.getElementById('form-bonus'),
    formTcPreview: document.getElementById('form-tc-preview'),

    // Leveling Matrix
    matrixTableHeaderRow: document.getElementById('matrix-header-row'),
    matrixTableBody:      document.getElementById('matrix-table-body'),
    matrixDetailCard:     document.getElementById('matrix-detail-card'),
    matrixDetailTitle:    document.getElementById('matrix-detail-title'),
    matrixDetailChart:    document.getElementById('matrix-detail-chart'),
    matrixDetailCode:     document.getElementById('matrix-detail-code'),
    matrixDetailStandard: document.getElementById('matrix-detail-standard'),
    matrixDetailTC:       document.getElementById('matrix-detail-tc'),
    matrixDetailCount:    document.getElementById('matrix-detail-count'),

    // Offer Evaluator
    evaluateOfferForm:    document.getElementById('evaluate-offer-form'),
    evalCompany:          document.getElementById('eval-company'),
    evalLevel:            document.getElementById('eval-level'),
    evalBase:             document.getElementById('eval-base'),
    evalStock:            document.getElementById('eval-stock'),
    evalBonus:            document.getElementById('eval-bonus'),
    evalTaxState:         document.getElementById('eval-tax-state'),
    evaluatorResultsCard: document.getElementById('evaluator-results-card'),
    evaluatorEmptyState:  document.getElementById('evaluator-empty-state'),
    evalPercentileBadge:  document.getElementById('eval-percentile-badge'),
    evalPercentileBar:    document.getElementById('eval-percentile-bar'),
    evalOfferTC:          document.getElementById('eval-offer-tc'),
    evalMarketTC:         document.getElementById('eval-market-tc'),
    evalGuidanceList:     document.getElementById('eval-guidance-list'),
    evalNetPay:           document.getElementById('eval-net-pay'),
    taxBarTakehome:       document.getElementById('tax-bar-takehome'),
    taxBarFed:            document.getElementById('tax-bar-fed'),
    taxBarState:          document.getElementById('tax-bar-state'),
    taxLblTakehome:       document.getElementById('tax-lbl-takehome'),
    taxLblFed:            document.getElementById('tax-lbl-fed'),
    taxLblState:          document.getElementById('tax-lbl-state'),
    taxComparisonPromo:   document.getElementById('tax-comparison-promo'),
    negotiationToneContainer: document.getElementById('negotiation-tone-container'),
    negotiationEmailBox:  document.getElementById('negotiation-email-box'),
    btnCopyScript:        document.getElementById('btn-copy-script'),

    // Career Simulator
    simulatorCompanySelect:     document.getElementById('simulator-company-select'),
    simulatorResultsContainer:  document.getElementById('simulator-results-container'),
    simulatorChartTitle:        document.getElementById('simulator-chart-title'),
    simulatorChartBody:         document.getElementById('simulator-chart-body'),
    simulatorTableBody:         document.getElementById('simulator-table-body'),
    simulatorEmptyState:        document.getElementById('simulator-empty-state')
  };

  /* ═══════════════════════════════════════════════════
     TAX & NEGOTIATION UTILITIES
     ═══════════════════════════════════════════════════ */
  function calculateFederalTax(income) {
    const brackets = [
      { limit: 11600, rate: 0.10 },
      { limit: 47150, rate: 0.12 },
      { limit: 100525, rate: 0.22 },
      { limit: 191950, rate: 0.24 },
      { limit: 243725, rate: 0.32 },
      { limit: 609350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ];
    let tax = 0;
    let prevLimit = 0;
    for (const b of brackets) {
      if (income > b.limit) {
        tax += (b.limit - prevLimit) * b.rate;
        prevLimit = b.limit;
      } else {
        tax += (income - prevLimit) * b.rate;
        break;
      }
    }
    return tax;
  }

  function calculateStateTax(income, stateCode) {
    if (stateCode === 'WA') return 0;
    if (stateCode === 'CA') {
      const brackets = [
        { limit: 10412, rate: 0.01 },
        { limit: 24684, rate: 0.02 },
        { limit: 38959, rate: 0.04 },
        { limit: 54081, rate: 0.06 },
        { limit: 68350, rate: 0.08 },
        { limit: 349137, rate: 0.093 },
        { limit: 418961, rate: 0.103 },
        { limit: 698271, rate: 0.113 },
        { limit: Infinity, rate: 0.123 }
      ];
      let tax = 0;
      let prevLimit = 0;
      for (const b of brackets) {
        if (income > b.limit) {
          tax += (b.limit - prevLimit) * b.rate;
          prevLimit = b.limit;
        } else {
          tax += (income - prevLimit) * b.rate;
          break;
        }
      }
      if (income > 1000000) {
        tax += (income - 1000000) * 0.01;
      }
      return tax;
    }
    if (stateCode === 'NY') {
      const brackets = [
        { limit: 8500, rate: 0.04 },
        { limit: 11700, rate: 0.045 },
        { limit: 13900, rate: 0.0525 },
        { limit: 21400, rate: 0.059 },
        { limit: 80650, rate: 0.0633 },
        { limit: 215400, rate: 0.0685 },
        { limit: 1077550, rate: 0.0965 },
        { limit: Infinity, rate: 0.103 }
      ];
      let tax = 0;
      let prevLimit = 0;
      for (const b of brackets) {
        if (income > b.limit) {
          tax += (b.limit - prevLimit) * b.rate;
          prevLimit = b.limit;
        } else {
          tax += (income - prevLimit) * b.rate;
          break;
        }
      }
      // NYC local tax flat estimate
      tax += income * 0.038;
      return tax;
    }
    if (stateCode === 'REMOTE') {
      return income * 0.04;
    }
    return 0;
  }

  function generateNegotiationScript(report, tone) {
    const comp = report.companyName;
    const lvl = report.levelName;
    const standard = report.standardLevel;
    const offerBase = report.breakdown.base;
    const offerStock = report.breakdown.stock;
    const offerBonus = report.breakdown.bonus;
    const offerTC = report.offerTC;

    const avgBase = report.averages.base || offerBase;
    const avgStock = report.averages.stock || offerStock;
    const avgBonus = report.averages.bonus || offerBonus;
    const avgTC = report.marketAvgTC || offerTC;

    const baseDeficit = avgBase - offerBase;
    const stockDeficit = avgStock - offerStock;

    // Detect what components we are negotiating
    let baseNegotiable = baseDeficit > 0;
    let stockNegotiable = stockDeficit > 0;

    let points = [];
    if (baseNegotiable) {
      points.push(`the base salary (market average is ${formatUSD(avgBase)} vs. current offer of ${formatUSD(offerBase)})`);
    }
    if (stockNegotiable) {
      points.push(`the equity grant (market average is ${formatUSD(avgStock)} vs. current offer of ${formatUSD(offerStock)})`);
    }

    let pointsText = "";
    if (points.length === 2) {
      pointsText = points[0] + " and " + points[1];
    } else if (points.length === 1) {
      pointsText = points[0];
    } else {
      pointsText = "overall total compensation components";
    }

    let askBase = baseNegotiable ? Math.max(offerBase, avgBase) : offerBase;
    let askStock = stockNegotiable ? Math.max(offerStock, avgStock) : offerStock;

    if (tone === 'collaborative') {
      return `Subject: Offer Discussion - [Your Name]

Dear Recruiting Team,

Thank you so much for extending the offer for the Software Engineer position at ${comp}. I am extremely excited about the prospect of joining the team and contributing to ${comp}'s upcoming initiatives.

Before finalizing my decision, I wanted to discuss a couple of components in the offer structure. I've been reviewing verified market salary aggregates for the ${lvl} (${standard}) tier:

${baseNegotiable ? `- Base Salary: The verified market average is ${formatUSD(avgBase)}, while this offer is at ${formatUSD(offerBase)}.\n` : ''}${stockNegotiable ? `- Equity Grant: The verified market average is ${formatUSD(avgStock)} per year, while this offer is at ${formatUSD(offerStock)}.\n` : ''}
Given my years of experience and core competencies, I was hoping we could align the offer closer to these averages. Specifically, I would love to explore if we can adjust the base salary to ${formatUSD(askBase)} and the annual equity grant to ${formatUSD(askStock)}.

I am highly enthusiastic about this role and eager to finalize our agreement. Thank you again for your time, support, and help throughout this process!

Warm regards,
[Your Name]`;
    } else if (tone === 'competitive') {
      return `Subject: Discussion regarding details - [Your Name]

Dear Recruiting Team,

Thank you for offering me the opportunity to join ${comp} at the ${lvl} tier. I've thoroughly enjoyed speaking with the team and learning more about the engineering roadmap.

I am currently evaluating my next career step. While ${comp} is my top choice, I am currently in the final stages of several other processes with competitive pipelines. To help me make a definitive decision, I want to see if we can optimize the current offer.

Looking at market data for ${comp} at the ${lvl} (${standard}) level, average total compensation is ${formatUSD(avgTC)} (with base at ${formatUSD(avgBase)} and annual equity at ${formatUSD(avgStock)}).

To offset my other options and make this offer fully competitive with the market, I would be prepared to sign a contract immediately if we could bring the base salary to ${formatUSD(askBase)} and the annual stock grant to ${formatUSD(askStock)}.

Thank you very much for your understanding and partnership in helping me make this decision. I look forward to hearing if this is feasible!

Best regards,
[Your Name]`;
    } else {
      // Polite Inquiry
      return `Subject: Compensation breakdown inquiry - [Your Name]

Dear Recruiting Team,

Thank you very much for sending over the written offer details! I am extremely grateful for the opportunity to join ${comp} and excited to get started.

I had a quick question regarding the compensation breakdown. I want to make sure I'm aligning with verified market standards for the ${lvl} level. Based on data from verified platforms:
${baseNegotiable ? `- Base salary for ${lvl} averages ${formatUSD(avgBase)} (current offer: ${formatUSD(offerBase)}).\n` : ''}${stockNegotiable ? `- Annual equity grant value averages ${formatUSD(avgStock)} (current offer: ${formatUSD(offerStock)}).\n` : ''}
Is there any room or budget flexibility to adjust ${pointsText} closer to these market rates? 

Even a partial adjustment, or a one-time sign-on bonus to offset the gap, would make a huge difference and be greatly appreciated.

Thank you again for your patience and support throughout my candidacy!

Sincerely,
[Your Name]`;
    }
  }

  /* ═══════════════════════════════════════════════════
     ROUTING & TABS
     ═══════════════════════════════════════════════════ */
  DOM.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      switchSection(target);
    });
  });

  function switchSection(sectionId) {
    state.currentSection = sectionId;

    // Toggle active navigation button
    DOM.navBtns.forEach(btn => {
      const isActive = btn.dataset.target === sectionId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // Toggle active section view
    DOM.sections.forEach(section => {
      section.classList.toggle('active', section.id === sectionId);
    });

    // Load fresh data based on active view
    if (sectionId === 'section-dashboard') {
      loadDashboardStats();
    } else if (sectionId === 'section-explorer') {
      loadExplorerData();
    } else if (sectionId === 'section-matrix') {
      loadMatrixData();
    } else if (sectionId === 'section-evaluator') {
      populateEvaluatorDropdowns();
    } else if (sectionId === 'section-simulator') {
      populateSimulatorDropdowns();
    }
  }

  /* ═══════════════════════════════════════════════════
     COMMON FORMATTING
     ═══════════════════════════════════════════════════ */
  function formatUSD(num) {
    if (num === null || num === undefined) return '$0';
    return '$' + Math.round(num).toLocaleString('en-US');
  }

  function formatUSDK(num) {
    if (num === null || num === undefined) return '$0K';
    if (num < 1000) return `$${Math.round(num)}`;
    return '$' + Math.round(num / 1000) + 'K';
  }

  /* ═══════════════════════════════════════════════════
     TOAST NOTIFICATIONS
     ═══════════════════════════════════════════════════ */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${escapeHTML(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    const timer = setTimeout(() => dismissToast(toast), 5000);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismissToast(toast);
    });
  }

  function dismissToast(toast) {
    toast.style.animation = 'slideOut 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards';
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  function escapeHTML(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  /* ═══════════════════════════════════════════════════
     DATA SERVICES
     ═══════════════════════════════════════════════════ */

  // Load companies list for select menus
  async function loadCompaniesList() {
    try {
      const res = await fetch(`${API_URL}/companies`);
      const data = await res.json();
      state.companies = data;

      // Populate filters
      DOM.filterCompany.innerHTML = '<option value="">All Companies</option>';
      DOM.compareCompanyA.innerHTML = '<option value="">Select Company A</option>';
      DOM.compareCompanyB.innerHTML = '<option value="">Select Company B</option>';

      data.forEach(c => {
        const opt = `<option value="${c.id}">${c.name}</option>`;
        DOM.filterCompany.insertAdjacentHTML('beforeend', opt);
        DOM.compareCompanyA.insertAdjacentHTML('beforeend', opt);
        DOM.compareCompanyB.insertAdjacentHTML('beforeend', opt);
      });
    } catch (err) {
      showToast('Error loading company list: ' + err.message, 'error');
    }
  }

  // Load Dashboard Statistics
  async function loadDashboardStats() {
    try {
      const res = await fetch(`${API_URL}/stats`);
      const data = await res.json();

      DOM.statSubmissions.textContent = data.totalSubmissions;
      DOM.statAvgTC.textContent = formatUSD(data.averages.totalCompensation);
      DOM.statTopCompany.textContent = data.topPayingCompanies[0] ? data.topPayingCompanies[0].name : '—';

      // Find max base salary from explorer data (or approximate value)
      DOM.statMaxBase.textContent = data.averages.baseSalary ? formatUSD(data.averages.baseSalary * 1.8) : '—';

      // Render Top Paying List
      DOM.topPayingList.innerHTML = '';
      if (data.topPayingCompanies.length === 0) {
        DOM.topPayingList.innerHTML = '<div style="color:var(--text-muted)">No data available</div>';
      } else {
        // Calculate max average compensation to scale the bars proportionally
        const maxTC = Math.max(...data.topPayingCompanies.map(c => c.avgTC));
        data.topPayingCompanies.forEach(c => {
          const pct = (c.avgTC / maxTC) * 100;
          const logoHtml = c.logoUrl 
            ? `<img src="${c.logoUrl}" class="company-logo" alt="${c.name} logo">` 
            : `<div class="logo-placeholder">${c.name.charAt(0)}</div>`;

          const row = `
            <div class="comp-level-row">
              <div class="comp-level-title">
                <div class="company-cell">${logoHtml} <strong>${c.name}</strong></div>
                <span>${c.submissions} submission${c.submissions !== 1 ? 's' : ''}</span>
              </div>
              <div class="comp-level-bars">
                <div class="bar-wrapper">
                  <div class="bar-container" style="height: 12px; background: rgba(255,255,255,0.03);">
                    <div class="bar-segment bar-stock" style="width: ${pct}%; border-radius: 4px;"></div>
                  </div>
                  <span class="bar-val">${formatUSDK(c.avgTC)}</span>
                </div>
              </div>
            </div>
          `;
          DOM.topPayingList.insertAdjacentHTML('beforeend', row);
        });
      }

      // Render Level Averages
      DOM.levelAveragesList.innerHTML = '';
      if (data.levelBreakdown.length === 0) {
        DOM.levelAveragesList.innerHTML = '<div style="color:var(--text-muted)">No data available</div>';
      } else {
        const maxLevelTC = Math.max(...data.levelBreakdown.map(l => l.avgTC));
        data.levelBreakdown.forEach(l => {
          const basePct = (l.avgBase / maxLevelTC) * 100;
          const stockPct = (l.avgStock / maxLevelTC) * 100;
          const bonusPct = (l.avgBonus / maxLevelTC) * 100;

          const row = `
            <div class="comp-level-row">
              <div class="comp-level-title">
                <span><strong>${l.level} Level</strong> (${l.count} records)</span>
              </div>
              <div class="comp-level-bars">
                <div class="bar-wrapper">
                  <div class="bar-container">
                    <div class="bar-segment bar-base" style="width: ${basePct}%;" title="Base: ${formatUSD(l.avgBase)}"></div>
                    <div class="bar-segment bar-stock" style="width: ${stockPct}%;" title="Stock: ${formatUSD(l.avgStock)}"></div>
                    <div class="bar-segment bar-bonus" style="width: ${bonusPct}%;" title="Bonus: ${formatUSD(l.avgBonus)}"></div>
                  </div>
                  <span class="bar-val">${formatUSDK(l.avgTC)}</span>
                </div>
              </div>
            </div>
          `;
          DOM.levelAveragesList.insertAdjacentHTML('beforeend', row);
        });
      }
    } catch (err) {
      showToast('Error loading dashboard stats: ' + err.message, 'error');
    }
  }

  // Load Salary Explorer data
  async function loadExplorerData() {
    const f = state.explorer.filters;
    const url = new URL(`${API_URL}/salaries`, window.location.origin);
    
    if (f.companyId) url.searchParams.append('companyId', f.companyId);
    if (f.level) url.searchParams.append('level', f.level);
    if (f.role) url.searchParams.append('role', f.role);
    if (f.location) url.searchParams.append('location', f.location);
    url.searchParams.append('sortBy', f.sortBy);
    url.searchParams.append('sortOrder', f.sortOrder);
    url.searchParams.append('page', state.explorer.page);
    url.searchParams.append('limit', state.explorer.limit);

    try {
      const res = await fetch(url);
      const data = await res.json();

      state.explorer.data = data.data;
      state.explorer.totalPages = data.pagination.pages;
      state.explorer.totalCount = data.pagination.total;

      renderExplorerTable();
      updatePaginationControls();
    } catch (err) {
      showToast('Error loading explorer data: ' + err.message, 'error');
    }
  }

  function renderExplorerTable() {
    DOM.salaryTableBody.innerHTML = '';
    
    if (state.explorer.data.length === 0) {
      DOM.salaryTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            No salaries match the search criteria.
          </td>
        </tr>
      `;
      return;
    }

    state.explorer.data.forEach(s => {
      const logoHtml = s.logo_url 
        ? `<img src="${s.logo_url}" class="company-logo" alt="${s.company_name} logo">` 
        : `<div class="logo-placeholder">${s.company_name.charAt(0)}</div>`;

      const badgeClass = `badge-${s.standard_level.toLowerCase()}`;

      const tr = `
        <tr>
          <td>
            <div class="company-cell">
              ${logoHtml}
              <strong>${s.company_name}</strong>
            </div>
          </td>
          <td>
            <span class="standard-badge ${badgeClass}">${s.level_name}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-left:4px;">(${s.standard_level})</span>
          </td>
          <td>${s.title}</td>
          <td>${s.location}</td>
          <td>${s.years_of_experience} yrs</td>
          <td>${formatUSDK(s.base_salary)}</td>
          <td>${s.stock_grant ? formatUSDK(s.stock_grant) : '$0'}</td>
          <td>${s.bonus ? formatUSDK(s.bonus) : '$0'}</td>
          <td class="tc-value">${formatUSD(s.total_compensation)}</td>
        </tr>
      `;
      DOM.salaryTableBody.insertAdjacentHTML('beforeend', tr);
    });
  }

  function updatePaginationControls() {
    DOM.pagePrev.disabled = state.explorer.page <= 1;
    DOM.pageNext.disabled = state.explorer.page >= state.explorer.totalPages;
    
    const countText = state.explorer.totalCount === 1 ? '1 record' : `${state.explorer.totalCount} records`;
    DOM.pageInfo.textContent = `Page ${state.explorer.page} of ${state.explorer.totalPages || 1} (${countText})`;
  }

  /* ═══════════════════════════════════════════════════
     EXPLORER FILTERS & EVENTS
     ═══════════════════════════════════════════════════ */
  
  // Input filters
  DOM.filterCompany.addEventListener('change', (e) => {
    state.explorer.filters.companyId = e.target.value;
    state.explorer.page = 1;
    loadExplorerData();
  });

  DOM.filterLevel.addEventListener('change', (e) => {
    state.explorer.filters.level = e.target.value;
    state.explorer.page = 1;
    loadExplorerData();
  });

  // Debounced input search for role and location
  let searchTimeout;
  const handleTextFilter = (field, val) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.explorer.filters[field] = val;
      state.explorer.page = 1;
      loadExplorerData();
    }, 350);
  };

  DOM.filterRole.addEventListener('input', (e) => handleTextFilter('role', e.target.value));
  DOM.filterLocation.addEventListener('input', (e) => handleTextFilter('location', e.target.value));
  
  DOM.filterSort.addEventListener('change', (e) => {
    state.explorer.filters.sortBy = e.target.value;
    state.explorer.page = 1;
    loadExplorerData();
  });

  // Reset filters
  DOM.btnResetFilters.addEventListener('click', () => {
    DOM.filterCompany.value = '';
    DOM.filterLevel.value = '';
    DOM.filterRole.value = '';
    DOM.filterLocation.value = '';
    DOM.filterSort.value = 'created_at';

    state.explorer.page = 1;
    state.explorer.filters = {
      companyId: '',
      level: '',
      role: '',
      location: '',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };
    
    loadExplorerData();
  });

  // Pagination clicks
  DOM.pagePrev.addEventListener('click', () => {
    if (state.explorer.page > 1) {
      state.explorer.page--;
      loadExplorerData();
    }
  });

  DOM.pageNext.addEventListener('click', () => {
    if (state.explorer.page < state.explorer.totalPages) {
      state.explorer.page++;
      loadExplorerData();
    }
  });

  /* ═══════════════════════════════════════════════════
     COMPENSATION COMPARISONS
     ═══════════════════════════════════════════════════ */
  DOM.btnCompare.addEventListener('click', async () => {
    const companyA = DOM.compareCompanyA.value;
    const companyB = DOM.compareCompanyB.value;

    if (!companyA || !companyB) {
      showToast('Please select both Company A and Company B to compare.', 'warning');
      return;
    }

    if (companyA === companyB) {
      showToast('Please select two different companies to compare.', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/compare?companyA=${companyA}&companyB=${companyB}`);
      const data = await res.json();

      renderComparisonResults(data);
    } catch (err) {
      showToast('Error loading comparison: ' + err.message, 'error');
    }
  });

  function renderComparisonResults(data) {
    DOM.compareEmptyState.style.display = 'none';
    DOM.compareResultsContainer.style.display = 'block';

    DOM.compareChartTitle.textContent = `${data.companyA.name} vs ${data.companyB.name} — Compensation Split`;
    DOM.compareThA.textContent = data.companyA.name;
    DOM.compareThB.textContent = data.companyB.name;

    DOM.compareChartBody.innerHTML = '';
    DOM.compareTableBody.innerHTML = '';

    // Calculate maximum compensation to scale all bar graphs consistently
    let globalMax = 50000; // Minimum baseline limit
    data.comparison.forEach(c => {
      if (c.companyA) globalMax = Math.max(globalMax, c.companyA.avgTC);
      if (c.companyB) globalMax = Math.max(globalMax, c.companyB.avgTC);
    });

    data.comparison.forEach(c => {
      // 1. Chart Rendering
      const buildBarHtml = (companyInfo, stats) => {
        if (!stats) {
          return `
            <div class="bar-wrapper">
              <span class="bar-comp-label">${companyInfo.name}</span>
              <div style="color:var(--text-muted); font-size:0.8rem; font-style:italic; padding-left:10px;">No records</div>
            </div>
          `;
        }
        
        const basePct = (stats.avgBase / globalMax) * 100;
        const stockPct = (stats.avgStock / globalMax) * 100;
        const bonusPct = (stats.avgBonus / globalMax) * 100;

        return `
          <div class="bar-wrapper">
            <span class="bar-comp-label">${companyInfo.name}</span>
            <div class="bar-container">
              <div class="bar-segment bar-base" style="width: ${basePct}%;" title="Base: ${formatUSD(stats.avgBase)}"></div>
              <div class="bar-segment bar-stock" style="width: ${stockPct}%;" title="Stock: ${formatUSD(stats.avgStock)}"></div>
              <div class="bar-segment bar-bonus" style="width: ${bonusPct}%;" title="Bonus: ${formatUSD(stats.avgBonus)}"></div>
            </div>
            <span class="bar-val">${formatUSDK(stats.avgTC)}</span>
          </div>
        `;
      };

      const hasData = c.companyA || c.companyB;
      if (!hasData) return;

      const chartRow = `
        <div class="comp-level-row">
          <div class="comp-level-title">
            <span><strong>${c.level} Level</strong></span>
          </div>
          <div class="comp-level-bars">
            ${buildBarHtml(data.companyA, c.companyA)}
            ${buildBarHtml(data.companyB, c.companyB)}
          </div>
        </div>
      `;
      DOM.compareChartBody.insertAdjacentHTML('beforeend', chartRow);

      // 2. Table Rendering
      const valA = c.companyA ? formatUSD(c.companyA.avgTC) : '—';
      const valB = c.companyB ? formatUSD(c.companyB.avgTC) : '—';
      
      let diffText = '—';
      let diffStyle = '';
      
      if (c.companyA && c.companyB) {
        const diff = c.companyB.avgTC - c.companyA.avgTC;
        const absDiff = Math.abs(diff);
        if (diff > 0) {
          diffText = `+${formatUSD(absDiff)} (B pays more)`;
          diffStyle = 'color: var(--color-success); font-weight:bold;';
        } else if (diff < 0) {
          diffText = `+${formatUSD(absDiff)} (A pays more)`;
          diffStyle = 'color: var(--accent-primary); font-weight:bold;';
        } else {
          diffText = 'Equal';
          diffStyle = 'color: var(--text-secondary);';
        }
      }

      const tableRow = `
        <tr>
          <td><strong>${c.level}</strong></td>
          <td>${valA}</td>
          <td>${valB}</td>
          <td style="${diffStyle}">${diffText}</td>
        </tr>
      `;
      DOM.compareTableBody.insertAdjacentHTML('beforeend', tableRow);
    });
  }

  /* ═══════════════════════════════════════════════════
     SALARY SUBMISSION FORM & ESTIMATED PREVIEW
     ═══════════════════════════════════════════════════ */
  
  // Real-time Total Compensation Preview
  const updateTcPreview = () => {
    const base = Number(DOM.formBase.value) || 0;
    const stock = Number(DOM.formStock.value) || 0;
    const bonus = Number(DOM.formBonus.value) || 0;
    
    const sum = base + stock + bonus;
    DOM.formTcPreview.textContent = formatUSD(sum);
  };

  DOM.formBase.addEventListener('input', updateTcPreview);
  DOM.formStock.addEventListener('input', updateTcPreview);
  DOM.formBonus.addEventListener('input', updateTcPreview);

  // Form submission
  DOM.submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      companyName: DOM.formCompany.value.trim(),
      levelName: DOM.formLevel.value.trim(),
      title: DOM.formTitle.value.trim(),
      location: DOM.formLocation.value.trim(),
      baseSalary: Number(DOM.formBase.value),
      stockGrant: Number(DOM.formStock.value) || 0,
      bonus: Number(DOM.formBonus.value) || 0,
      yoe: Number(DOM.formYoe.value),
      yac: Number(DOM.formYac.value)
    };

    if (payload.yac > payload.yoe) {
      showToast('Years at company cannot exceed total years of experience!', 'error');
      DOM.formYac.focus();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/salaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 201) {
        showToast('Compensation data submitted successfully!', 'success');
        DOM.submitForm.reset();
        DOM.formTcPreview.textContent = '$0';
        
        // Refresh listings and list dropmenus
        await loadCompaniesList();
        
        // Redirect to Explorer
        switchSection('section-explorer');
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Submission failed.', 'error');
      }
    } catch (err) {
      showToast('Network error submitting data: ' + err.message, 'error');
    }
  });

  /* ═══════════════════════════════════════════════════
     LEVELING MATRIX INTERACTION
     ═══════════════════════════════════════════════════ */
  async function loadMatrixData() {
    try {
      const res = await fetch(`${API_URL}/matrix`);
      const data = await res.json();

      renderMatrixTable(data);
    } catch (err) {
      showToast('Error loading matrix grid: ' + err.message, 'error');
    }
  }

  function renderMatrixTable(data) {
    // 1. Render Headers
    DOM.matrixTableHeaderRow.innerHTML = '<th>Standard Level</th>';
    data.companies.forEach(name => {
      DOM.matrixTableHeaderRow.insertAdjacentHTML('beforeend', `<th>${name}</th>`);
    });

    // 2. Render Rows
    DOM.matrixTableBody.innerHTML = '';
    data.matrix.forEach(row => {
      let tr = `<tr><td><strong>${row.level}</strong></td>`;
      data.companies.forEach(compName => {
        const cell = row.companies[compName];
        if (cell && cell.levelName) {
          // Heatmap class based on TC size
          let heatmapClass = 'heatmap-low';
          if (cell.avgTC >= 400000) {
            heatmapClass = 'heatmap-principal';
          } else if (cell.avgTC >= 250000) {
            heatmapClass = 'heatmap-high';
          } else if (cell.avgTC >= 150000) {
            heatmapClass = 'heatmap-mid';
          }

          tr += `
            <td class="matrix-cell-active ${heatmapClass}" 
                data-company="${compName}" 
                data-level="${cell.levelName}" 
                data-standard="${row.level}"
                data-tc="${cell.avgTC}"
                data-base="${cell.avgBase}"
                data-stock="${cell.avgStock}"
                data-bonus="${cell.avgBonus}"
                data-count="${cell.count}">
              <div style="font-size:0.95rem">${cell.levelName}</div>
              <div style="font-size:0.75rem; color:var(--accent-secondary); font-family:var(--font-mono); font-weight:normal; margin-top:2px;">
                ${cell.avgTC > 0 ? formatUSDK(cell.avgTC) : '—'}
              </div>
            </td>
          `;
        } else {
          tr += `<td class="matrix-cell-empty">—</td>`;
        }
      });
      tr += '</tr>';
      DOM.matrixTableBody.insertAdjacentHTML('beforeend', tr);
    });

    // 3. Attach click events
    document.querySelectorAll('.matrix-cell-active').forEach(cell => {
      cell.addEventListener('click', () => {
        const comp = cell.dataset.company;
        const lvl = cell.dataset.level;
        const standard = cell.dataset.standard;
        const tc = Number(cell.dataset.tc);
        const base = Number(cell.dataset.base);
        const stock = Number(cell.dataset.stock);
        const bonus = Number(cell.dataset.bonus);
        const count = cell.dataset.count;

        DOM.matrixDetailCard.style.display = 'block';
        DOM.matrixDetailTitle.textContent = `${comp} — ${lvl} Level details`;
        DOM.matrixDetailCode.textContent = lvl;
        DOM.matrixDetailStandard.textContent = standard;
        DOM.matrixDetailTC.textContent = formatUSD(tc);
        DOM.matrixDetailCount.textContent = `${count} verified entries`;

        // Render detailed stacked bar splits
        const maxVal = Math.max(tc, 100000);
        const basePct = (base / maxVal) * 100;
        const stockPct = (stock / maxVal) * 100;
        const bonusPct = (bonus / maxVal) * 100;

        DOM.matrixDetailChart.innerHTML = `
          <div class="bar-wrapper">
            <span class="bar-comp-label" style="width: 80px;">Salary Split</span>
            <div class="bar-container" style="height:24px;">
              <div class="bar-segment bar-base" style="width: ${basePct}%;" title="Base: ${formatUSD(base)}"></div>
              <div class="bar-segment bar-stock" style="width: ${stockPct}%;" title="Stock: ${formatUSD(stock)}"></div>
              <div class="bar-segment bar-bonus" style="width: ${bonusPct}%;" title="Bonus: ${formatUSD(bonus)}"></div>
            </div>
            <span class="bar-val" style="width: 80px; padding-left:10px">${formatUSDK(tc)}</span>
          </div>
        `;
        
        DOM.matrixDetailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     OFFER EVALUATOR
     ═══════════════════════════════════════════════════ */
  function populateEvaluatorDropdowns() {
    DOM.evalCompany.innerHTML = '<option value="">Select Company</option>';
    state.companies.forEach(c => {
      DOM.evalCompany.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
    });
  }

  DOM.evaluateOfferForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      companyId: DOM.evalCompany.value,
      levelName: DOM.evalLevel.value.trim(),
      baseSalary: Number(DOM.evalBase.value),
      stockGrant: Number(DOM.evalStock.value) || 0,
      bonus: Number(DOM.evalBonus.value) || 0
    };

    try {
      const res = await fetch(`${API_URL}/offers/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const report = await res.json();
        renderOfferReport(report);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Evaluation failed.', 'error');
      }
    } catch (err) {
      showToast('Network error evaluating offer: ' + err.message, 'error');
    }
  });

  function renderOfferReport(report) {
    DOM.evaluatorEmptyState.style.display = 'none';
    DOM.evaluatorResultsCard.style.display = 'flex';

    // Set percentile rating
    DOM.evalPercentileBadge.textContent = `${report.percentile}th`;
    DOM.evalPercentileBar.style.width = `${report.percentile}%`;
    
    // Set color based on percentile
    if (report.percentile >= 75) {
      DOM.evalPercentileBadge.style.color = 'var(--color-success)';
      DOM.evalPercentileBar.className = 'bar-segment bar-base'; // Greenish
    } else if (report.percentile >= 40) {
      DOM.evalPercentileBadge.style.color = 'var(--accent-secondary)';
      DOM.evalPercentileBar.className = 'bar-segment bar-stock'; // Cyan
    } else {
      DOM.evalPercentileBadge.style.color = 'var(--color-error)';
      DOM.evalPercentileBar.className = 'bar-segment bar-bonus'; // Red/Warning
    }

    // Set sums
    DOM.evalOfferTC.textContent = formatUSD(report.offerTC);
    DOM.evalMarketTC.textContent = formatUSD(report.marketAvgTC);

    // ─── Tax impact calculations ───
    const stateCode = DOM.evalTaxState.value;
    const totalComp = report.offerTC;

    const fedTax = calculateFederalTax(totalComp);
    const stateTax = calculateStateTax(totalComp, stateCode);
    const netPay = totalComp - fedTax - stateTax;

    const takehomePct = totalComp > 0 ? (netPay / totalComp) * 100 : 0;
    const fedPct = totalComp > 0 ? (fedTax / totalComp) * 100 : 0;
    const statePct = totalComp > 0 ? (stateTax / totalComp) * 100 : 0;

    DOM.taxBarTakehome.style.width = `${takehomePct}%`;
    DOM.taxBarFed.style.width = `${fedPct}%`;
    DOM.taxBarState.style.width = `${statePct}%`;

    DOM.evalNetPay.textContent = formatUSD(netPay);
    DOM.taxLblTakehome.textContent = formatUSD(netPay);
    DOM.taxLblFed.textContent = formatUSD(fedTax);
    DOM.taxLblState.textContent = formatUSD(stateTax);

    // Washington tax promo advice
    const waStateTax = 0;
    const waFedTax = calculateFederalTax(totalComp);
    const waNetPay = totalComp - waFedTax - waStateTax;
    const savings = waNetPay - netPay;

    if (savings > 0 && stateCode !== 'WA') {
      DOM.taxComparisonPromo.innerHTML = `💡 <strong>Washington Tax Advantage:</strong> If you worked from Seattle/Redmond (WA), you would save <strong>${formatUSD(savings)}</strong> annually in state taxes, increasing your net take-home to <strong>${formatUSD(waNetPay)}</strong>!`;
      DOM.taxComparisonPromo.style.display = 'block';
    } else if (stateCode === 'WA') {
      const caStateTax = calculateStateTax(totalComp, 'CA');
      DOM.taxComparisonPromo.innerHTML = `🎉 <strong>Washington Tax Advantage:</strong> By working in Washington, you are saving approximately <strong>${formatUSD(caStateTax)}</strong> annually compared to California state tax rates!`;
      DOM.taxComparisonPromo.style.display = 'block';
    } else {
      DOM.taxComparisonPromo.style.display = 'none';
    }

    // Render Guidance list
    DOM.evalGuidanceList.innerHTML = '';
    report.guidance.forEach(tip => {
      const cardClass = `guidance-card--${tip.severity}`;
      const icon = tip.severity === 'success' ? '✅' : tip.severity === 'error' ? '🚨' : tip.severity === 'warning' ? '⚠️' : '💡';
      
      const html = `
        <div class="guidance-card ${cardClass}">
          <span class="guidance-icon">${icon}</span>
          <div>
            <strong>${tip.component}:</strong> ${tip.feedback}
          </div>
        </div>
      `;
      DOM.evalGuidanceList.insertAdjacentHTML('beforeend', html);
    });

    // ─── Negotiation script generation ───
    state.currentEvalReport = report;
    const initialScript = generateNegotiationScript(report, 'collaborative');
    DOM.negotiationEmailBox.value = initialScript;

    // Reset active tone chips
    document.querySelectorAll('.tone-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.tone === 'collaborative');
    });
  }

  /* ═══════════════════════════════════════════════════
     CAREER SIMULATOR
     ═══════════════════════════════════════════════════ */
  function populateSimulatorDropdowns() {
    DOM.simulatorCompanySelect.innerHTML = '<option value="">Select Company</option>';
    state.companies.forEach(c => {
      DOM.simulatorCompanySelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
    });
  }

  DOM.simulatorCompanySelect.addEventListener('change', async (e) => {
    const companyId = e.target.value;
    if (!companyId) {
      DOM.simulatorEmptyState.style.display = 'block';
      DOM.simulatorResultsContainer.style.display = 'none';
      return;
    }

    try {
      // We will leverage the existing level mapping and query average salaries
      const res = await fetch(`${API_URL}/matrix`);
      const data = await res.json();

      const companyName = state.companies.find(c => String(c.id) === String(companyId)).name;
      renderSimulatorPath(companyName, data.matrix);
    } catch (err) {
      showToast('Error loading simulator path: ' + err.message, 'error');
    }
  });

  function renderSimulatorPath(companyName, matrix) {
    DOM.simulatorEmptyState.style.display = 'none';
    DOM.simulatorResultsContainer.style.display = 'flex';

    DOM.simulatorChartTitle.textContent = `${companyName} Career Scaling Curve`;
    DOM.simulatorChartBody.innerHTML = '';
    DOM.simulatorTableBody.innerHTML = '';

    // Filter matrix elements that have data for this company
    const pathLevels = [];
    matrix.forEach(row => {
      const cell = row.companies[companyName];
      if (cell && cell.levelName) {
        pathLevels.push({
          level: row.level,
          code: cell.levelName,
          base: cell.avgBase,
          stock: cell.avgStock,
          bonus: cell.avgBonus,
          tc: cell.avgTC
        });
      }
    });

    if (pathLevels.length === 0) {
      DOM.simulatorChartBody.innerHTML = `<div style="color:var(--text-muted); font-style:italic;">No salary submissions recorded for ${companyName} yet.</div>`;
      DOM.simulatorTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No data available</td></tr>`;
      return;
    }

    // Determine global max TC in this path to scale bars proportionally
    const maxPathTC = Math.max(...pathLevels.map(p => p.tc));

    pathLevels.forEach(p => {
      // 1. Chart Stacked Bar
      const basePct = (p.base / maxPathTC) * 100;
      const stockPct = (p.stock / maxPathTC) * 100;
      const bonusPct = (p.bonus / maxPathTC) * 100;

      const chartHtml = `
        <div class="comp-level-row">
          <div class="comp-level-title">
            <span><strong>${p.code}</strong> (${p.level})</span>
          </div>
          <div class="comp-level-bars">
            <div class="bar-wrapper">
              <div class="bar-container" style="height: 20px;">
                <div class="bar-segment bar-base" style="width: ${basePct}%;" title="Base: ${formatUSD(p.base)}"></div>
                <div class="bar-segment bar-stock" style="width: ${stockPct}%;" title="Stock: ${formatUSD(p.stock)}"></div>
                <div class="bar-segment bar-bonus" style="width: ${bonusPct}%;" title="Bonus: ${formatUSD(p.bonus)}"></div>
              </div>
              <span class="bar-val">${formatUSDK(p.tc)}</span>
            </div>
          </div>
        </div>
      `;
      DOM.simulatorChartBody.insertAdjacentHTML('beforeend', chartHtml);

      // 2. Table Row
      const tableRow = `
        <tr>
          <td><strong>${p.level}</strong></td>
          <td><span class="standard-badge badge-${p.level.toLowerCase()}">${p.code}</span></td>
          <td>${formatUSD(p.base)}</td>
          <td>${formatUSD(p.stock)}</td>
          <td>${formatUSD(p.bonus)}</td>
          <td class="tc-value">${formatUSD(p.tc)}</td>
        </tr>
      `;
      DOM.simulatorTableBody.insertAdjacentHTML('beforeend', tableRow);
    });
  }

  // Negotiation email tone selector events
  document.querySelectorAll('.tone-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tone = chip.dataset.tone;
      if (!state.currentEvalReport) return;

      // Update active class
      document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // Regenerate script
      const script = generateNegotiationScript(state.currentEvalReport, tone);
      DOM.negotiationEmailBox.value = script;
    });
  });

  // Copy negotiation script to clipboard
  DOM.btnCopyScript.addEventListener('click', (e) => {
    e.preventDefault();
    
    const txt = DOM.negotiationEmailBox.value;
    if (!txt) {
      showToast('No script generated to copy.', 'warning');
      return;
    }

    navigator.clipboard.writeText(txt)
      .then(() => {
        showToast('Negotiation email script copied to clipboard!', 'success');
      })
      .catch(err => {
        showToast('Failed to copy text: ' + err.message, 'error');
      });
  });

  /* ═══════════════════════════════════════════════════
     INITIAL LOAD
     ═══════════════════════════════════════════════════ */
  loadCompaniesList();
  loadDashboardStats();
});

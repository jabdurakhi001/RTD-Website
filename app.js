// ============================================
// GOOGLE SHEETS CONFIGURATION
// ============================================

const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKG0iRXlzOb2u5OffLyk07haEtgJsnRRiG9t97ZW60mUkLzPKDIxdyFL4RCCy67TDuEVkoTefM2LbT/pub?gid=0&single=true&output=csv';

// Global inventory object - will be populated from Google Sheets
let INVENTORY = {
  trucks: [],
  trailers: []
};

// ============================================
// CSV PARSER AND DATA LOADER
// ============================================

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;

    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim().toLowerCase()] = values[index] ? values[index].trim() : '';
    });

    data.push(row);
  }

  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map(val => val.replace(/^"|"$/g, '').trim());
}

// Convert Google Drive share links to direct image URLs
function convertGoogleDriveUrl(url) {
  if (!url) return '';

  const drivePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of drivePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return url;
}

/**
 * Supports multiple image URLs in a single cell (comma-separated or pipe-separated)
 * Example: "url1, url2, url3" OR "url1|url2|url3"
 */
function parseImagesCell(value) {
  if (!value) return [];
  const raw = String(value).trim();
  if (!raw) return [];

  const parts = raw.includes('|') ? raw.split('|') : raw.split(',');
  return parts
    .map(s => s.trim())
    .filter(Boolean)
    .map(convertGoogleDriveUrl);
}

function transformSheetData(rawData) {
  const inventory = {
    trucks: [],
    trailers: []
  };

  rawData.forEach(row => {
    const type = (row.type || 'truck').toLowerCase();

    const images = parseImagesCell(row.image || row.images || '');
    const item = {
      // IMPORTANT: Asset ID is your "id"
      id: row.id || '',
      type,
      year: parseInt(row.year) || new Date().getFullYear(),
      make: row.make || '',
      model: row.model || '',
      mileage: row.mileage ? parseInt(row.mileage) : null,
      price: row.price ? parseInt(row.price) : null,
      status: (row.status || 'available').toLowerCase(),
      location: row.location || '',
      // keep single image for backward compatibility
      image: images[0] || convertGoogleDriveUrl(row.image || ''),
      // new: images array
      images,
      description: row.description || '',
      highlights: row.highlights ? row.highlights.split(',').map(h => h.trim()).filter(Boolean) : [],
      lengthFt: row.lengthft ? parseInt(row.lengthft) : (row.length ? parseInt(row.length) : 53)
    };

    if (item.type === 'trailer') {
      inventory.trailers.push(item);
    } else {
      inventory.trucks.push(item);
    }
  });

  return inventory;
}

async function loadInventoryFromSheet() {
  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch inventory data');

    const csvText = await response.text();
    const rawData = parseCSV(csvText);
    INVENTORY = transformSheetData(rawData);

    console.log('Inventory loaded from Google Sheets:', INVENTORY);
    return INVENTORY;
  } catch (error) {
    console.error('Error loading inventory:', error);
    return { trucks: [], trailers: [] };
  }
}

// ============================================
// FALLBACK DATA (used if Google Sheets fails)
// ============================================

const FALLBACK_INVENTORY = {
  trucks: [
    {
      id: 'T001',
      type: 'truck',
      year: 2024,
      make: 'Freightliner',
      model: 'Cascadia',
      mileage: 45000,
      price: 125000,
      status: 'available',
      location: 'St. Charles, MO',
      image: '',
      images: [],
      description: 'Well-maintained Freightliner Cascadia with low mileage.',
      highlights: ['Detroit DD15 Engine', 'Automated Transmission', 'APU Equipped', 'Sleeper Cab']
    },
    {
      id: 'T002',
      type: 'truck',
      year: 2023,
      make: 'Volvo',
      model: 'VNL860',
      mileage: 78000,
      price: 115000,
      status: 'available',
      location: 'St. Charles, MO',
      image: '',
      images: [],
      description: 'Premium Volvo VNL860 with excellent fuel efficiency.',
      highlights: ['Volvo D13 Engine', 'I-Shift Transmission', 'Full Aero Package', 'Premium Interior']
    }
  ],
  trailers: [
    {
      id: 'TR001',
      type: 'trailer',
      year: 2022,
      make: 'Great Dane',
      model: 'Dry Van',
      lengthFt: 53,
      mileage: null,
      price: 35000,
      status: 'available',
      location: 'St. Charles, MO',
      image: '',
      images: [],
      description: 'Great Dane dry van trailer in excellent condition.',
      highlights: ['Swing Doors', 'LED Lights', 'Air Ride Suspension']
    }
  ]
};

/**
 * Use fallback if Google Sheets fails
 */
function useFallbackInventory() {
  INVENTORY = FALLBACK_INVENTORY;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatPrice(price) {
  if (price === null || price === undefined) return 'Call for Price';
  return '$' + price.toLocaleString('en-US');
}

function formatMileage(mileage) {
  if (mileage === null || mileage === undefined) return 'N/A';
  return mileage.toLocaleString('en-US') + ' mi';
}

function getUniqueValues(items, key) {
  const values = items
    .map(item => item[key])
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '');

  return [...new Set(values)].sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeStatus(s) {
  const val = String(s || '').toLowerCase().trim();
  if (!val) return 'available';
  if (val === 'in stock') return 'available';
  return val;
}

function getMinInventoryYear(inventory) {
  const all = [...(inventory.trucks || []), ...(inventory.trailers || [])];
  const years = all.map(i => i.year).filter(y => typeof y === 'number' && !Number.isNaN(y));
  if (!years.length) return null;
  return Math.min(...years);
}

function setFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

// ============================================
// NAVIGATION (supports both home + sales markup)
// ============================================

function initNavigation() {
  // Find the toggle button (shared class across pages)
  const toggle = document.querySelector('.navbar-toggle');

  // Find the mobile menu panel - try sales page first, then home page
  const mobileMenu = document.getElementById('mobile-menu-sales') || document.getElementById('mobile-menu');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.classList.toggle('active');
      mobileMenu.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    });

    // Close when clicking links
    const links = mobileMenu.querySelectorAll('a');
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('active');
        mobileMenu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', function (event) {
      if (!mobileMenu.contains(event.target) && !toggle.contains(event.target)) {
        mobileMenu.classList.remove('active');
        mobileMenu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// ============================================
// FAQ ACCORDION
// ============================================

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (question && answer) {
      question.addEventListener('click', function () {
        const isOpen = item.classList.contains('active');

        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
          }
        });

        item.classList.toggle('active');
        if (!isOpen) answer.style.maxHeight = answer.scrollHeight + 'px';
        else answer.style.maxHeight = null;
      });
    }
  });
}

// ============================================
// CONTACT FORM (unchanged)
// ============================================

function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const errorElements = contactForm.querySelectorAll('.error-message');
    errorElements.forEach(function (el) { el.remove(); });

    const inputErrors = contactForm.querySelectorAll('.input-error');
    inputErrors.forEach(function (el) { el.classList.remove('input-error'); });

    const nameField = contactForm.querySelector('#name');
    const emailField = contactForm.querySelector('#email');
    const phoneField = contactForm.querySelector('#phone');
    const messageField = contactForm.querySelector('#message');

    let isValid = true;

    if (nameField && nameField.value.trim() === '') {
      showFieldError(nameField, 'Name is required');
      isValid = false;
    }

    if (emailField) {
      const emailValue = emailField.value.trim();
      if (emailValue === '') {
        showFieldError(emailField, 'Email is required');
        isValid = false;
      } else if (!isValidEmail(emailValue)) {
        showFieldError(emailField, 'Please enter a valid email address');
        isValid = false;
      }
    }

    if (phoneField && phoneField.value.trim() !== '') {
      if (!isValidPhone(phoneField.value.trim())) {
        showFieldError(phoneField, 'Please enter a valid phone number');
        isValid = false;
      }
    }

    if (messageField && messageField.value.trim() === '') {
      showFieldError(messageField, 'Message is required');
      isValid = false;
    }

    if (isValid) {
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.innerHTML =
        '<strong>Thank you!</strong> Your message has been sent successfully. We will get back to you within 24 hours.';
      contactForm.insertBefore(successMessage, contactForm.firstChild);

      contactForm.reset();

      setTimeout(function () {
        successMessage.remove();
      }, 5000);
    }
  });

  function showFieldError(field, message) {
    field.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
    return phoneRegex.test(phone);
  }
}

// ============================================
// INVENTORY MANAGER CLASS
// ============================================

class InventoryManager {
  constructor() {
    this.currentTab = 'trucks';

    this.filters = {
      assetIdQuery: '',
      years: [],
      makes: [],
      models: [],
      statuses: [],

      mileageMin: null,
      mileageMax: null,
      priceMin: null,
      priceMax: null
    };

    this.sortBy = 'price_asc';
    this.currentPage = 1;

    // DEFAULT: matches your new UI selector options
    this.itemsPerPage = 10; // can become Infinity for "all"
  }

  async init() {
    const salesPage = document.querySelector('.inventory-section');
    if (!salesPage) return;

    setFooterYear();

    const gridElement = document.getElementById('inventory-grid');
    if (gridElement) {
      gridElement.innerHTML = '<div class="loading-message"><p>Loading inventory...</p></div>';
    }

    try {
      await loadInventoryFromSheet();
      if (INVENTORY.trucks.length === 0 && INVENTORY.trailers.length === 0) {
        console.log('No data from Google Sheets, using fallback');
        useFallbackInventory();
      }
    } catch (error) {
      console.error('Failed to load from Google Sheets:', error);
      useFallbackInventory();
    }

    // Update homepage year highlight if present (optional hook)
    this.updateMinYearHighlight();

    this.bindEvents();
    this.bindRangeInputs();
    this.populateFilters();
    this.applyTabUIRules();
    this.render();
  }

  updateMinYearHighlight() {
    // If you add an element with id="min-inventory-year" on index.html,
    // this will auto-populate it.
    const el = document.getElementById('min-inventory-year');
    if (!el) return;
    const minYear = getMinInventoryYear(INVENTORY);
    if (minYear) el.textContent = String(minYear);
  }

  applyTabUIRules() {
    const mileageGroup = document.getElementById('mileage-filter-group');

    // Hide mileage range filters when viewing trailers (commonly null)
    if (mileageGroup) {
      mileageGroup.style.display = this.currentTab === 'trailers' ? 'none' : '';
    }
  }

  bindRangeInputs() {
    const self = this;
    let debounceTimer;

    const rangeInputs = ['mileage-min', 'mileage-max', 'price-min', 'price-max'];

    rangeInputs.forEach(function (inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;

      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          self.applyFilters();
        }, 350);
      });
    });
  }

  bindEvents() {
    const self = this;

    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        self.currentTab = tab.dataset.tab;
        self.currentPage = 1;

        self.resetFilters(); // also repopulates filters based on tab
        self.applyTabUIRules();
      });
    });

    // Sort change
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        self.sortBy = sortSelect.value;
        self.currentPage = 1;
        self.render();
      });
    }

    // Results per page
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', function () {
        const v = pageSizeSelect.value;
        self.itemsPerPage = v === 'all' ? Infinity : parseInt(v, 10);
        self.currentPage = 1;
        self.render();
      });
    }

    // Apply filters button
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        self.applyFilters();
      });
    }

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        self.resetFilters();
      });
    }

    // Asset ID search (live)
    const assetSearch = document.getElementById('asset-id-search');
    if (assetSearch) {
      let t;
      assetSearch.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          self.filters.assetIdQuery = assetSearch.value.trim();
          self.currentPage = 1;
          self.render();
        }, 200);
      });
    }

    // Filter group collapse
    const filterHeaders = document.querySelectorAll('.filter-group-header');
    filterHeaders.forEach(function (header) {
      header.addEventListener('click', function () {
        const group = header.parentElement;
        group.classList.toggle('collapsed');
      });
    });
  }

  populateFilters() {
    const self = this;
    const items = INVENTORY[this.currentTab] || [];

    // counts
    const yearCounts = {};
    const makeCounts = {};
    const modelCounts = {};
    const statusCounts = {};

    items.forEach(function (item) {
      const y = item.year;
      const mk = item.make || '';
      const md = item.model || '';
      const st = normalizeStatus(item.status);

      yearCounts[y] = (yearCounts[y] || 0) + 1;
      makeCounts[mk] = (makeCounts[mk] || 0) + 1;
      modelCounts[md] = (modelCounts[md] || 0) + 1;
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // YEAR
    const yearContainer = document.getElementById('year-filters');
    if (yearContainer) {
      const years = getUniqueValues(items, 'year').reverse(); // newest first
      yearContainer.innerHTML = '';
      years.forEach(function (year) {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML =
          '<input type="checkbox" value="' +
          year +
          '"> ' +
          year +
          ' <span class="filter-option__count">(' +
          (yearCounts[year] || 0) +
          ')</span>';

        yearContainer.appendChild(label);

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function () {
          self.applyFilters();
        });
      });
    }

    // MAKE
    const makeContainer = document.getElementById('make-filters');
    if (makeContainer) {
      const makes = getUniqueValues(items, 'make');
      makeContainer.innerHTML = '';
      makes.forEach(function (make) {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML =
          '<input type="checkbox" value="' +
          escapeHtml(make) +
          '"> ' +
          escapeHtml(make) +
          ' <span class="filter-option__count">(' +
          (makeCounts[make] || 0) +
          ')</span>';

        makeContainer.appendChild(label);

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function () {
          self.applyFilters();
        });
      });
    }

    // MODEL (ADDED)
    const modelContainer = document.getElementById('model-filters');
    if (modelContainer) {
      const models = getUniqueValues(items, 'model');
      modelContainer.innerHTML = '';
      models.forEach(function (model) {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML =
          '<input type="checkbox" value="' +
          escapeHtml(model) +
          '"> ' +
          escapeHtml(model) +
          ' <span class="filter-option__count">(' +
          (modelCounts[model] || 0) +
          ')</span>';

        modelContainer.appendChild(label);

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function () {
          self.applyFilters();
        });
      });
    }

    // STATUS (ADDED)
    const statusContainer = document.getElementById('status-filters');
    if (statusContainer) {
      const statuses = getUniqueValues(
        items.map(i => ({ status: normalizeStatus(i.status) })),
        'status'
      );

      // fallback ordering if empty
      const ordered = statuses.length ? statuses : ['available', 'pending', 'sold'];

      statusContainer.innerHTML = '';
      ordered.forEach(function (status) {
        const pretty = status.charAt(0).toUpperCase() + status.slice(1);
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML =
          '<input type="checkbox" value="' +
          escapeHtml(status) +
          '"> ' +
          escapeHtml(pretty) +
          ' <span class="filter-option__count">(' +
          (statusCounts[status] || 0) +
          ')</span>';

        statusContainer.appendChild(label);

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function () {
          self.applyFilters();
        });
      });
    }
  }

  applyFilters() {
    // years
    const yearCheckboxes = document.querySelectorAll('#year-filters input:checked');
    this.filters.years = Array.from(yearCheckboxes).map(cb => parseInt(cb.value, 10));

    // makes
    const makeCheckboxes = document.querySelectorAll('#make-filters input:checked');
    this.filters.makes = Array.from(makeCheckboxes).map(cb => cb.value);

    // models
    const modelCheckboxes = document.querySelectorAll('#model-filters input:checked');
    this.filters.models = Array.from(modelCheckboxes).map(cb => cb.value);

    // statuses
    const statusCheckboxes = document.querySelectorAll('#status-filters input:checked');
    this.filters.statuses = Array.from(statusCheckboxes).map(cb => normalizeStatus(cb.value));

    // assetIdQuery
    const assetSearch = document.getElementById('asset-id-search');
    this.filters.assetIdQuery = assetSearch ? assetSearch.value.trim() : '';

    // range
    const mileageMin = document.getElementById('mileage-min');
    const mileageMax = document.getElementById('mileage-max');
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');

    // mileage only for trucks (trailers hidden)
    this.filters.mileageMin =
      this.currentTab === 'trucks' && mileageMin && mileageMin.value ? parseInt(mileageMin.value, 10) : null;
    this.filters.mileageMax =
      this.currentTab === 'trucks' && mileageMax && mileageMax.value ? parseInt(mileageMax.value, 10) : null;

    this.filters.priceMin = priceMin && priceMin.value ? parseInt(priceMin.value, 10) : null;
    this.filters.priceMax = priceMax && priceMax.value ? parseInt(priceMax.value, 10) : null;

    this.currentPage = 1;
    this.render();
  }

  resetFilters() {
    // Clear all checkboxes
    const checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    checkboxes.forEach(cb => (cb.checked = false));

    // Clear range inputs
    const rangeInputs = document.querySelectorAll('.filter-group input[type="number"]');
    rangeInputs.forEach(input => (input.value = ''));

    // Clear asset id search
    const assetSearch = document.getElementById('asset-id-search');
    if (assetSearch) assetSearch.value = '';

    // Reset filters object
    this.filters = {
      assetIdQuery: '',
      years: [],
      makes: [],
      models: [],
      statuses: [],
      mileageMin: null,
      mileageMax: null,
      priceMin: null,
      priceMax: null
    };

    this.currentPage = 1;
    this.populateFilters();
    this.render();
  }

  getFilteredItems() {
    const self = this;
    let items = (INVENTORY[this.currentTab] || []).slice();

    // Asset ID search (contains)
    if (this.filters.assetIdQuery) {
      const q = this.filters.assetIdQuery.toLowerCase();
      items = items.filter(item => String(item.id || '').toLowerCase().includes(q));
    }

    // Year
    if (this.filters.years.length > 0) {
      items = items.filter(item => self.filters.years.includes(item.year));
    }

    // Make
    if (this.filters.makes.length > 0) {
      items = items.filter(item => self.filters.makes.includes(item.make));
    }

    // Model
    if (this.filters.models.length > 0) {
      items = items.filter(item => self.filters.models.includes(item.model));
    }

    // Status
    if (this.filters.statuses.length > 0) {
      items = items.filter(item => self.filters.statuses.includes(normalizeStatus(item.status)));
    }

    // Mileage (trucks only)
    if (this.currentTab === 'trucks') {
      if (this.filters.mileageMin !== null) {
        items = items.filter(item => item.mileage === null || item.mileage >= self.filters.mileageMin);
      }
      if (this.filters.mileageMax !== null) {
        items = items.filter(item => item.mileage === null || item.mileage <= self.filters.mileageMax);
      }
    }

    // Price
    if (this.filters.priceMin !== null) {
      items = items.filter(item => item.price !== null && item.price >= self.filters.priceMin);
    }
    if (this.filters.priceMax !== null) {
      items = items.filter(item => item.price !== null && item.price <= self.filters.priceMax);
    }

    return items;
  }

  sortItems(items) {
    const sortedItems = items.slice();
    const [sortField, sortOrder] = this.sortBy.split('_');

    sortedItems.sort(function (a, b) {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

      if (typeof aVal === 'string' || typeof bVal === 'string') {
        aVal = String(aVal);
        bVal = String(bVal);
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sortedItems;
  }

  render() {
    const self = this;

    let items = this.getFilteredItems();
    items = this.sortItems(items);

    const countElement = document.getElementById('results-count');
    if (countElement) countElement.textContent = String(items.length);

    // Pagination / Per-page
    const totalPages =
      this.itemsPerPage === Infinity ? 1 : Math.max(1, Math.ceil(items.length / this.itemsPerPage));

    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIndex = this.itemsPerPage === Infinity ? 0 : (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = this.itemsPerPage === Infinity ? items.length : startIndex + this.itemsPerPage;

    const paginatedItems = items.slice(startIndex, endIndex);

    const gridElement = document.getElementById('inventory-grid');
    const noResults = document.getElementById('no-results');

    if (gridElement) {
      if (paginatedItems.length === 0) {
        gridElement.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
      } else {
        if (noResults) noResults.style.display = 'none';
        gridElement.innerHTML = paginatedItems.map(item => self.renderCard(item)).join('');
        this.bindCardEvents(); // for image cycling + buttons
      }
    }

    this.renderPagination(totalPages);
  }

  renderCard(item) {
    const status = normalizeStatus(item.status);
    const statusClass = 'status-' + status;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    const assetIdHtml = `<p class="card-id"><strong>Asset ID:</strong> ${escapeHtml(item.id)}</p>`;

    let specsHtml = '';
    if (item.type === 'truck') {
      specsHtml =
        '<span class="spec"><strong>Year:</strong> ' +
        item.year +
        '</span>' +
        '<span class="spec"><strong>Make:</strong> ' +
        escapeHtml(item.make) +
        '</span>' +
        '<span class="spec"><strong>Model:</strong> ' +
        escapeHtml(item.model) +
        '</span>' +
        '<span class="spec"><strong>Mileage:</strong> ' +
        escapeHtml(formatMileage(item.mileage)) +
        '</span>';
    } else {
      specsHtml =
        '<span class="spec"><strong>Year:</strong> ' +
        item.year +
        '</span>' +
        '<span class="spec"><strong>Make:</strong> ' +
        escapeHtml(item.make) +
        '</span>' +
        '<span class="spec"><strong>Type/Model:</strong> ' +
        escapeHtml(item.model) +
        '</span>' +
        '<span class="spec"><strong>Length:</strong> ' +
        (item.lengthFt || 53) +
        ' ft</span>';
    }

    const highlightsHtml = (item.highlights || [])
      .map(h => '<li>' + escapeHtml(h) + '</li>')
      .join('');

    const imgs = Array.isArray(item.images) && item.images.length ? item.images : (item.image ? [item.image] : []);
    const firstImg = imgs[0] || '';

    // Minimal multi-image support: click "Next Photo" to cycle.
    let imageHtml = '';
    if (firstImg) {
      imageHtml =
        `<img class="card-img" src="${escapeHtml(firstImg)}" ` +
        `data-images="${escapeHtml(imgs.join('|'))}" data-img-index="0" ` +
        `alt="${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)}" loading="lazy" ` +
        `onerror="this.parentElement.innerHTML='<div class=&quot;image-placeholder&quot;><span class=&quot;placeholder-icon&quot;>&#128666;</span><span class=&quot;placeholder-text&quot;>${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)}</span></div>'">`;
    } else {
      imageHtml =
        `<div class="image-placeholder">` +
        `<span class="placeholder-icon">&#128666;</span>` +
        `<span class="placeholder-text">${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)}</span>` +
        `</div>`;
    }

    const nextPhotoBtn =
      imgs.length > 1
        ? `<button class="photo-next" type="button" aria-label="Next photo">Next Photo</button>`
        : '';

    return (
      `<div class="inventory-card" data-id="${escapeHtml(item.id)}">` +
      `<div class="card-image">` +
      imageHtml +
      nextPhotoBtn +
      `<span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span>` +
      `</div>` +
      `<div class="card-content">` +
      `<h3 class="card-title">${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)}</h3>` +
      assetIdHtml +
      `<p class="card-location">${escapeHtml(item.location || '')}</p>` +
      `<div class="card-specs">${specsHtml}</div>` +
      `<p class="card-description">${escapeHtml(item.description || '')}</p>` +
      `<ul class="card-highlights">${highlightsHtml}</ul>` +
      `<div class="card-footer">` +
      `<span class="card-price">${escapeHtml(formatPrice(item.price))}</span>` +
      `<div class="card-actions">` +
      `<button class="btn btn-secondary btn-sm btn-details" type="button">Details</button>` +
      `<a class="btn btn-primary btn-sm btn-contact" href="index.html#contact">Contact</a>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `</div>`
    );
  }

  bindCardEvents() {
    // cycle images
    const nextButtons = document.querySelectorAll('.photo-next');
    nextButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const card = btn.closest('.inventory-card');
        if (!card) return;
        const img = card.querySelector('.card-img');
        if (!img) return;

        const imagesRaw = img.getAttribute('data-images') || '';
        const images = imagesRaw.split('|').map(s => s.trim()).filter(Boolean);
        if (images.length <= 1) return;

        const currentIndex = parseInt(img.getAttribute('data-img-index') || '0', 10);
        const nextIndex = (currentIndex + 1) % images.length;

        img.src = images[nextIndex];
        img.setAttribute('data-img-index', String(nextIndex));
      });
    });

    // Details button - handled by ModalManager via event delegation
    // No additional binding needed here
  }

  renderPagination(totalPages) {
    const self = this;
    const paginationElement = document.getElementById('pagination');
    if (!paginationElement) return;

    // If "All", hide pagination
    if (this.itemsPerPage === Infinity || totalPages <= 1) {
      paginationElement.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button class="pagination-btn prev" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<button class="pagination-btn page ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    html += `<button class="pagination-btn next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;
    paginationElement.innerHTML = html;

    const prevBtn = paginationElement.querySelector('.prev');
    const nextBtn = paginationElement.querySelector('.next');
    const pageButtons = paginationElement.querySelectorAll('.page');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (self.currentPage > 1) {
          self.currentPage--;
          self.render();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (self.currentPage < totalPages) {
          self.currentPage++;
          self.render();
        }
      });
    }

    pageButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.currentPage = parseInt(btn.dataset.page, 10);
        self.render();
      });
    });
  }
}

// ============================================
// MODAL MANAGER CLASS
// ============================================

class ModalManager {
  constructor() {
    this.modal = document.getElementById('details-modal');
    this.currentItem = null;
    this.currentImageIndex = 0;
    this.images = [];

    if (this.modal) {
      this.bindEvents();
    }
  }

  bindEvents() {
    const self = this;

    // Close button
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        self.close();
      });
    }

    // Click outside to close
    this.modal.addEventListener('click', function(e) {
      if (e.target === self.modal) {
        self.close();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (!self.modal.classList.contains('active')) return;

      if (e.key === 'Escape') {
        self.close();
      } else if (e.key === 'ArrowLeft') {
        self.prevImage();
      } else if (e.key === 'ArrowRight') {
        self.nextImage();
      }
    });

    // Gallery navigation buttons
    const prevBtn = this.modal.querySelector('.gallery-prev');
    const nextBtn = this.modal.querySelector('.gallery-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        self.prevImage();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        self.nextImage();
      });
    }

    // Print details button
    const printBtn = document.getElementById('btn-print-details');
    if (printBtn) {
      printBtn.addEventListener('click', function() {
        self.printDetails();
      });
    }

    // Delegate click events on inventory grid for Details button
    document.addEventListener('click', function(e) {
      const detailsBtn = e.target.closest('.btn-details');
      if (detailsBtn) {
        const card = detailsBtn.closest('.inventory-card');
        if (card) {
          const itemId = card.dataset.id;
          self.openByItemId(itemId);
        }
      }

      // Thumbnail click
      if (e.target.closest('.gallery-thumbnail')) {
        const thumb = e.target.closest('.gallery-thumbnail');
        const index = parseInt(thumb.dataset.index);
        self.showImage(index);
      }
    });
  }

  openByItemId(itemId) {
    // Find item in inventory
    let item = INVENTORY.trucks.find(t => t.id === itemId);
    if (!item) {
      item = INVENTORY.trailers.find(t => t.id === itemId);
    }

    if (item) {
      this.open(item);
    }
  }

  open(item) {
    this.currentItem = item;
    this.images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
    this.currentImageIndex = 0;

    // Populate modal content
    this.populateModal(item);

    // Show modal
    this.modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Update gallery
    this.renderGallery();
    this.updateNavButtons();
  }

  close() {
    this.modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    this.currentItem = null;
    this.images = [];
    this.currentImageIndex = 0;
  }

  populateModal(item) {
    // Status
    const statusEl = document.getElementById('modal-status');
    if (statusEl) {
      const status = normalizeStatus ? normalizeStatus(item.status) : item.status;
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusEl.className = 'modal-status status-' + status;
    }

    // Title
    const titleEl = document.getElementById('modal-title');
    if (titleEl) {
      titleEl.textContent = item.year + ' ' + item.make + ' ' + item.model;
    }

    // Location
    const locationEl = document.getElementById('modal-location');
    if (locationEl) {
      locationEl.textContent = item.location || '';
    }

    // Price
    const priceEl = document.getElementById('modal-price');
    if (priceEl) {
      priceEl.textContent = formatPrice(item.price);
    }

    // Specs
    const specYear = document.getElementById('spec-year');
    const specMake = document.getElementById('spec-make');
    const specModel = document.getElementById('spec-model');
    if (specYear) specYear.textContent = item.year;
    if (specMake) specMake.textContent = item.make;
    if (specModel) specModel.textContent = item.model;

    const mileageContainer = document.getElementById('spec-mileage-container');
    const mileageEl = document.getElementById('spec-mileage');

    if (item.type === 'trailer') {
      // For trailers, show length instead of mileage
      if (mileageContainer) {
        const label = mileageContainer.querySelector('.spec-label');
        if (label) label.textContent = 'Length';
      }
      if (mileageEl) {
        mileageEl.textContent = (item.lengthFt || 53) + ' ft';
      }
    } else {
      // For trucks, show mileage
      if (mileageContainer) {
        const label = mileageContainer.querySelector('.spec-label');
        if (label) label.textContent = 'Mileage';
      }
      if (mileageEl) {
        mileageEl.textContent = formatMileage(item.mileage);
      }
    }

    // Description
    const descEl = document.getElementById('modal-description-text');
    if (descEl) {
      descEl.textContent = item.description || 'No description available.';
    }

    // Highlights
    const highlightsList = document.getElementById('modal-highlights-list');
    if (highlightsList) {
      if (item.highlights && item.highlights.length > 0) {
        highlightsList.innerHTML = item.highlights.map(h => '<li>' + escapeHtml(h) + '</li>').join('');
        highlightsList.parentElement.style.display = 'block';
      } else {
        highlightsList.parentElement.style.display = 'none';
      }
    }
  }

  renderGallery() {
    const mainImageContainer = document.getElementById('gallery-main-image');
    const thumbnailsContainer = document.getElementById('gallery-thumbnails');
    const counterEl = document.getElementById('gallery-counter');

    if (!mainImageContainer) return;

    if (this.images.length === 0) {
      // No images - show placeholder
      mainImageContainer.innerHTML = '<div class="image-placeholder"><span class="placeholder-icon">&#128666;</span></div>';
      if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
      if (counterEl) counterEl.textContent = '0 / 0';
      return;
    }

    // Show current image
    this.showImage(this.currentImageIndex);

    // Render thumbnails
    if (thumbnailsContainer) {
      if (this.images.length > 1) {
        thumbnailsContainer.innerHTML = this.images.map((img, index) => {
          return '<div class="gallery-thumbnail' + (index === this.currentImageIndex ? ' active' : '') + '" data-index="' + index + '">' +
            '<img src="' + escapeHtml(img) + '" alt="Image ' + (index + 1) + '" loading="lazy">' +
          '</div>';
        }).join('');
        thumbnailsContainer.style.display = 'flex';
      } else {
        thumbnailsContainer.style.display = 'none';
      }
    }

    // Update counter
    if (counterEl) {
      counterEl.textContent = (this.currentImageIndex + 1) + ' / ' + this.images.length;
    }
  }

  showImage(index) {
    if (index < 0 || index >= this.images.length) return;

    this.currentImageIndex = index;
    const mainImageContainer = document.getElementById('gallery-main-image');
    const counterEl = document.getElementById('gallery-counter');

    if (mainImageContainer) {
      const imgUrl = this.images[index];
      mainImageContainer.innerHTML = '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(this.currentItem.year + ' ' + this.currentItem.make + ' ' + this.currentItem.model) + '" onerror="this.parentElement.innerHTML=\'<div class=image-placeholder><span class=placeholder-icon>&#128666;</span></div>\'">';
    }

    // Update thumbnails active state
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');
    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    // Update counter
    if (counterEl) {
      counterEl.textContent = (index + 1) + ' / ' + this.images.length;
    }

    this.updateNavButtons();
  }

  prevImage() {
    if (this.currentImageIndex > 0) {
      this.showImage(this.currentImageIndex - 1);
    }
  }

  nextImage() {
    if (this.currentImageIndex < this.images.length - 1) {
      this.showImage(this.currentImageIndex + 1);
    }
  }

  updateNavButtons() {
    const prevBtn = this.modal.querySelector('.gallery-prev');
    const nextBtn = this.modal.querySelector('.gallery-next');

    if (prevBtn) {
      prevBtn.disabled = this.currentImageIndex === 0 || this.images.length <= 1;
      prevBtn.style.display = this.images.length <= 1 ? 'none' : 'flex';
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentImageIndex === this.images.length - 1 || this.images.length <= 1;
      nextBtn.style.display = this.images.length <= 1 ? 'none' : 'flex';
    }
  }

  printDetails() {
    if (!this.currentItem) return;
    const item = this.currentItem;
    const images = this.images;
    const status = normalizeStatus(item.status);
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    // Build images HTML for print
    let imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = '<div class="print-images">';
      imagesHtml += '<div class="print-main-image">';
      imagesHtml += '<img src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(item.year + ' ' + item.make + ' ' + item.model) + '">';
      imagesHtml += '</div>';
      if (images.length > 1) {
        imagesHtml += '<div class="print-gallery">';
        for (let i = 1; i < images.length; i++) {
          imagesHtml += '<img src="' + escapeHtml(images[i]) + '" alt="Photo ' + (i + 1) + '">';
        }
        imagesHtml += '</div>';
      }
      imagesHtml += '</div>';
    }

    // Build specs
    let specsHtml = '';
    specsHtml += '<tr><td>Year</td><td>' + escapeHtml(String(item.year)) + '</td></tr>';
    specsHtml += '<tr><td>Make</td><td>' + escapeHtml(item.make) + '</td></tr>';
    specsHtml += '<tr><td>Model</td><td>' + escapeHtml(item.model) + '</td></tr>';
    if (item.type === 'trailer') {
      specsHtml += '<tr><td>Length</td><td>' + (item.lengthFt || 53) + ' ft</td></tr>';
    } else {
      specsHtml += '<tr><td>Mileage</td><td>' + escapeHtml(formatMileage(item.mileage)) + '</td></tr>';
    }
    specsHtml += '<tr><td>Status</td><td>' + escapeHtml(statusText) + '</td></tr>';
    specsHtml += '<tr><td>Location</td><td>' + escapeHtml(item.location || 'N/A') + '</td></tr>';
    if (item.id) {
      specsHtml += '<tr><td>Asset ID</td><td>' + escapeHtml(item.id) + '</td></tr>';
    }

    // Build highlights
    let highlightsHtml = '';
    if (item.highlights && item.highlights.length > 0) {
      highlightsHtml = '<div class="print-section"><h3>Key Features</h3><ul>';
      item.highlights.forEach(h => {
        highlightsHtml += '<li>' + escapeHtml(h) + '</li>';
      });
      highlightsHtml += '</ul></div>';
    }

    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)} - Right Truck Deal</title>
<style>
  @page { margin: 0.5in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #1f2937;
    line-height: 1.5;
    padding: 0;
  }
  .print-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 3px solid #1e40af;
    margin-bottom: 24px;
  }
  .print-header h1 {
    font-size: 20px;
    font-weight: 700;
    color: #1e40af;
  }
  .print-header .company {
    text-align: right;
    font-size: 12px;
    color: #6b7280;
  }
  .print-header .company strong {
    display: block;
    font-size: 16px;
    color: #1e40af;
  }
  .print-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
  }
  .print-title-row h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111827;
  }
  .print-price {
    font-size: 26px;
    font-weight: 800;
    color: #1e40af;
  }
  .print-status {
    display: inline-block;
    padding: 3px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .print-status.status-available { background: #d1fae5; color: #065f46; }
  .print-status.status-pending { background: #fef3c7; color: #92400e; }
  .print-status.status-sold { background: #fee2e2; color: #991b1b; }
  .print-images { margin-bottom: 24px; }
  .print-main-image { margin-bottom: 12px; }
  .print-main-image img {
    max-width: 100%;
    max-height: 320px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  .print-gallery {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .print-gallery img {
    width: 120px;
    height: 80px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
  .print-section { margin-bottom: 20px; }
  .print-section h3 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }
  .specs-table {
    width: 100%;
    border-collapse: collapse;
  }
  .specs-table td {
    padding: 8px 12px;
    font-size: 14px;
    border-bottom: 1px solid #f3f4f6;
  }
  .specs-table td:first-child {
    font-weight: 600;
    color: #6b7280;
    width: 140px;
  }
  .specs-table td:last-child {
    color: #111827;
  }
  .print-section p {
    font-size: 14px;
    color: #374151;
    line-height: 1.7;
  }
  .print-section ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
  }
  .print-section ul li {
    padding: 4px 12px;
    font-size: 12px;
    background: #f3f4f6;
    border-radius: 4px;
    color: #374151;
  }
  .print-section ul li::before {
    content: '\\2713  ';
    color: #10b981;
    font-weight: bold;
  }
  .print-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 2px solid #1e40af;
    font-size: 12px;
    color: #6b7280;
    text-align: center;
  }
  .print-footer strong { color: #1e40af; }
</style>
</head>
<body>
  <div class="print-header">
    <h1>Vehicle Specification Sheet</h1>
    <div class="company">
      <strong>Right Truck Deal LLC</strong>
      righttruckdeal.us
    </div>
  </div>

  <div class="print-title-row">
    <h2>${escapeHtml(item.year + ' ' + item.make + ' ' + item.model)}</h2>
    <span class="print-price">${escapeHtml(formatPrice(item.price))}</span>
  </div>

  <span class="print-status status-${escapeHtml(status)}">${escapeHtml(statusText)}</span>

  ${imagesHtml}

  <div class="print-section">
    <h3>Specifications</h3>
    <table class="specs-table">${specsHtml}</table>
  </div>

  ${item.description ? '<div class="print-section"><h3>Description</h3><p>' + escapeHtml(item.description) + '</p></div>' : ''}

  ${highlightsHtml}

  <div class="print-footer">
    <strong>Right Truck Deal LLC</strong> &mdash; Truck &amp; Trailer Sales, Leasing &amp; Rentals<br>
    Contact us at righttruckdeal.us for more information
  </div>

  <script>
    // Wait for images to load then print
    var imgs = document.querySelectorAll('img');
    var loaded = 0;
    var total = imgs.length;
    if (total === 0) {
      window.print();
      window.close();
    } else {
      imgs.forEach(function(img) {
        img.onload = img.onerror = function() {
          loaded++;
          if (loaded >= total) {
            setTimeout(function() { window.print(); window.close(); }, 300);
          }
        };
        if (img.complete) {
          loaded++;
          if (loaded >= total) {
            setTimeout(function() { window.print(); window.close(); }, 300);
          }
        }
      });
    }
  <\/script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  }
}

// ============================================
// MOBILE FILTERS (sidebar-as-modal approach)
// ============================================

function initMobileFilters(inventoryManager) {
  var openBtn = document.getElementById('open-mobile-filters');
  var closeBtn = document.getElementById('close-mobile-filters');
  var showResultsBtn = document.getElementById('mobile-show-results');
  var sidebar = document.getElementById('filters-sidebar');
  var backdrop = document.getElementById('mobile-filter-backdrop');
  var badge = document.getElementById('active-filter-count');

  if (!openBtn || !sidebar) return;

  function openFilters() {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeFilters() {
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  function updateBadge() {
    if (!badge) return;
    var count = 0;
    var f = inventoryManager.filters;
    if (f.assetIdQuery) count++;
    if (f.years.length) count += f.years.length;
    if (f.makes.length) count += f.makes.length;
    if (f.models.length) count += f.models.length;
    if (f.statuses.length) count += f.statuses.length;
    if (f.mileageMin !== null) count++;
    if (f.mileageMax !== null) count++;
    if (f.priceMin !== null) count++;
    if (f.priceMax !== null) count++;

    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.add('visible');
    } else {
      badge.textContent = '';
      badge.classList.remove('visible');
    }
  }

  openBtn.addEventListener('click', openFilters);

  if (closeBtn) {
    closeBtn.addEventListener('click', closeFilters);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeFilters);
  }

  if (showResultsBtn) {
    showResultsBtn.addEventListener('click', function () {
      inventoryManager.applyFilters();
      closeFilters();
      updateBadge();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
      closeFilters();
    }
  });

  // Update badge whenever filters are applied via desktop sidebar too
  var origApply = inventoryManager.applyFilters.bind(inventoryManager);
  inventoryManager.applyFilters = function () {
    origApply();
    updateBadge();
  };

  var origReset = inventoryManager.resetFilters.bind(inventoryManager);
  inventoryManager.resetFilters = function () {
    origReset();
    updateBadge();
  };

  updateBadge();
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initFAQ();
  initContactForm();

  var inventoryManager = new InventoryManager();
  inventoryManager.init().then(function () {
    // Initialize mobile filter toggle (uses same sidebar DOM)
    initMobileFilters(inventoryManager);
  });

  // Initialize modal manager
  var modalManager = new ModalManager();
});

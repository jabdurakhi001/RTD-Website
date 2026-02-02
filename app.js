// ============================================
// GOOGLE SHEETS CONFIGURATION
// ============================================

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKG0iRXlzOb2u5OffLyk07haEtgJsnRRiG9t97ZW60mUkLzPKDIxdyFL4RCCy67TDuEVkoTefM2LbT/pub?gid=0&single=true&output=csv';

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

  // Check if it's a Google Drive link
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

  // If already a direct link or not a Google Drive link, return as-is
  return url;
}

function transformSheetData(rawData) {
  const inventory = {
    trucks: [],
    trailers: []
  };

  rawData.forEach(row => {
    const item = {
      id: row.id || '',
      type: (row.type || 'truck').toLowerCase(),
      year: parseInt(row.year) || new Date().getFullYear(),
      make: row.make || '',
      model: row.model || '',
      mileage: row.mileage ? parseInt(row.mileage) : null,
      price: row.price ? parseInt(row.price) : null,
      status: (row.status || 'available').toLowerCase(),
      location: row.location || '',
      image: convertGoogleDriveUrl(row.image || ''),
      description: row.description || '',
      highlights: row.highlights ? row.highlights.split(',').map(h => h.trim()) : [],
      // For trailers
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
    if (!response.ok) {
      throw new Error('Failed to fetch inventory data');
    }

    const csvText = await response.text();
    const rawData = parseCSV(csvText);
    INVENTORY = transformSheetData(rawData);

    console.log('Inventory loaded from Google Sheets:', INVENTORY);
    return INVENTORY;
  } catch (error) {
    console.error('Error loading inventory:', error);
    // Return empty inventory on error
    return { trucks: [], trailers: [] };
  }
}

// ============================================
// FALLBACK DATA (used if Google Sheets fails)
// ============================================

const FALLBACK_INVENTORY = {
  trucks: [
    {
      id: 'T002',
      type: 'truck',
      year: 2021,
      make: 'Peterbilt',
      model: '579',
      mileage: 198000,
      price: 75000,
      status: 'available',
      location: 'Houston, TX',
      image: 'peterbilt-579.jpg',
      description: 'Reliable Peterbilt 579 with Cummins X15 engine. Great fuel efficiency and driver comfort.',
      highlights: ['Cummins X15 Engine', '10-Speed Manual', 'Sleeper Cab', 'Chrome Package']
    },
    {
      id: 'T003',
      type: 'truck',
      year: 2023,
      make: 'Kenworth',
      model: 'T680',
      mileage: 45000,
      price: 125000,
      status: 'pending',
      location: 'Phoenix, AZ',
      image: 'kenworth-t680.jpg',
      description: 'Nearly new Kenworth T680 with all the latest technology and safety features.',
      highlights: ['Paccar MX-13 Engine', 'Automated Manual', 'Collision Mitigation', 'Lane Departure Warning']
    },
    {
      id: 'T004',
      type: 'truck',
      year: 2020,
      make: 'Volvo',
      model: 'VNL 760',
      mileage: 320000,
      price: 55000,
      status: 'available',
      location: 'Atlanta, GA',
      image: 'volvo-vnl-760.jpg',
      description: 'High-mileage Volvo VNL 760 with excellent maintenance history. Ready for work.',
      highlights: ['Volvo D13 Engine', 'I-Shift Transmission', '77" Sleeper', 'Recent Overhaul']
    },
    {
      id: 'T005',
      type: 'truck',
      year: 2019,
      make: 'International',
      model: 'LT625',
      mileage: 275000,
      price: 48000,
      status: 'available',
      location: 'Chicago, IL',
      image: 'international-lt625.jpg',
      description: 'Solid International LT625 with Cummins power. Excellent value for owner-operators.',
      highlights: ['Cummins X15 Engine', '10-Speed Automatic', 'Diamond Interior', 'Inverter']
    },
    {
      id: 'T006',
      type: 'truck',
      year: 2022,
      make: 'Mack',
      model: 'Anthem',
      mileage: 89000,
      price: 95000,
      status: 'available',
      location: 'Denver, CO',
      image: 'mack-anthem.jpg',
      description: 'Powerful Mack Anthem with MP8 engine. Built for tough hauls and long distances.',
      highlights: ['Mack MP8 Engine', 'mDrive Transmission', 'Stand-Up Sleeper', 'Bulldog Hood Ornament']
    },
    {
      id: 'T007',
      type: 'truck',
      year: 2018,
      make: 'Freightliner',
      model: 'Coronado',
      mileage: 410000,
      price: 42000,
      status: 'sold',
      location: 'Los Angeles, CA',
      image: 'freightliner-coronado.jpg',
      description: 'Classic Freightliner Coronado with Detroit DD15. High miles but well maintained.',
      highlights: ['Detroit DD15 Engine', '18-Speed Manual', 'Custom Exhaust', 'Aluminum Wheels']
    },
    {
      id: 'T008',
      type: 'truck',
      year: 2023,
      make: 'Peterbilt',
      model: '389',
      mileage: 28000,
      price: 165000,
      status: 'available',
      location: 'Nashville, TN',
      image: 'peterbilt-389.jpg',
      description: 'Stunning Peterbilt 389 with Cummins X15. The ultimate owner-operator truck.',
      highlights: ['Cummins X15 605HP', '18-Speed', 'Full Chrome', 'Premium Interior']
    },
    {
      id: 'T009',
      type: 'truck',
      year: 2021,
      make: 'Kenworth',
      model: 'W900L',
      mileage: 156000,
      price: 115000,
      status: 'pending',
      location: 'Oklahoma City, OK',
      image: 'kenworth-w900l.jpg',
      description: 'Iconic Kenworth W900L with extended hood. A true road legend.',
      highlights: ['Cummins X15 Engine', '13-Speed', 'Studio Sleeper', 'Air Ride Seats']
    },
    {
      id: 'T010',
      type: 'truck',
      year: 2020,
      make: 'Volvo',
      model: 'VNR 640',
      mileage: 185000,
      price: 62000,
      status: 'available',
      location: 'Miami, FL',
      image: 'volvo-vnr-640.jpg',
      description: 'Efficient Volvo VNR 640 perfect for regional operations. Great fuel economy.',
      highlights: ['Volvo D11 Engine', 'I-Shift', 'Mid-Roof Sleeper', 'Side Fairings']
    }
  ],
  trailers: [
    {
      id: 'TR001',
      type: 'trailer',
      year: 2022,
      make: 'Great Dane',
      model: 'Champion SE',
      lengthFt: 53,
      mileage: null,
      price: 38000,
      status: 'available',
      location: 'Dallas, TX',
      image: 'great-dane-champion.jpg',
      description: 'Like-new Great Dane dry van trailer. Ready for immediate use.',
      highlights: ['Swing Doors', 'LED Lights', 'Air Ride Suspension', 'Composite Floor']
    },
    {
      id: 'TR002',
      type: 'trailer',
      year: 2021,
      make: 'Utility',
      model: '4000D-X',
      lengthFt: 53,
      mileage: null,
      price: 42000,
      status: 'available',
      location: 'Houston, TX',
      image: 'utility-4000dx.jpg',
      description: 'Premium Utility reefer trailer with Carrier unit. Excellent condition.',
      highlights: ['Carrier X4 7500', 'Multi-Temp Capable', 'Aluminum Wheels', 'Duct Floor']
    },
    {
      id: 'TR003',
      type: 'trailer',
      year: 2020,
      make: 'Wabash',
      model: 'DuraPlate HD',
      lengthFt: 53,
      mileage: null,
      price: 28000,
      status: 'available',
      location: 'Phoenix, AZ',
      image: 'wabash-duraplate.jpg',
      description: 'Durable Wabash dry van with DuraPlate HD panels. Low maintenance.',
      highlights: ['DuraPlate Panels', 'Hardwood Floor', 'E-Track', 'Tire Inflation System']
    },
    {
      id: 'TR004',
      type: 'trailer',
      year: 2023,
      make: 'Vanguard',
      model: 'VXP',
      lengthFt: 53,
      mileage: null,
      price: 55000,
      status: 'pending',
      location: 'Atlanta, GA',
      image: 'vanguard-vxp.jpg',
      description: 'Top-of-the-line Vanguard VXP with all premium features.',
      highlights: ['Composite Walls', 'LED Interior Lights', 'Logistic Posts', 'Aluminum Roof']
    },
    {
      id: 'TR005',
      type: 'trailer',
      year: 2019,
      make: 'Hyundai',
      model: 'Composite',
      lengthFt: 53,
      mileage: null,
      price: 22000,
      status: 'available',
      location: 'Chicago, IL',
      image: 'hyundai-composite.jpg',
      description: 'Reliable Hyundai dry van at an excellent price point.',
      highlights: ['Composite Sides', 'Roll-Up Door', 'LED Lights', 'Good Tires']
    },
    {
      id: 'TR006',
      type: 'trailer',
      year: 2022,
      make: 'Stoughton',
      model: 'Z-Plate',
      lengthFt: 53,
      mileage: null,
      price: 35000,
      status: 'available',
      location: 'Denver, CO',
      image: 'stoughton-zplate.jpg',
      description: 'Modern Stoughton Z-Plate with industry-leading durability.',
      highlights: ['Z-Plate Technology', 'Air Ride', 'Swing Doors', 'Anti-Snag Interior']
    },
    {
      id: 'TR007',
      type: 'trailer',
      year: 2018,
      make: 'Great Dane',
      model: 'Freedom LT',
      lengthFt: 48,
      mileage: null,
      price: 18000,
      status: 'sold',
      location: 'Los Angeles, CA',
      image: 'great-dane-freedom.jpg',
      description: 'Shorter 48ft Great Dane Freedom for flexible operations.',
      highlights: ['48ft Length', 'Lightweight', 'Steel Wheels', 'Swing Doors']
    },
    {
      id: 'TR008',
      type: 'trailer',
      year: 2023,
      make: 'Utility',
      model: '3000R',
      lengthFt: 53,
      mileage: null,
      price: 68000,
      status: 'available',
      location: 'Nashville, TN',
      image: 'utility-3000r.jpg',
      description: 'Brand new Utility reefer with Thermo King unit. Full warranty.',
      highlights: ['Thermo King S-700', 'Aluminum Floor', 'Full LED', 'Tire Tracking']
    },
    {
      id: 'TR009',
      type: 'trailer',
      year: 2021,
      make: 'Wabash',
      model: 'Arctic Lite',
      lengthFt: 53,
      mileage: null,
      price: 48000,
      status: 'available',
      location: 'Oklahoma City, OK',
      image: 'wabash-arctic.jpg',
      description: 'Efficient Wabash Arctic Lite reefer with excellent insulation.',
      highlights: ['Carrier Unit', 'Foam Insulation', 'Stainless Front', 'Multi-Temp']
    },
    {
      id: 'TR010',
      type: 'trailer',
      year: 2020,
      make: 'Vanguard',
      model: 'Cool Globe',
      lengthFt: 53,
      mileage: null,
      price: 44000,
      status: 'pending',
      location: 'Miami, FL',
      image: 'vanguard-cool-globe.jpg',
      description: 'Vanguard Cool Globe reefer trailer. Ready for temperature-sensitive loads.',
      highlights: ['Thermo King Unit', 'Duct Floor', 'Fuel Tank', 'Remote Monitoring']
    }
  ]
};

// Use fallback if Google Sheets fails
function useFallbackInventory() {
  INVENTORY = FALLBACK_INVENTORY;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatPrice(price) {
  if (price === null || price === undefined) {
    return 'Call for Price';
  }
  return '$' + price.toLocaleString('en-US');
}

function formatMileage(mileage) {
  if (mileage === null || mileage === undefined) {
    return 'N/A';
  }
  return mileage.toLocaleString('en-US') + ' mi';
}

function getUniqueValues(items, key) {
  const values = items.map(item => item[key]).filter(value => value !== null && value !== undefined);
  return [...new Set(values)].sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  });
}

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function() {
      const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
      mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!navMenu.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// ============================================
// FAQ ACCORDION
// ============================================

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function(item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (question && answer) {
      question.addEventListener('click', function() {
        const isOpen = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) {
              otherAnswer.style.maxHeight = null;
            }
          }
        });

        // Toggle current item
        item.classList.toggle('active');
        if (!isOpen) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
        } else {
          answer.style.maxHeight = null;
        }
      });
    }
  });
}

// ============================================
// CONTACT FORM
// ============================================

function initContactForm() {
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
      event.preventDefault();

      // Clear previous errors
      const errorElements = contactForm.querySelectorAll('.error-message');
      errorElements.forEach(function(el) {
        el.remove();
      });
      const inputErrors = contactForm.querySelectorAll('.input-error');
      inputErrors.forEach(function(el) {
        el.classList.remove('input-error');
      });

      // Get form fields
      const nameField = contactForm.querySelector('#name');
      const emailField = contactForm.querySelector('#email');
      const phoneField = contactForm.querySelector('#phone');
      const messageField = contactForm.querySelector('#message');

      let isValid = true;

      // Validate name
      if (nameField && nameField.value.trim() === '') {
        showFieldError(nameField, 'Name is required');
        isValid = false;
      }

      // Validate email
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

      // Validate phone (optional but must be valid if provided)
      if (phoneField && phoneField.value.trim() !== '') {
        if (!isValidPhone(phoneField.value.trim())) {
          showFieldError(phoneField, 'Please enter a valid phone number');
          isValid = false;
        }
      }

      // Validate message
      if (messageField && messageField.value.trim() === '') {
        showFieldError(messageField, 'Message is required');
        isValid = false;
      }

      if (isValid) {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<strong>Thank you!</strong> Your message has been sent successfully. We will get back to you within 24 hours.';
        contactForm.insertBefore(successMessage, contactForm.firstChild);

        // Reset form
        contactForm.reset();

        // Remove success message after 5 seconds
        setTimeout(function() {
          successMessage.remove();
        }, 5000);
      }
    });
  }

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
      years: [],
      makes: [],
      mileageMin: null,
      mileageMax: null,
      priceMin: null,
      priceMax: null
    };
    this.sortBy = 'price_asc';
    this.currentPage = 1;
    this.itemsPerPage = 9;
  }

  async init() {
    const salesPage = document.querySelector('.inventory-section');
    if (!salesPage) {
      return;
    }

    // Show loading state
    const gridElement = document.getElementById('inventory-grid');
    if (gridElement) {
      gridElement.innerHTML = '<div class="loading-message"><p>Loading inventory...</p></div>';
    }

    // Load inventory from Google Sheets
    try {
      await loadInventoryFromSheet();

      // If no data loaded, use fallback
      if (INVENTORY.trucks.length === 0 && INVENTORY.trailers.length === 0) {
        console.log('No data from Google Sheets, using fallback');
        useFallbackInventory();
      }
    } catch (error) {
      console.error('Failed to load from Google Sheets:', error);
      useFallbackInventory();
    }

    this.bindEvents();
    this.bindRangeInputs();
    this.populateFilters();
    this.render();
  }

  bindRangeInputs() {
    const self = this;
    let debounceTimer;

    const rangeInputs = [
      'mileage-min',
      'mileage-max',
      'price-min',
      'price-max'
    ];

    rangeInputs.forEach(function(inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', function() {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function() {
            self.applyFilters();
          }, 500);
        });
      }
    });
  }

  bindEvents() {
    const self = this;

    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        self.currentTab = tab.dataset.tab;
        self.currentPage = 1;
        self.resetFilters();
      });
    });

    // Sort change
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        self.sortBy = sortSelect.value;
        self.render();
      });
    }

    // Apply filters button
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', function() {
        self.applyFilters();
      });
    }

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        self.resetFilters();
      });
    }

    // Filter group collapse
    const filterHeaders = document.querySelectorAll('.filter-group-header');
    filterHeaders.forEach(function(header) {
      header.addEventListener('click', function() {
        const group = header.parentElement;
        group.classList.toggle('collapsed');
      });
    });
  }

  populateFilters() {
    const self = this;
    const items = INVENTORY[this.currentTab];

    // Count items per year and make
    const yearCounts = {};
    const makeCounts = {};
    items.forEach(function(item) {
      yearCounts[item.year] = (yearCounts[item.year] || 0) + 1;
      makeCounts[item.make] = (makeCounts[item.make] || 0) + 1;
    });

    // Populate year checkboxes
    const yearContainer = document.getElementById('year-filters');
    if (yearContainer) {
      const years = getUniqueValues(items, 'year').reverse(); // Show newest first
      yearContainer.innerHTML = '';
      years.forEach(function(year) {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML = '<input type="checkbox" value="' + year + '"> ' + year + ' <span class="filter-option__count">(' + yearCounts[year] + ')</span>';
        yearContainer.appendChild(label);

        // Add change event listener directly to checkbox
        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function() {
          self.applyFilters();
        });
      });
    }

    // Populate make checkboxes
    const makeContainer = document.getElementById('make-filters');
    if (makeContainer) {
      const makes = getUniqueValues(items, 'make');
      makeContainer.innerHTML = '';
      makes.forEach(function(make) {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML = '<input type="checkbox" value="' + make + '"> ' + make + ' <span class="filter-option__count">(' + makeCounts[make] + ')</span>';
        makeContainer.appendChild(label);

        // Add change event listener directly to checkbox
        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', function() {
          self.applyFilters();
        });
      });
    }
  }

  applyFilters() {
    // Collect year filters
    const yearCheckboxes = document.querySelectorAll('#year-filters input:checked');
    this.filters.years = Array.from(yearCheckboxes).map(function(cb) {
      return parseInt(cb.value);
    });

    // Collect make filters
    const makeCheckboxes = document.querySelectorAll('#make-filters input:checked');
    this.filters.makes = Array.from(makeCheckboxes).map(function(cb) {
      return cb.value;
    });

    // Collect range filters
    const mileageMin = document.getElementById('mileage-min');
    const mileageMax = document.getElementById('mileage-max');
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');

    this.filters.mileageMin = mileageMin && mileageMin.value ? parseInt(mileageMin.value) : null;
    this.filters.mileageMax = mileageMax && mileageMax.value ? parseInt(mileageMax.value) : null;
    this.filters.priceMin = priceMin && priceMin.value ? parseInt(priceMin.value) : null;
    this.filters.priceMax = priceMax && priceMax.value ? parseInt(priceMax.value) : null;

    this.currentPage = 1;
    this.render();
  }

  resetFilters() {
    // Clear all checkboxes
    const checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
      cb.checked = false;
    });

    // Clear range inputs
    const rangeInputs = document.querySelectorAll('.filter-group input[type="number"]');
    rangeInputs.forEach(function(input) {
      input.value = '';
    });

    // Reset filters object
    this.filters = {
      years: [],
      makes: [],
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
    let items = INVENTORY[this.currentTab].slice();

    // Filter by year
    if (this.filters.years.length > 0) {
      items = items.filter(function(item) {
        return self.filters.years.includes(item.year);
      });
    }

    // Filter by make
    if (this.filters.makes.length > 0) {
      items = items.filter(function(item) {
        return self.filters.makes.includes(item.make);
      });
    }

    // Filter by mileage
    if (this.filters.mileageMin !== null) {
      items = items.filter(function(item) {
        return item.mileage === null || item.mileage >= self.filters.mileageMin;
      });
    }
    if (this.filters.mileageMax !== null) {
      items = items.filter(function(item) {
        return item.mileage === null || item.mileage <= self.filters.mileageMax;
      });
    }

    // Filter by price
    if (this.filters.priceMin !== null) {
      items = items.filter(function(item) {
        return item.price >= self.filters.priceMin;
      });
    }
    if (this.filters.priceMax !== null) {
      items = items.filter(function(item) {
        return item.price <= self.filters.priceMax;
      });
    }

    return items;
  }

  sortItems(items) {
    const sortedItems = items.slice();
    const sortParts = this.sortBy.split('_');
    const sortField = sortParts[0];
    const sortOrder = sortParts[1];

    sortedItems.sort(function(a, b) {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null values
      if (aVal === null) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

      if (sortOrder === 'asc') {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });

    return sortedItems;
  }

  render() {
    const self = this;

    // Get filtered and sorted items
    let items = this.getFilteredItems();
    items = this.sortItems(items);

    // Update count
    const countElement = document.getElementById('results-count');
    if (countElement) {
      countElement.textContent = items.length;
    }

    // Paginate
    const totalPages = Math.ceil(items.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    // Render grid
    const gridElement = document.getElementById('inventory-grid');
    if (gridElement) {
      if (paginatedItems.length === 0) {
        gridElement.innerHTML = '<div class="no-results"><p>No ' + this.currentTab + ' match your criteria. Try adjusting your filters.</p></div>';
      } else {
        gridElement.innerHTML = paginatedItems.map(function(item) {
          return self.renderCard(item);
        }).join('');
      }
    }

    // Render pagination
    this.renderPagination(totalPages);
  }

  renderCard(item) {
    const statusClass = 'status-' + item.status;
    const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);

    let specsHtml = '';
    if (item.type === 'truck') {
      specsHtml = '<span class="spec"><strong>Year:</strong> ' + item.year + '</span>' +
        '<span class="spec"><strong>Make:</strong> ' + item.make + '</span>' +
        '<span class="spec"><strong>Model:</strong> ' + item.model + '</span>' +
        '<span class="spec"><strong>Mileage:</strong> ' + formatMileage(item.mileage) + '</span>';
    } else {
      specsHtml = '<span class="spec"><strong>Year:</strong> ' + item.year + '</span>' +
        '<span class="spec"><strong>Make:</strong> ' + item.make + '</span>' +
        '<span class="spec"><strong>Model:</strong> ' + item.model + '</span>' +
        '<span class="spec"><strong>Length:</strong> ' + item.lengthFt + ' ft</span>';
    }

    const highlightsHtml = item.highlights.map(function(h) {
      return '<li>' + h + '</li>';
    }).join('');

    // Show actual image if available, otherwise show placeholder
    let imageHtml = '';
    if (item.image && item.image.trim() !== '') {
      imageHtml = '<img src="' + item.image + '" alt="' + item.year + ' ' + item.make + ' ' + item.model + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=image-placeholder><span class=placeholder-icon>&#128666;</span><span class=placeholder-text>' + item.year + ' ' + item.make + ' ' + item.model + '</span></div>\'">';
    } else {
      imageHtml = '<div class="image-placeholder"><span class="placeholder-icon">&#128666;</span><span class="placeholder-text">' + item.year + ' ' + item.make + ' ' + item.model + '</span></div>';
    }

    return '<div class="inventory-card" data-id="' + item.id + '">' +
      '<div class="card-image">' +
        imageHtml +
        '<span class="status-badge ' + statusClass + '">' + statusText + '</span>' +
      '</div>' +
      '<div class="card-content">' +
        '<h3 class="card-title">' + item.year + ' ' + item.make + ' ' + item.model + '</h3>' +
        '<p class="card-location">' + item.location + '</p>' +
        '<div class="card-specs">' + specsHtml + '</div>' +
        '<p class="card-description">' + item.description + '</p>' +
        '<ul class="card-highlights">' + highlightsHtml + '</ul>' +
        '<div class="card-footer">' +
          '<span class="card-price">' + formatPrice(item.price) + '</span>' +
          '<div class="card-actions">' +
            '<button class="btn btn-secondary btn-sm">Details</button>' +
            '<button class="btn btn-primary btn-sm">Contact</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  renderPagination(totalPages) {
    const self = this;
    const paginationElement = document.getElementById('pagination');

    if (!paginationElement) {
      return;
    }

    if (totalPages <= 1) {
      paginationElement.innerHTML = '';
      return;
    }

    let paginationHtml = '';

    // Previous button
    paginationHtml += '<button class="pagination-btn prev" ' + (this.currentPage === 1 ? 'disabled' : '') + '>&laquo; Prev</button>';

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        paginationHtml += '<button class="pagination-btn page ' + (i === this.currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        paginationHtml += '<span class="pagination-ellipsis">...</span>';
      }
    }

    // Next button
    paginationHtml += '<button class="pagination-btn next" ' + (this.currentPage === totalPages ? 'disabled' : '') + '>Next &raquo;</button>';

    paginationElement.innerHTML = paginationHtml;

    // Add event listeners
    const prevBtn = paginationElement.querySelector('.prev');
    const nextBtn = paginationElement.querySelector('.next');
    const pageButtons = paginationElement.querySelectorAll('.page');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (self.currentPage > 1) {
          self.currentPage--;
          self.render();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (self.currentPage < totalPages) {
          self.currentPage++;
          self.render();
        }
      });
    }

    pageButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.currentPage = parseInt(btn.dataset.page);
        self.render();
      });
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  initFAQ();
  initContactForm();

  const inventoryManager = new InventoryManager();
  inventoryManager.init();
});

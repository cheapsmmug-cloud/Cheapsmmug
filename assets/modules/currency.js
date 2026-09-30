// ===============================================
// Global Currency System Module
// ===============================================

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺', decimals: 2 },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
    { code: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬', decimals: 0 },
    { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', decimals: 0 },
    { code: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿', decimals: 0 },
    { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', decimals: 0 },
    { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', decimals: 2 },
    { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', decimals: 2 },
    { code: 'RWF', name: 'Rwandan Franc', flag: '🇷🇼', decimals: 0 },
    { code: 'ETB', name: 'Ethiopian Birr', flag: '🇪🇹', decimals: 2 },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', decimals: 2 },
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', decimals: 2 },
    { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', decimals: 2 },
    { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦', decimals: 2 },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', decimals: 2 },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', decimals: 0 },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', decimals: 2 },
    { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', decimals: 2 },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', decimals: 2 },
    { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', decimals: 2 },
    { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪', decimals: 2 },
    { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴', decimals: 2 },
    { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰', decimals: 2 },
    { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱', decimals: 2 },
    { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷', decimals: 2 }
];

const CACHE_KEY = 'smm_currency_rates';
const PREF_KEY = 'smm_currency';
const TTL = 15 * 60 * 1000; // 15 minutes

let memoryRatesCache = null;
let rateRequestPromise = null;

// --- Cache & Rate Fetching ---
function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch (e) { localStorage.removeItem(CACHE_KEY); return null; }
}

function setCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates: data })); }
    catch (e) { console.warn('Could not save rates to localStorage'); }
}

function isCacheValid(cache) {
    return cache && cache.timestamp && (Date.now() - cache.timestamp < TTL);
}

async function fetchRates() {
    if (memoryRatesCache) return memoryRatesCache;
    
    const diskCache = getCache();
    if (diskCache && isCacheValid(diskCache)) {
        memoryRatesCache = diskCache.rates;
        return diskCache.rates;
    }
    
    if (!rateRequestPromise) {
        rateRequestPromise = fetch('https://open.er-api.com/v6/latest/USD')
            .then(r => r.json())
            .then(data => {
                if (data && data.rates) {
                    memoryRatesCache = data.rates;
                    setCache(data.rates);
                    return data.rates;
                }
                throw new Error('Invalid API response');
            })
            .catch(err => {
                console.warn('Exchange rate API failed:', err.message);
                if (diskCache && diskCache.rates) return diskCache.rates; // Stale fallback
                return { USD: 1 }; // Ultimate fallback
            })
            .finally(() => { rateRequestPromise = null; });
    }
    return rateRequestPromise;
}

// --- Core Public API ---
export function getCurrency() {
    return localStorage.getItem(PREF_KEY) || 'USD';
}

export function getCurrencyInfo(code) {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

export function getCurrencySymbol() {
    // For simple symbol extraction if needed by some modules
    const code = getCurrency();
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    return code + ' '; // Fallback to code + space for others (e.g., UGX )
}

export function setCurrency(code) {
    localStorage.setItem(PREF_KEY, code);
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: code } }));
}

export function convertFromUSD(usdAmount) {
    const code = getCurrency();
    if (code === 'USD') return usdAmount;
    const rates = memoryRatesCache || getCache()?.rates || { USD: 1 };
    const rate = rates[code] || 1;
    return usdAmount * rate;
}

export function formatCurrency(usdAmount) {
    const code = getCurrency();
    const info = getCurrencyInfo(code);
    const convertedAmount = convertFromUSD(usdAmount || 0);
    
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code,
            minimumFractionDigits: info.decimals,
            maximumFractionDigits: info.decimals
        }).format(convertedAmount);
    } catch (e) {
        // Fallback for obscure currency codes that Intl doesn't recognize
        return `${code} ${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: info.decimals })}`;
    }
}

// --- DOM Update System ---
function updateDataAttributes() {
    const elements = document.querySelectorAll('[data-usd-price]');
    elements.forEach(el => {
        const usdVal = parseFloat(el.getAttribute('data-usd-price'));
        if (!isNaN(usdVal)) {
            el.textContent = formatCurrency(usdVal);
        }
    });
}

// --- UI & Initialization ---
export async function initCurrency() {
    const btn = document.getElementById('currencySelectedBtn');
    const dropdown = document.getElementById('currencyDropdown');
    const list = document.getElementById('currencyList');
    const searchInput = document.getElementById('currencySearchInput');
    const flagSpan = document.getElementById('currencyFlag');
    const codeSpan = document.getElementById('currencyCode');
    
    if (!btn || !list) return; // Stops execution if the page doesn't have the sidebar widget
    
    // 1. Fetch rates in background (don't block UI)
    fetchRates().then(() => {
        updateDataAttributes();
        // FIX: Notify all modules that rates have loaded so they can re-render 
        // if they initially fell back to USD before rates were available.
        window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: getCurrency() } }));
    });
    
    // 2. Populate Dropdown
    const renderList = (filter = '') => {
        const filtered = CURRENCIES.filter(c =>
            c.code.toLowerCase().includes(filter) ||
            c.name.toLowerCase().includes(filter)
        );
        list.innerHTML = filtered.map(c => `
            <li class="currency-item ${c.code === getCurrency() ? 'active' : ''}" data-code="${c.code}">
                <span class="currency-item__flag">${c.flag}</span>
                <span class="currency-item__code">${c.code}</span>
                <span class="currency-item__name">${c.name}</span>
            </li>
        `).join('');
    };
    renderList();
    
    // 3. Update Top Bar Display
    const updateNavBarDisplay = () => {
        const curr = getCurrencyInfo(getCurrency());
        if (flagSpan) flagSpan.textContent = curr.flag;
        if (codeSpan) codeSpan.textContent = curr.code;
    };
    updateNavBarDisplay();
    
    // 4. Event Listeners
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('widget-currency__dropdown--open');
        if (dropdown.classList.contains('widget-currency__dropdown--open')) {
            searchInput.value = '';
            renderList();
            searchInput.focus();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.widget-currency')) {
            dropdown.classList.remove('widget-currency__dropdown--open');
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value.toLowerCase().trim());
    });
    
    list.addEventListener('click', (e) => {
        const item = e.target.closest('.currency-item');
        if (item) {
            setCurrency(item.dataset.code);
            updateNavBarDisplay();
            // FIX: Standardized class name removal
            dropdown.classList.remove('widget-currency__dropdown--open');
        }
    });
    
    // 5. Global Listener for Live Switching
    window.addEventListener('currencyChanged', () => {
        updateNavBarDisplay();
        updateDataAttributes();
    });
}
// assets/components/account-filters.js

export function renderAccountFilters(container, categories = [], onApply) {
    if (!container) return;
    
    // Safely generate platform options from categories
    const platformOptions = (categories || [])
        .map(cat => `<option value="${cat.platform}">${cat.name}</option>`)
        .join('');
    
    container.innerHTML = `
        <h3>Filters & Calculator</h3>
        <div class="filter-group">
            <label>Platform</label>
            <select id="filterPlatform" class="form-input form-select">
                <option value="">All Platforms</option>
                ${platformOptions}
            </select>
        </div>
        <div class="filter-group">
            <label>Account Type</label>
            <select id="filterType" class="form-input form-select">
                <option value="">All Types</option>
                <option value="Standard">Standard</option>
                <option value="Creator">Creator</option>
                <option value="Business">Business</option>
            </select>
        </div>
        <div class="filter-group">
            <label>Min Followers</label>
            <select id="filterFollowers" class="form-input form-select">
                <option value="">Any Followers</option>
                <option value="1000">1,000+</option>
                <option value="5000">5,000+</option>
                <option value="10000">10,000+</option>
                <option value="20000">20,000+</option>
                <option value="50000">50,000+</option>
                <option value="100000">100,000+</option>
                <option value="200000">200,000+</option>
                <option value="500000">500,000+</option>
                <option value="1000000">1,000,000+</option>
            </select>
            <small id="followerPriceCalc" style="color: var(--color-primary); font-size: 12px; display: block; margin-top: 5px; font-weight: 600;">Estimated Cost: $0</small>
        </div>
        <div class="filter-group">
            <label>Max Price ($)</label>
            <input type="number" id="filterPrice" class="form-input" placeholder="Any Price" min="0">
            <small id="priceCalcDisplay" style="color: var(--text-secondary); font-size: 12px; display: block; margin-top: 5px; font-weight: 600;">Max Budget: $0</small>
        </div>
        <button class="btn btn--primary btn--block" id="applyFiltersBtn">Apply Filters</button>
    `;
    
    // --- Calculators ---
    const followerSelect = container.querySelector('#filterFollowers');
    const followerPriceCalc = container.querySelector('#followerPriceCalc');
    
    const priceInput = container.querySelector('#filterPrice');
    const priceDisplay = container.querySelector('#priceCalcDisplay');
    
    // Calculate estimated price based on followers ($10 per 1000)
    if (followerSelect && followerPriceCalc) {
        followerSelect.addEventListener('change', () => {
            const val = parseInt(followerSelect.value) || 0;
            if (val > 0) {
                // Formula: 1000 followers = $10
                const estimatedCost = (val / 1000) * 10;
                followerPriceCalc.innerText = `Estimated Min Cost: $${estimatedCost.toLocaleString()}`;
            } else {
                followerPriceCalc.innerText = 'Estimated Cost: $0';
            }
        });
    }
    
    // Format max budget with commas
    if (priceInput && priceDisplay) {
        priceInput.addEventListener('input', () => {
            const val = priceInput.value || 0;
            priceDisplay.innerText = `Max Budget: $${Number(val).toLocaleString()}`;
        });
    }
    
    const applyBtn = container.querySelector('#applyFiltersBtn');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const filters = {
                platform: container.querySelector('#filterPlatform').value,
                accountType: container.querySelector('#filterType').value,
                followers: container.querySelector('#filterFollowers').value,
                price: container.querySelector('#filterPrice').value
            };
            
            if (typeof onApply === 'function') {
                onApply(filters);
            }
        });
    }
}
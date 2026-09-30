// assets/components/account-card.js

export function createAccountCard(account, onSelect) {
 const card = document.createElement('div');
 card.className = 'account-card card';
 
 // Format followers number (e.g., 12500 -> 12.5k)
 const formatFollowers = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
 };
 
 card.innerHTML = `
        <div class="account-card__header">
            <div>
                <div class="account-card__platform">${account.platform || 'Unknown'}</div>
                <div class="account-card__username">@${account.username || 'unknown'}</div>
            </div>
            <span class="stock-badge stock-badge--in">Available</span>
        </div>
        <ul class="account-card__specs">
            <li><span>Type:</span> <strong>${account.accountType || 'Standard'}</strong></li>
            <li><span>Age:</span> <strong>${account.accountAge || 'N/A'}</strong></li>
            <li><span>Followers:</span> <strong>${formatFollowers(account.followers || 0)}</strong></li>
            <li><span>Region:</span> <strong>${account.country || 'Global'}</strong></li>
        </ul>
        <div class="account-card__footer">
            <div class="account-card__price">$${parseFloat(account.price).toFixed(2)}</div>
            <button class="btn btn--primary btn--sm" data-id="${account.id}">Buy Account</button>
        </div>
    `;
 
 // Attach event listener to the buy button
 const buyBtn = card.querySelector('button');
 if (buyBtn) {
  buyBtn.addEventListener('click', (e) => {
   e.preventDefault();
   onSelect(account);
  });
 }
 
 return card;
}
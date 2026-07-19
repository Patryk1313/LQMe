const CLIENT_STRENGTH_USAGE = {
  6: 2,
  12: 3.5,
  18: 5.5,
};

let clientCart = [];
let popupTimeoutId = null;

function closeClientNoticeModal() {
  const modal = document.getElementById('clientNoticeModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function bindClientNoticeModal() {
  const modal = document.getElementById('clientNoticeModal');
  const closeBtn = document.getElementById('closeClientNoticeBtn');
  const confirmBtn = document.getElementById('clientNoticeConfirmBtn');
  const backdrop = document.querySelector('[data-close-client-notice="true"]');

  if (!modal || !closeBtn || !confirmBtn || !backdrop) {
    return;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  closeBtn.addEventListener('click', closeClientNoticeModal);
  confirmBtn.addEventListener('click', closeClientNoticeModal);
  backdrop.addEventListener('click', closeClientNoticeModal);
}

function getClientInventoryItem(inventory, itemId) {
  return inventory.find((item) => item.id === itemId);
}

function renderClientFlavors() {
  const data = getData();
  const clientFlavorList = document.getElementById('clientFlavorList');

  clientFlavorList.innerHTML = '';
  data.flavors.forEach((flavor) => {
    const card = document.createElement('article');
    card.className = 'card client-product-card';
    card.innerHTML = `
      <div class="client-product-main">
        <p class="card-title">${flavor.name}</p>
        <p class="client-flavor-description">${flavor.description}</p>
      </div>
      <div class="client-product-actions">
        <div class="client-buy-box">
          <div class="client-buy-field">
            <label for="type-${flavor.id}">Rodzaj</label>
            <select id="type-${flavor.id}" data-type-select="${flavor.id}">
              <option value="salt">Sól nikotynowa</option>
              <option value="nicotine">Nikotyna</option>
            </select>
          </div>
          <div class="client-buy-field">
            <label for="strength-${flavor.id}">Moc</label>
            <select id="strength-${flavor.id}" data-strength-select="${flavor.id}">
              <option value="6">6 mg</option>
              <option value="12">12 mg</option>
              <option value="18">18 mg</option>
            </select>
          </div>
          <div class="client-buy-field">
            <label for="quantity-${flavor.id}">Ilość</label>
            <input type="number" id="quantity-${flavor.id}" data-quantity-input="${flavor.id}" min="1" step="1" value="1" />
          </div>
        </div>
        <button type="button" class="client-cart-button" data-add-to-cart="${flavor.id}">Dodaj do koszyka</button>
      </div>
    `;

    card.querySelector('[data-add-to-cart]').addEventListener('click', () => {
      addToCart(flavor.id);
    });

    clientFlavorList.appendChild(card);
  });
}

function addToCart(flavorId) {
  const data = getData();
  const flavor = data.flavors.find((item) => item.id === flavorId);
  const typeInput = document.querySelector(`[data-type-select="${flavorId}"]`);
  const strengthInput = document.querySelector(`[data-strength-select="${flavorId}"]`);
  const quantityInput = document.querySelector(`[data-quantity-input="${flavorId}"]`);

  if (!flavor || !typeInput || !strengthInput || !quantityInput) {
    return;
  }

  const nicotineType = typeInput.value;
  const strength = Number(strengthInput.value);
  const quantity = Number(quantityInput.value);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    showClientPopup('Nie można dodać: ilość musi być większa od zera.');
    return;
  }

  const nextCart = clientCart.map((item) => ({ ...item }));
  const existingItem = nextCart.find((item) => item.flavorId === flavorId && item.strength === strength && item.nicotineType === nicotineType);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    nextCart.push({
      flavorId,
      flavorName: flavor.name,
      nicotineType,
      strength,
      quantity,
    });
  }

  const result = getCartRequirements(nextCart, data);
  if (!result.canFulfill) {
    showClientPopup(`Nie można dodać: ${result.shortages[0]}`);
    return;
  }

  clientCart = nextCart;

  quantityInput.value = '1';
  renderCart();
  showClientPopup('Produkt dodany do koszyka.');
}

function removeFromCart(flavorId, strength, nicotineType) {
  clientCart = clientCart.filter((item) => !(item.flavorId === flavorId && item.strength === strength && item.nicotineType === nicotineType));
  renderCart();
}

function getCartRequirements(cartItems, data) {
  const totals = {
    flavorUsageById: {},
    totalNicotineUsageByType: {
      salt: 0,
      nicotine: 0,
    },
    totalBaseUsage: 0,
    totalBottles: 0,
  };

  cartItems.forEach((item) => {
    const nicotineUsage = CLIENT_STRENGTH_USAGE[item.strength];
    const flavorUsage = 10 * item.quantity;
    const baseUsage = (60 - 10 - nicotineUsage) * item.quantity;

    totals.flavorUsageById[item.flavorId] = (totals.flavorUsageById[item.flavorId] || 0) + flavorUsage;
    totals.totalNicotineUsageByType[item.nicotineType] += nicotineUsage * item.quantity;
    totals.totalBaseUsage += baseUsage;
    totals.totalBottles += item.quantity;
  });

  const salt = getClientInventoryItem(data.inventory, 'salt');
  const nicotine = getClientInventoryItem(data.inventory, 'nicotine');
  const base = getClientInventoryItem(data.inventory, 'base');
  const bottles = getClientInventoryItem(data.inventory, 'bottles');

  const shortages = [];

  data.flavors.forEach((flavor) => {
    const needed = totals.flavorUsageById[flavor.id] || 0;
    if (needed > Number(flavor.quantity)) {
      shortages.push(`Za mało smaku ${flavor.name}`);
    }
  });

  if (totals.totalNicotineUsageByType.salt > Number(salt?.quantity || 0)) {
    shortages.push('Za mało soli w magazynie');
  }

  if (totals.totalNicotineUsageByType.nicotine > Number(nicotine?.quantity || 0)) {
    shortages.push('Za mało nikotyny w magazynie');
  }

  if (totals.totalBaseUsage > Number(base?.quantity || 0)) {
    shortages.push('Za mało bazy VG/PG');
  }

  if (totals.totalBottles > Number(bottles?.quantity || 0)) {
    shortages.push('Za mało butelek 60 ml');
  }

  return {
    totals,
    shortages,
    canFulfill: shortages.length === 0,
  };
}

function renderCartSummary(customMessage, customSuccess) {
  const cartSummary = document.getElementById('cartSummary');
  const data = getData();

  if (customMessage && clientCart.length === 0) {
    cartSummary.innerHTML = `<p class="cart-status ${customSuccess ? 'cart-ok' : 'cart-error'}">${customMessage}</p>`;
    return;
  }

  if (clientCart.length === 0) {
    cartSummary.innerHTML = '<p class="cart-status">Koszyk jest pusty.</p>';
    return;
  }

  const result = getCartRequirements(clientCart, data);
  const shortageList = result.shortages.length
    ? `<ul class="cart-shortages">${result.shortages.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';

  cartSummary.innerHTML = `
    <div class="cart-summary-box">
      ${result.canFulfill ? '' : '<p class="cart-status cart-error">Nie, tego zamówienia nie da się teraz zrealizować.</p>'}
      ${shortageList}
    </div>
  `;
}

function showClientPopup(message) {
  const popup = document.getElementById('clientPopup');
  popup.textContent = message;
  popup.classList.remove('hidden');
  popup.classList.add('visible');

  if (popupTimeoutId) {
    clearTimeout(popupTimeoutId);
  }

  popupTimeoutId = setTimeout(() => {
    popup.classList.remove('visible');
    popup.classList.add('hidden');
  }, 2600);
}

function renderCart() {
  const cartTableBody = document.getElementById('cartTableBody');

  cartTableBody.innerHTML = '';

  if (clientCart.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">Koszyk jest pusty.</td>';
    cartTableBody.appendChild(row);
    renderCartSummary();
    return;
  }

  clientCart.forEach((item) => {
    const typeLabel = item.nicotineType === 'salt' ? 'Sól' : 'Nikotyna';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.flavorName}</td>
      <td>${typeLabel}</td>
      <td>${item.strength} mg</td>
      <td>${item.quantity} szt.</td>
      <td><button type="button" class="table-button table-button-secondary" data-remove-cart="${item.flavorId}-${item.strength}-${item.nicotineType}">Usuń</button></td>
    `;

    row.querySelector('[data-remove-cart]').addEventListener('click', () => {
      removeFromCart(item.flavorId, item.strength, item.nicotineType);
    });

    cartTableBody.appendChild(row);
  });

  renderCartSummary();
}

renderClientFlavors();
renderCart();
bindClientNoticeModal();

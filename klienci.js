const CLIENT_STRENGTH_USAGE = {
    6: 2,
    12: 3.5,
    18: 5.5,
    20: 6,
};

const FLAVOR_USAGE_PER_BOTTLE_ML = 5;

let clientCart = [];
let popupTimeoutId = null;
let activeOrderFlavorId = null;

function setClientOrderMessage(text, isError = false) {
    const message = document.getElementById("clientOrderMessage");

    if (!message) {
        return;
    }

    message.textContent = text;
    message.classList.toggle("message-error", isError);
    message.classList.toggle("message-success", !isError && text.length > 0);
}

function buildNextCart(cartItems, flavor, nicotineType, strength, quantity) {
    const nextCart = cartItems.map((item) => ({ ...item }));
    const existingItem = nextCart.find(
        (item) =>
            item.flavorId === flavor.id &&
            item.strength === strength &&
            item.nicotineType === nicotineType,
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        nextCart.push({
            flavorId: flavor.id,
            flavorName: flavor.name,
            nicotineType,
            strength,
            quantity,
        });
    }

    return nextCart;
}

function floorRecipeCapacity(available, usagePerBottle) {
    if (usagePerBottle <= 0) {
        return 0;
    }

    return Math.max(0, Math.floor((available + 0.0001) / usagePerBottle));
}

function getRemainingResources(cartItems, data) {
    const result = getCartRequirements(cartItems, data);
    const salt = getClientInventoryItem(data.inventory, "salt");
    const nicotine = getClientInventoryItem(data.inventory, "nicotine");
    const base = getClientInventoryItem(data.inventory, "base");
    const bottles = getClientInventoryItem(data.inventory, "bottles");

    const remainingFlavorsById = {};

    data.flavors.forEach((flavor) => {
        const used = result.totals.flavorUsageById[flavor.id] || 0;
        remainingFlavorsById[flavor.id] = Math.max(
            0,
            Number(flavor.quantity) - used,
        );
    });

    return {
        flavorsById: remainingFlavorsById,
        inventory: {
            salt: Math.max(
                0,
                Number(salt?.quantity || 0) -
                result.totals.totalNicotineUsageByType.salt,
            ),
            nicotine: Math.max(
                0,
                Number(nicotine?.quantity || 0) -
                result.totals.totalNicotineUsageByType.nicotine,
            ),
            base: Math.max(
                0,
                Number(base?.quantity || 0) - result.totals.totalBaseUsage,
            ),
            bottles: Math.max(
                0,
                Number(bottles?.quantity || 0) - result.totals.totalBottles,
            ),
        },
    };
}

function getFlavorRecipeCapacity(
    flavorId,
    nicotineType,
    strength,
    remainingResources,
) {
    const nicotineUsage = CLIENT_STRENGTH_USAGE[strength];

    if (!nicotineUsage) {
        return 0;
    }

    const availableFlavor = Number(
        remainingResources.flavorsById[flavorId] || 0,
    );
    const availableNicotine = Number(
        remainingResources.inventory[nicotineType] || 0,
    );
    const availableBase = Number(remainingResources.inventory.base || 0);
    const availableBottles = Number(remainingResources.inventory.bottles || 0);

    const baseUsage = 60 - FLAVOR_USAGE_PER_BOTTLE_ML - nicotineUsage;

    const flavorCap = floorRecipeCapacity(
        availableFlavor,
        FLAVOR_USAGE_PER_BOTTLE_ML,
    );
    const nicotineCap = floorRecipeCapacity(availableNicotine, nicotineUsage);
    const baseCap = floorRecipeCapacity(availableBase, baseUsage);
    const bottleCap = Math.max(0, Math.floor(availableBottles));

    return Math.min(flavorCap, nicotineCap, baseCap, bottleCap);
}

function getFlavorProductionState(flavorId, data, cartItems) {
    const remainingResources = getRemainingResources(cartItems, data);
    let maxPossible = 0;

    ["salt", "nicotine"].forEach((nicotineType) => {
        [6, 12, 18, 20].forEach((strength) => {
            maxPossible = Math.max(
                maxPossible,
                getFlavorRecipeCapacity(
                    flavorId,
                    nicotineType,
                    strength,
                    remainingResources,
                ),
            );
        });
    });

    return {
        remainingResources,
        maxPossible,
    };
}

function getStockStatus(maxPossible) {
    if (maxPossible <= 0) {
        return {
            className: "stock-status-out",
            label: "0 szt.",
            cardClassName: "client-product-card-unavailable",
        };
    }

    if (maxPossible <= 3) {
        return {
            className: "stock-status-low",
            label: `${maxPossible} szt.`,
            cardClassName: "",
        };
    }

    return {
        className: "stock-status-ok",
        label: `${maxPossible} szt.`,
        cardClassName: "",
    };
}

function updateClientOrderAvailability() {
    if (activeOrderFlavorId === null) {
        return;
    }

    const data = getData();
    const submitButton = document.querySelector(
        '#clientOrderForm button[type="submit"]',
    );
    const nicotineType = document.getElementById("clientOrderType")?.value;
    const strength = Number(
        document.getElementById("clientOrderStrength")?.value,
    );
    const quantity = Number(
        document.getElementById("clientOrderQuantity")?.value || "1",
    );
    const flavor = data.flavors.find((item) => item.id === activeOrderFlavorId);

    if (!submitButton || !nicotineType || !strength || !flavor) {
        return;
    }

    const remainingResources = getRemainingResources(clientCart, data);
    const maxPossible = getFlavorRecipeCapacity(
        activeOrderFlavorId,
        nicotineType,
        strength,
        remainingResources,
    );

    if (maxPossible <= 0) {
        const result = getCartRequirements(
            buildNextCart(clientCart, flavor, nicotineType, strength, 1),
            data,
        );
        setClientOrderMessage(
            `Nie można dodać: ${result.shortages[0] || "brakuje materiału."}`,
            true,
        );
        submitButton.disabled = true;
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        setClientOrderMessage("Podaj ilość większą od zera.", true);
        submitButton.disabled = true;
        return;
    }

    if (quantity > maxPossible) {
        const result = getCartRequirements(
            buildNextCart(clientCart, flavor, nicotineType, strength, quantity),
            data,
        );
        setClientOrderMessage(
            `Nie można dodać: ${result.shortages[0] || `maksymalnie ${maxPossible} szt.`}`,
            true,
        );
        submitButton.disabled = true;
        return;
    }

    setClientOrderMessage(
        `Można dodać. Dla tej konfiguracji zostało maksymalnie ${maxPossible} szt.`,
        false,
    );
    submitButton.disabled = false;
}

function openClientOrderModal(flavorId) {
    const data = getData();
    const flavor = data.flavors.find((item) => item.id === flavorId);
    const modal = document.getElementById("clientOrderModal");
    const flavorName = document.getElementById("clientOrderFlavorName");
    const message = document.getElementById("clientOrderMessage");
    const quantityInput = document.getElementById("clientOrderQuantity");

    if (!flavor || !modal || !flavorName || !message || !quantityInput) {
        return;
    }

    activeOrderFlavorId = flavorId;
    flavorName.textContent = `${flavor.name} - ${flavor.description}`;
    quantityInput.value = "1";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    updateClientOrderAvailability();
}

function closeClientOrderModal() {
    const modal = document.getElementById("clientOrderModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    activeOrderFlavorId = null;
}

function closeClientCartModal() {
    const modal = document.getElementById("clientCartModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function renderClientCartModal() {
    const content = document.getElementById("clientCartModalContent");

    if (!content) {
        return;
    }

    if (clientCart.length === 0) {
        content.innerHTML = '<p class="storefront-cart-modal-empty">Koszyk jest pusty.</p>';
        return;
    }

    const data = getData();
    const result = getCartRequirements(clientCart, data);
    const shortageMessage = result.shortages.length
        ? `<p class="cart-status cart-error">${result.shortages[0]}</p>`
        : '<p class="cart-status cart-ok">Zamówienie można przygotować.</p>';

    content.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr><th>Smak</th><th>Wariant</th><th>Ilość</th><th>Akcja</th></tr>
                </thead>
                <tbody>
                    ${clientCart.map((item) => `
                        <tr>
                            <td>${item.flavorName}</td>
                            <td>${item.nicotineType === "salt" ? "Sól" : "Nikotyna"} / ${item.strength} mg</td>
                            <td>
                                <input
                                    class="cart-quantity-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value="${item.quantity}"
                                    data-edit-cart-quantity="true"
                                    data-flavor-id="${item.flavorId}"
                                    data-strength="${item.strength}"
                                    data-nicotine-type="${item.nicotineType}"
                                    aria-label="Ilość ${item.flavorName}"
                                />
                            </td>
                            <td>
                                <button
                                    type="button"
                                    class="table-button table-button-danger"
                                    data-remove-cart-modal="true"
                                    data-flavor-id="${item.flavorId}"
                                    data-strength="${item.strength}"
                                    data-nicotine-type="${item.nicotineType}"
                                >Usuń</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
        ${shortageMessage}
    `;

    content.querySelectorAll("[data-edit-cart-quantity]").forEach((input) => {
        input.addEventListener("change", () => {
            updateCartItemQuantity(
                input.dataset.flavorId,
                Number(input.dataset.strength),
                input.dataset.nicotineType,
                Number(input.value),
            );
        });
    });

    content.querySelectorAll("[data-remove-cart-modal]").forEach((button) => {
        button.addEventListener("click", () => {
            removeFromCart(
                Number(button.dataset.flavorId),
                Number(button.dataset.strength),
                button.dataset.nicotineType,
            );
        });
    });
}

function updateCartItemQuantity(flavorId, strength, nicotineType, quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        renderClientCartModal();
        showClientPopup("Ilość musi być większa od zera.");
        return;
    }

    const nextCart = clientCart.map((item) =>
        Number(item.flavorId) === Number(flavorId) &&
            Number(item.strength) === Number(strength) &&
            item.nicotineType === nicotineType
            ? { ...item, quantity }
            : { ...item },
    );
    const result = getCartRequirements(nextCart, getData());

    if (!result.canFulfill) {
        renderClientCartModal();
        showClientPopup(`Nie można ustawić tej ilości: ${result.shortages[0]}`);
        return;
    }

    clientCart = nextCart;
    renderClientFlavors();
    renderCart();
}

function openClientCartModal(afterAdd = false) {
    const modal = document.getElementById("clientCartModal");
    const title = document.getElementById("clientCartModalTitle");

    if (!modal || !title) {
        return;
    }

    title.textContent = afterAdd ? "Dodano do koszyka" : "Twoje zamówienie";
    renderClientCartModal();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function bindClientCartModal() {
    const openButton = document.getElementById("openCartModalBtn");
    const closeButton = document.getElementById("closeClientCartBtn");
    const continueButton = document.getElementById("continueShoppingBtn");
    const backdrop = document.querySelector('[data-close-client-cart="true"]');

    if (!openButton || !closeButton || !continueButton || !backdrop) {
        return;
    }

    openButton.addEventListener("click", (event) => {
        event.preventDefault();
        openClientCartModal();
    });
    closeButton.addEventListener("click", closeClientCartModal);
    continueButton.addEventListener("click", closeClientCartModal);
    backdrop.addEventListener("click", closeClientCartModal);
}

function addToCart(flavorId, nicotineType, strength, quantity) {
    const data = getData();
    const flavor = data.flavors.find((item) => item.id === flavorId);

    if (!flavor) {
        return false;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showClientPopup("Nie można dodać: ilość musi być większa od zera.");
        return false;
    }

    const nextCart = buildNextCart(
        clientCart,
        flavor,
        nicotineType,
        strength,
        quantity,
    );

    const result = getCartRequirements(nextCart, data);
    if (!result.canFulfill) {
        showClientPopup(`Nie można dodać: ${result.shortages[0]}`);
        return false;
    }

    clientCart = nextCart;
    renderClientFlavors();
    renderCart();
    openClientCartModal(true);
    return true;
}

function bindClientOrderModal() {
    const modal = document.getElementById("clientOrderModal");
    const closeBtn = document.getElementById("closeClientOrderBtn");
    const backdrop = document.querySelector('[data-close-client-order="true"]');
    const form = document.getElementById("clientOrderForm");
    const typeInput = document.getElementById("clientOrderType");
    const strengthInput = document.getElementById("clientOrderStrength");
    const quantityInput = document.getElementById("clientOrderQuantity");

    if (
        !modal ||
        !closeBtn ||
        !backdrop ||
        !form ||
        !typeInput ||
        !strengthInput ||
        !quantityInput
    ) {
        return;
    }

    closeBtn.addEventListener("click", closeClientOrderModal);
    backdrop.addEventListener("click", closeClientOrderModal);
    typeInput.addEventListener("change", updateClientOrderAvailability);
    strengthInput.addEventListener("change", updateClientOrderAvailability);
    quantityInput.addEventListener("input", updateClientOrderAvailability);

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (activeOrderFlavorId === null) {
            return;
        }

        const nicotineType = document.getElementById("clientOrderType").value;
        const strength = Number(
            document.getElementById("clientOrderStrength").value,
        );
        const quantity = Number(
            document.getElementById("clientOrderQuantity").value,
        );
        const remainingResources = getRemainingResources(clientCart, getData());
        const maxPossible = getFlavorRecipeCapacity(
            activeOrderFlavorId,
            nicotineType,
            strength,
            remainingResources,
        );

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setClientOrderMessage(
                "Błąd: ilość musi być większa od zera.",
                true,
            );
            return;
        }

        if (quantity > maxPossible) {
            updateClientOrderAvailability();
            return;
        }

        const added = addToCart(
            activeOrderFlavorId,
            nicotineType,
            strength,
            quantity,
        );

        if (added) {
            closeClientOrderModal();
        }
    });
}

function getClientInventoryItem(inventory, itemId) {
    return inventory.find((item) => item.id === itemId);
}

function renderClientFlavors() {
    const data = getData();
    const clientFlavorList = document.getElementById("clientFlavorList");
    const searchInput = document.getElementById("flavorSearchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    clientFlavorList.innerHTML = "";

    const filteredFlavors = data.flavors.filter((flavor) => {
        if (!query) {
            return true;
        }
        const nameMatch = flavor.name.toLowerCase().includes(query);
        const descMatch = (flavor.description || "").toLowerCase().includes(query);
        return nameMatch || descMatch;
    });

    if (filteredFlavors.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "muted store-no-results";
        emptyMsg.textContent = query
            ? `Brak smaków pasujących do wyszukiwania "${query}".`
            : "Brak dostępnych smaków.";
        clientFlavorList.appendChild(emptyMsg);
        return;
    }

    filteredFlavors.forEach((flavor) => {
        const productionState = getFlavorProductionState(
            flavor.id,
            data,
            clientCart,
        );
        const stockStatus = getStockStatus(productionState.maxPossible);
        const card = document.createElement("article");
        card.className =
            `card client-product-card ${stockStatus.cardClassName}`.trim();
        card.innerHTML = `
      <div class="client-product-main">
        <div class="client-flavor-header">
          <p class="client-flavor-name">${flavor.name}</p>
          <span class="client-stock-badge ${stockStatus.className}">${stockStatus.label}</span>
        </div>
        <p class="client-flavor-description">${flavor.description}</p>
      </div>
      <div class="client-product-actions">
        <button type="button" class="client-cart-button" data-add-to-cart="${flavor.id}" ${productionState.maxPossible > 0 ? "" : "disabled"}>${productionState.maxPossible > 0 ? "Dodaj" : "Niedostępne"}</button>
      </div>
    `;

        card.querySelector("[data-add-to-cart]").addEventListener(
            "click",
            () => {
                openClientOrderModal(flavor.id);
            },
        );

        clientFlavorList.appendChild(card);
    });
}

function removeFromCart(flavorId, strength, nicotineType) {
    clientCart = clientCart.filter(
        (item) =>
            !(
                item.flavorId === flavorId &&
                item.strength === strength &&
                item.nicotineType === nicotineType
            ),
    );
    renderClientFlavors();
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
        const flavorUsage = FLAVOR_USAGE_PER_BOTTLE_ML * item.quantity;
        const baseUsage =
            (60 - FLAVOR_USAGE_PER_BOTTLE_ML - nicotineUsage) * item.quantity;

        totals.flavorUsageById[item.flavorId] =
            (totals.flavorUsageById[item.flavorId] || 0) + flavorUsage;
        totals.totalNicotineUsageByType[item.nicotineType] +=
            nicotineUsage * item.quantity;
        totals.totalBaseUsage += baseUsage;
        totals.totalBottles += item.quantity;
    });

    const shortages = [];

    data.flavors.forEach((flavor) => {
        const needed = totals.flavorUsageById[flavor.id] || 0;
        if (needed > Number(flavor.quantity)) {
            shortages.push(`Za mało smaku ${flavor.name}`);
        }
    });

    const saltItem = getClientInventoryItem(data.inventory, "salt");
    const nicotineItem = getClientInventoryItem(data.inventory, "nicotine");
    const baseItem = getClientInventoryItem(data.inventory, "base");
    const bottleItem = getClientInventoryItem(data.inventory, "bottles");

    if (
        totals.totalNicotineUsageByType.salt > Number(saltItem?.quantity || 0)
    ) {
        shortages.push("Za mało soli nikotynowej");
    }
    if (
        totals.totalNicotineUsageByType.nicotine >
        Number(nicotineItem?.quantity || 0)
    ) {
        shortages.push("Za mało nikotyny");
    }
    if (totals.totalBaseUsage > Number(baseItem?.quantity || 0)) {
        shortages.push("Za mało bazy VG/PG");
    }
    if (totals.totalBottles > Number(bottleItem?.quantity || 0)) {
        shortages.push("Za mało butelek 60ml");
    }

    return {
        totals,
        shortages,
        canFulfill: shortages.length === 0,
    };
}

function renderCartSummary(customMessage, customSuccess) {
    const cartSummary = document.getElementById("cartSummary");
    const data = getData();

    if (clientCart.length === 0) {
        cartSummary.innerHTML = "";
        return;
    }

    const result = getCartRequirements(clientCart, data);
    const shortageList = result.shortages.length
        ? `<ul class="cart-shortages">${result.shortages.map((item) => `<li>${item}</li>`).join("")}</ul>`
        : "";
    const statusText = result.canFulfill
        ? ""
        : '<p class="cart-status cart-error">Nie, tego zamówienia nie da się teraz zrealizować.</p>';

    cartSummary.innerHTML = `
    <div class="cart-summary-box">
      ${statusText}
      ${shortageList}
    </div>
  `;
}

function buildOrderShareMessage() {
    if (clientCart.length === 0) {
        return "";
    }

    const data = getData();
    const result = getCartRequirements(clientCart, data);
    const lines = ["Cześć, do przygotowania mam takie zamówienie:", ""];

    clientCart.forEach((item, index) => {
        const typeLabel =
            item.nicotineType === "salt" ? "Sól nikotynowa" : "Nikotyna";
        lines.push(
            `${index + 1}. ${item.flavorName} | ${typeLabel} | ${item.strength} mg | ${item.quantity} szt.`,
        );
    });

    lines.push("");

    if (!result.canFulfill) {
        lines.push("Braki:");
        result.shortages.forEach((shortage) => {
            lines.push(`- ${shortage}`);
        });
    }

    return lines.join("\n");
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand("copy");
    } finally {
        document.body.removeChild(textArea);
    }
}

function openClientCopyModal() {
    const modal = document.getElementById("clientCopyModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeClientCopyModal() {
    const modal = document.getElementById("clientCopyModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function bindClientCopyModal() {
    const closeBtn = document.getElementById("closeClientCopyBtn");
    const okBtn = document.getElementById("clientCopyOkBtn");
    const backdrop = document.querySelector('[data-close-client-copy="true"]');

    if (!closeBtn || !okBtn || !backdrop) {
        return;
    }

    closeBtn.addEventListener("click", closeClientCopyModal);
    okBtn.addEventListener("click", closeClientCopyModal);
    backdrop.addEventListener("click", closeClientCopyModal);
}

function updateCopyOrderButtonState() {
    const copyBtn = document.getElementById("copyOrderBtn");

    if (!copyBtn) {
        return;
    }

    copyBtn.disabled = clientCart.length === 0;
}

function bindCopyOrderButton() {
    const copyBtn = document.getElementById("copyOrderBtn");

    if (!copyBtn) {
        return;
    }

    copyBtn.addEventListener("click", async () => {
        const text = buildOrderShareMessage();

        if (!text) {
            showClientPopup("Nie ma czego kopiować. Zamówienie jest puste.");
            return;
        }

        try {
            await copyTextToClipboard(text);
            openClientCopyModal();
        } catch (error) {
            showClientPopup("Nie udało się skopiować wiadomości do schowka.");
        }
    });
}

function showClientPopup(message) {
    const popup = document.getElementById("clientPopup");
    popup.textContent = message;
    popup.classList.remove("hidden");
    popup.classList.add("visible");

    if (popupTimeoutId) {
        clearTimeout(popupTimeoutId);
    }

    popupTimeoutId = setTimeout(() => {
        popup.classList.remove("visible");
        popup.classList.add("hidden");
    }, 2600);
}

function syncStorefrontState(showMessage = false) {
    renderClientFlavors();
    renderCart();
    updateClientOrderAvailability();
}

function bindStorefrontInventorySync() {
    window.addEventListener("storage", (event) => {
        if (event.key !== "lq_admin_data_v1") {
            return;
        }

        syncStorefrontState(true);
    });

    window.addEventListener("focus", () => {
        hydrateDataFromRemote()
            .then(() => {
                syncStorefrontState();
            })
            .catch(() => {
                syncStorefrontState();
            });
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") {
            return;
        }

        hydrateDataFromRemote()
            .then(() => {
                syncStorefrontState();
            })
            .catch(() => {
                syncStorefrontState();
            });
    });

    window.addEventListener("lqme:data-updated", () => {
        syncStorefrontState(true);
    });

    window.addEventListener("DOMContentLoaded", () => {
        hydrateDataFromRemote()
            .then(() => {
                syncStorefrontState(true);
            })
            .catch(() => { });
    });
}

function renderCart() {
    const cartTableBody = document.getElementById("cartTableBody");

    if (!cartTableBody) {
        renderClientCartModal();
        updateCopyOrderButtonState();
        return;
    }

    cartTableBody.innerHTML = "";

    if (clientCart.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="5">Zamówienie jest puste.</td>';
        cartTableBody.appendChild(row);
        renderCartSummary();
        updateCopyOrderButtonState();
        renderClientCartModal();
        return;
    }

    clientCart.forEach((item) => {
        const typeLabel = item.nicotineType === "salt" ? "Sól" : "Nikotyna";
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${item.flavorName}</td>
      <td>${typeLabel}</td>
      <td>${item.strength} mg</td>
      <td>${item.quantity} szt.</td>
      <td><button type="button" class="table-button table-button-secondary" data-remove-cart="${item.flavorId}-${item.strength}-${item.nicotineType}">Usuń</button></td>
    `;

        row.querySelector("[data-remove-cart]").addEventListener(
            "click",
            () => {
                removeFromCart(item.flavorId, item.strength, item.nicotineType);
            },
        );

        cartTableBody.appendChild(row);
    });

    renderCartSummary();
    updateCopyOrderButtonState();
    renderClientCartModal();
}

function bindFlavorSearch() {
    const searchInput = document.getElementById("flavorSearchInput");
    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("input", () => {
        renderClientFlavors();
    });
}

renderClientFlavors();
renderCart();
bindClientOrderModal();
bindClientCartModal();
bindStorefrontInventorySync();
bindCopyOrderButton();
bindClientCopyModal();
bindFlavorSearch();

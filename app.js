const STRENGTH_USAGE = {
    6: 2,
    12: 3.5,
    18: 5.5,
};

const DEFAULT_PRICE_LIST = {
    nicotine: {
        6: 35,
        12: 35,
        18: 40,
        20: 45,
    },
    salt: {
        6: 40,
        12: 40,
        18: 45,
        20: 50,
    },
};

function getFlavorStatus(quantity) {
    const value = Number(quantity);

    if (value <= 0) {
        return {
            label: "Brak",
            className: "status-out",
            hint: "Nie ma surowca do przygotowania kolejnej butelki.",
        };
    }

    if (value < 10) {
        return {
            label: "Krytyczny",
            className: "status-critical",
            hint: "Poniżej 10 ml. Zapas praktycznie się kończy.",
        };
    }

    if (value <= 30) {
        return {
            label: "Niski stan",
            className: "status-low",
            hint: "Zostało maksymalnie 30 ml aromatu.",
        };
    }

    return {
        label: "Dostępne",
        className: "status-ok",
        hint: "Stan jest bezpieczny do dalszej sprzedaży.",
    };
}

function getInventoryItem(inventory, itemId) {
    return inventory.find((item) => item.id === itemId);
}

function getSaleUnitPrice(nicotineType, strength) {
    const data = getData();
    const priceList = data.meta?.priceList || DEFAULT_PRICE_LIST;
    const byType = priceList[nicotineType];
    if (!byType) {
        return 0;
    }

    return Number(byType[strength] || 0);
}

function getInventoryMeterConfig(itemId, quantity) {
    const limits = {
        nicotine: 100,
        salt: 100,
        base: 2000,
        bottles: 100,
    };
    const safeQuantity = Math.max(0, Number(quantity) || 0);
    const limit = limits[itemId] || Math.max(safeQuantity, 1);
    const ratio = limit > 0 ? Math.min(safeQuantity / limit, 1) : 0;

    if (ratio <= 0.3) {
        return {
            fillPercent: Math.max(8, Math.round(ratio * 100)),
            barColor: "linear-gradient(90deg, #d63c3c 0%, #ef7a7a 100%)",
        };
    }

    if (ratio <= 0.65) {
        return {
            fillPercent: Math.max(8, Math.round(ratio * 100)),
            barColor: "linear-gradient(90deg, #d79118 0%, #f0bd57 100%)",
        };
    }

    return {
        fillPercent: Math.max(8, Math.round(ratio * 100)),
        barColor: "linear-gradient(90deg, #18a979 0%, #57c89f 100%)",
    };
}

function populateSaleFlavorOptions() {
    const data = getData();
    const saleFlavor = document.getElementById("saleFlavor");
    const currentValue = saleFlavor.value;
    const availableFlavors = data.flavors.filter(
        (flavor) => Number(flavor.quantity) >= 10,
    );

    saleFlavor.innerHTML = "";
    availableFlavors.forEach((flavor) => {
        const option = document.createElement("option");
        option.value = String(flavor.id);
        option.textContent = `${flavor.name} (${Number(flavor.quantity)} ${flavor.unit})`;
        saleFlavor.appendChild(option);
    });

    if (availableFlavors.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Brak dostępnych smaków";
        saleFlavor.appendChild(option);
        saleFlavor.value = "";
        return;
    }

    if (
        currentValue &&
        availableFlavors.some((flavor) => String(flavor.id) === currentValue)
    ) {
        saleFlavor.value = currentValue;
    }
}

function openSaleModal() {
    const modal = document.getElementById("saleModal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeSaleModal() {
    const modal = document.getElementById("saleModal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function bindSaleModal() {
    document
        .getElementById("openSaleModalBtn")
        .addEventListener("click", () => {
            populateSaleFlavorOptions();
            document.getElementById("saleMessage").textContent = "";
            openSaleModal();
        });

    document
        .getElementById("closeSaleModalBtn")
        .addEventListener("click", closeSaleModal);
    document
        .querySelector('[data-close-sale-modal="true"]')
        .addEventListener("click", closeSaleModal);
}

function bindSaleForm() {
    const form = document.getElementById("saleForm");
    const message = document.getElementById("saleMessage");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const data = getData();
        const flavorId = Number(document.getElementById("saleFlavor").value);
        const nicotineType = document.getElementById("saleNicotineType").value;
        const strength = Number(document.getElementById("saleStrength").value);
        const saleQuantity = Number(
            document.getElementById("saleQuantity").value,
        );
        const aromaMlPerBottle = Number(
            document.getElementById("saleAromaMl").value,
        );

        if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) {
            message.textContent = "Błąd: ilość sztuk musi być większa od zera.";
            return;
        }

        if (!Number.isFinite(aromaMlPerBottle) || aromaMlPerBottle <= 0) {
            message.textContent =
                "Błąd: ilość aromatu na 1 sztukę musi być większa od zera.";
            return;
        }

        const flavor = data.flavors.find((item) => item.id === flavorId);
        const nicotineUsage = STRENGTH_USAGE[strength];
        const baseUsagePerBottle = 60 - aromaMlPerBottle - nicotineUsage;

        if (
            !flavor ||
            !nicotineUsage ||
            Number(flavor.quantity) < aromaMlPerBottle
        ) {
            message.textContent = "Błąd: niepoprawne dane sprzedaży.";
            return;
        }

        if (baseUsagePerBottle < 0) {
            message.textContent =
                "Błąd: receptura przekracza 60 ml dla tej konfiguracji.";
            return;
        }

        const flavorRequired = aromaMlPerBottle * saleQuantity;
        const nicotineRequired = nicotineUsage * saleQuantity;
        const baseRequired = baseUsagePerBottle * saleQuantity;
        const bottlesRequired = saleQuantity;
        const unitPrice = getSaleUnitPrice(nicotineType, strength);
        const totalPrice = Number((unitPrice * saleQuantity).toFixed(2));

        const selectedNicotine = getInventoryItem(data.inventory, nicotineType);
        const base = getInventoryItem(data.inventory, "base");
        const bottles = getInventoryItem(data.inventory, "bottles");

        if (Number(flavor.quantity) < flavorRequired) {
            message.textContent = "Błąd: za mało smaku na tę sprzedaż.";
            return;
        }

        if (
            !selectedNicotine ||
            Number(selectedNicotine.quantity) < nicotineRequired
        ) {
            message.textContent = "Błąd: za mało wybranej nikotyny lub soli.";
            return;
        }

        if (!base || Number(base.quantity) < baseRequired) {
            message.textContent = "Błąd: za mało bazy VG/PG.";
            return;
        }

        if (!bottles || Number(bottles.quantity) < bottlesRequired) {
            message.textContent = "Błąd: za mało butelek 60 ml.";
            return;
        }

        const updatedFlavors = data.flavors.map((item) => {
            if (item.id !== flavorId) {
                return item;
            }

            return {
                ...item,
                quantity: Number(
                    (Number(item.quantity) - flavorRequired).toFixed(2),
                ),
            };
        });

        const updatedInventory = data.inventory.map((item) => {
            if (item.id === nicotineType) {
                return {
                    ...item,
                    quantity: Number(
                        (Number(item.quantity) - nicotineRequired).toFixed(2),
                    ),
                };
            }

            if (item.id === "base") {
                return {
                    ...item,
                    quantity: Number(
                        (Number(item.quantity) - baseRequired).toFixed(2),
                    ),
                };
            }

            if (item.id === "bottles") {
                return {
                    ...item,
                    quantity: Number(
                        (Number(item.quantity) - bottlesRequired).toFixed(2),
                    ),
                };
            }

            return item;
        });

        const saleEntry = {
            id: Date.now(),
            flavorId,
            flavorName: flavor.name,
            nicotineType,
            strength,
            saleQuantity,
            aromaMlPerBottle: Number(aromaMlPerBottle.toFixed(2)),
            unitPrice,
            totalPrice,
            flavorUsed: Number(flavorRequired.toFixed(2)),
            nicotineUsed: Number(nicotineRequired.toFixed(2)),
            baseUsed: Number(baseRequired.toFixed(2)),
            bottlesUsed: bottlesRequired,
            createdAt: new Date().toISOString(),
        };

        setData({
            ...data,
            inventory: updatedInventory,
            flavors: updatedFlavors,
            sales: [saleEntry, ...data.sales],
        });

        message.textContent =
            "Sprzedaż została dodana, a stany zostały zaktualizowane.";
        renderDashboard();
        populateSaleFlavorOptions();
        document.getElementById("saleQuantity").value = "1";
    });
}

function renderFirebaseStatus() {
    const statusEl = document.getElementById("firebaseStatus");
    if (!statusEl) {
        return;
    }

    const syncStatus = window.lqmeSyncStatus || {};
    const isConnected = syncStatus.isReady;

    statusEl.classList.toggle("connected", isConnected);
    statusEl.classList.toggle(
        "error",
        !isConnected && Boolean(syncStatus.lastError),
    );

    if (isConnected) {
        statusEl.textContent = "Połączono z bazą danych";
        return;
    }

    if (syncStatus.lastError) {
        statusEl.textContent = `Firebase: ${syncStatus.lastError}`;
        return;
    }

    statusEl.textContent = "Sprawdzam połączenie z bazą...";
}

function renderDashboard() {
    const data = getData();
    const cardsRoot = document.getElementById("cards");
    const flavorsBody = document.getElementById("flavorsBody");

    cardsRoot.innerHTML = "";
    data.inventory.forEach((item) => {
        const quantity = Number(item.quantity) || 0;
        const meter = getInventoryMeterConfig(item.id, quantity);
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
      <p class="card-title">${item.name}</p>
      <p class="card-value">${quantity} ${item.unit}</p>
      <div class="card-meter" aria-hidden="true"><span style="width: ${meter.fillPercent}%; background: ${meter.barColor};"></span></div>
    `;
        cardsRoot.appendChild(card);
    });

    flavorsBody.innerHTML = "";
    data.flavors.forEach((flavor) => {
        const status = getFlavorStatus(flavor.quantity);
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${flavor.name}</td>
      <td>${flavor.description}</td>
      <td>${Number(flavor.quantity)} ${flavor.unit}</td>
      <td><span class="status-badge ${status.className}" title="${status.hint}">${status.label}</span></td>
    `;

        flavorsBody.appendChild(row);
    });
}

async function initializeAppData() {
    try {
        const remoteData = await hydrateDataFromRemote();
        if (remoteData) {
            renderDashboard();
            populateSaleFlavorOptions();
        }
    } catch (error) {
        console.warn("LQME: nie udało się zainicjować danych", error);
    }
}

bindSaleModal();
populateSaleFlavorOptions();
bindSaleForm();
renderDashboard();
renderFirebaseStatus();
initializeAppData();

window.addEventListener("lqme:data-updated", () => {
    renderFirebaseStatus();
    renderDashboard();
    populateSaleFlavorOptions();
});

window.addEventListener("lqme:sync-status-updated", () => {
    renderFirebaseStatus();
});

window.addEventListener("focus", () => {
    hydrateDataFromRemote().catch(() => {});
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        hydrateDataFromRemote().catch(() => {});
    }
});

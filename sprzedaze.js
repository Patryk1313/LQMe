function formatSaleDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

let salesTrendChart = null;
let editingSaleId = null;
let salesChartDays = 14;

function closeEditSaleModal() {
    const modal = document.getElementById("editSaleModal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    editingSaleId = null;
}

function openEditSaleModal(sale) {
    const modal = document.getElementById("editSaleModal");
    const summary = document.getElementById("editSaleSummary");
    const customerInput = document.getElementById("editSaleCustomerName");
    const message = document.getElementById("editSaleMessage");

    editingSaleId = sale.id;
    summary.textContent = `${sale.flavorName || "Sprzedaż"} | ${sale.saleQuantity} szt. | ${formatSaleDate(sale.createdAt)}`;
    customerInput.value = sale.customerName || "";
    message.textContent = "";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    customerInput.focus();
}

function bindEditSaleModal() {
    const form = document.getElementById("editSaleForm");
    const closeButton = document.getElementById("closeEditSaleBtn");
    const backdrop = document.querySelector('[data-close-edit-sale="true"]');

    closeButton.addEventListener("click", closeEditSaleModal);
    backdrop.addEventListener("click", closeEditSaleModal);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = document.getElementById("editSaleMessage");
        const customerName = document.getElementById("editSaleCustomerName").value.trim();
        const data = getData();
        const saleExists = data.sales.some((sale) => sale.id === editingSaleId);

        if (!saleExists) {
            message.textContent = "Nie znaleziono tej sprzedaży.";
            message.classList.add("message-error");
            return;
        }

        const updatedSales = data.sales.map((sale) =>
            sale.id === editingSaleId ? { ...sale, customerName } : sale,
        );
        setData({ ...data, sales: updatedSales });
        message.textContent = "Dane klienta zostały zapisane.";
        message.classList.remove("message-error");
        message.classList.add("message-success");
        renderSalesTable();
        closeEditSaleModal();
    });
}

function renderSalesTrendChart() {
    const canvas = document.getElementById("salesTrendChart");
    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const data = getData();
    const dailySales = new Map();
    const today = new Date();

    for (let dayOffset = salesChartDays - 1; dayOffset >= 0; dayOffset -= 1) {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(today.getDate() - dayOffset);
        dailySales.set(date.toISOString().slice(0, 10), 0);
    }

    data.sales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        if (Number.isNaN(saleDate.getTime())) {
            return;
        }

        const dateKey = saleDate.toISOString().slice(0, 10);
        if (dailySales.has(dateKey)) {
            dailySales.set(
                dateKey,
                dailySales.get(dateKey) + Number(sale.saleQuantity || 0),
            );
        }
    });

    if (salesTrendChart) {
        salesTrendChart.destroy();
    }

    salesTrendChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: [...dailySales.keys()].map((date) =>
                new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "2-digit",
                }),
            ),
            datasets: [{
                label: "Sprzedane sztuki",
                data: [...dailySales.values()],
                borderColor: "#2f8f83",
                backgroundColor: "rgba(47, 143, 131, 0.14)",
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    });
}

function renderSalesStats() {
    const data = getData();
    const salesStats = document.getElementById("salesStats");
    const totalBottles = data.sales.reduce(
        (sum, sale) => sum + Number(sale.saleQuantity || 0),
        0,
    );
    const totalRevenue = data.sales.reduce(
        (sum, sale) => sum + Number(sale.totalPrice || 0),
        0,
    );
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setDate(rangeStart.getDate() - salesChartDays + 1);
    const rangeBottles = data.sales.reduce((sum, sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= rangeStart
            ? sum + Number(sale.saleQuantity || 0)
            : sum;
    }, 0);
    const totalProfit = data.sales.length * 5;
    const maxValue = Math.max(totalRevenue, totalBottles, totalProfit, 1);

    const stats = [
        {
            label: "Sprzedane LQ",
            value: `${rangeBottles} szt.`,
            subtitle: `Wybrany zakres: ${salesChartDays} dni`,
            fillPercent: Math.max(
                10,
                Math.round((rangeBottles / Math.max(totalBottles, 1)) * 100),
            ),
        },
        {
            label: "Łączna wartość sprzedaży",
            value: `${Number(totalRevenue.toFixed(2))} zł`,
            subtitle: "Suma wszystkich zapisanych zamówień",
            fillPercent: Math.max(
                10,
                Math.round((totalRevenue / maxValue) * 100),
            ),
        },
        {
            label: "Sprzedane sztuki",
            value: totalBottles,
            subtitle: "Liczba sprzedanych butelek 60 ml",
            fillPercent: Math.max(
                10,
                Math.round((totalBottles / maxValue) * 100),
            ),
        },
        {
            label: "Łączny profit",
            value: `${totalProfit} zł`,
            subtitle: "Przyjęto 5 zł zysku na każdą zapisaną sprzedaż",
            fillPercent: Math.max(
                10,
                Math.round((totalProfit / maxValue) * 100),
            ),
        },
    ];

    salesStats.innerHTML = "";
    stats.forEach((stat) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
      <p class="card-title">${stat.label}</p>
      <p class="card-value">${stat.value}</p>
      <p class="card-subtitle">${stat.subtitle}</p>
      <div class="card-meter" aria-hidden="true"><span style="width: ${stat.fillPercent}%"></span></div>
    `;
        salesStats.appendChild(card);
    });

    renderSalesTrendChart();
}

function bindSalesChartRange() {
    const rangeSelect = document.getElementById("salesChartRange");

    if (!rangeSelect) {
        return;
    }

    rangeSelect.addEventListener("change", (event) => {
        salesChartDays = Number(event.target.value) || 14;
        renderSalesStats();
    });
}

function deleteSale(saleId) {
    const data = getData();
    const saleToDelete = data.sales.find((sale) => sale.id === saleId);

    if (!saleToDelete) {
        return;
    }

    const restoredInventory = data.inventory.map((item) => {
        if (item.id === saleToDelete.nicotineType) {
            return {
                ...item,
                quantity: Number(
                    (
                        Number(item.quantity) +
                        Number(saleToDelete.nicotineUsed || 0)
                    ).toFixed(2),
                ),
            };
        }

        if (item.id === "base") {
            return {
                ...item,
                quantity: Number(
                    (
                        Number(item.quantity) +
                        Number(saleToDelete.baseUsed || 0)
                    ).toFixed(2),
                ),
            };
        }

        if (item.id === "bottles") {
            return {
                ...item,
                quantity: Number(
                    (
                        Number(item.quantity) +
                        Number(saleToDelete.bottlesUsed || 0)
                    ).toFixed(2),
                ),
            };
        }

        return item;
    });

    const restoredFlavors = data.flavors.map((flavor) => {
        if (flavor.id !== saleToDelete.flavorId) {
            return flavor;
        }

        return {
            ...flavor,
            quantity: Number(
                (
                    Number(flavor.quantity) +
                    Number(saleToDelete.flavorUsed || 0)
                ).toFixed(2),
            ),
        };
    });

    setData({
        ...data,
        inventory: restoredInventory,
        flavors: restoredFlavors,
        sales: data.sales.filter((sale) => sale.id !== saleId),
    });

    renderSalesStats();
    renderSalesTable();
}

function renderSalesTable() {
    const data = getData();
    const salesTableBody = document.getElementById("salesTableBody");

    salesTableBody.innerHTML = "";

    if (data.sales.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="9">Brak zapisanych sprzedaży.</td>';
        salesTableBody.appendChild(row);
        return;
    }

    data.sales.forEach((sale) => {
        const typeLabel =
            sale.nicotineType === "salt" ? "Sól nikotynowa" : "Nikotyna";
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${formatSaleDate(sale.createdAt)}</td>
            <td>${sale.customerName || "Brak danych"}</td>
      <td>${sale.flavorName}</td>
      <td>${typeLabel}</td>
      <td>${sale.strength} mg</td>
      <td>${Number(sale.unitPrice || 0)} zł</td>
      <td>${Number(sale.totalPrice || 0)} zł</td>
      <td>${sale.saleQuantity}</td>
            <td class="actions-cell">
                <button type="button" class="table-button table-button-secondary" data-edit-sale="${sale.id}">Edytuj</button>
                <button type="button" class="table-button table-button-danger" data-delete-sale="${sale.id}">Usuń</button>
            </td>
    `;

        row.querySelector("[data-edit-sale]").addEventListener("click", () => {
            openEditSaleModal(sale);
        });

        row.querySelector("[data-delete-sale]").addEventListener(
            "click",
            () => {
                const confirmed = window.confirm(
                    "Czy na pewno usunąć ten wpis sprzedaży?",
                );
                if (confirmed) {
                    deleteSale(sale.id);
                }
            },
        );

        salesTableBody.appendChild(row);
    });
}

async function initializeSalesData() {
    try {
        const remoteData = await hydrateDataFromRemote();
        if (remoteData) {
            renderSalesStats();
            renderSalesTable();
        }
    } catch (error) {
        console.warn("LQME sprzedaże: nie udało się zainicjować danych", error);
    }
}

renderSalesStats();
renderSalesTable();
bindSalesChartRange();
bindEditSaleModal();
initializeSalesData();

window.addEventListener("lqme:data-updated", () => {
    renderSalesStats();
    renderSalesTable();
});

window.addEventListener("focus", () => {
    hydrateDataFromRemote().catch(() => { });
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        hydrateDataFromRemote().catch(() => { });
    }
});

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
    const totalProfit = data.sales.reduce(
        (sum, sale) => sum + Number(sale.saleQuantity || 0) * 5,
        0,
    );
    const maxValue = Math.max(totalRevenue, totalBottles, totalProfit, 1);

    const stats = [
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
            subtitle: "Przyjęto 5 zł zysku na każdą sprzedaną sztukę",
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
        row.innerHTML = '<td colspan="12">Brak zapisanych sprzedaży.</td>';
        salesTableBody.appendChild(row);
        return;
    }

    data.sales.forEach((sale) => {
        const typeLabel =
            sale.nicotineType === "salt" ? "Sól nikotynowa" : "Nikotyna";
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${formatSaleDate(sale.createdAt)}</td>
      <td>${sale.flavorName}</td>
      <td>${typeLabel}</td>
      <td>${sale.strength} mg</td>
      <td>${Number(sale.unitPrice || 0)} zł</td>
      <td>${Number(sale.totalPrice || 0)} zł</td>
      <td>${sale.saleQuantity}</td>
      <td>${sale.flavorUsed} ml</td>
      <td>${sale.nicotineUsed} ml</td>
      <td>${sale.baseUsed} ml</td>
      <td>${sale.bottlesUsed}</td>
      <td><button type="button" class="table-button table-button-danger" data-delete-sale="${sale.id}">Usuń</button></td>
    `;

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
initializeSalesData();

window.addEventListener("lqme:data-updated", () => {
    renderSalesStats();
    renderSalesTable();
});

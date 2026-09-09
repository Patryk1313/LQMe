function formatClientDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("pl-PL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
}

function getClientSummaries() {
    const summaries = new Map();
    const data = getData();

    (data.clients || []).forEach((client) => {
        summaries.set(client.key, {
            name: client.name,
            orders: 0,
            bottles: 0,
            revenue: 0,
            lastSale: null,
            sales: [],
        });
    });

    (data.sales || []).forEach((sale) => {
        const name = (sale.customerName || "Brak danych").trim() || "Brak danych";
        const key = name.toLocaleLowerCase("pl-PL");
        const existing = summaries.get(key) || {
            name,
            orders: 0,
            bottles: 0,
            revenue: 0,
            lastSale: null,
            sales: [],
        };

        existing.orders += 1;
        existing.bottles += Number(sale.saleQuantity || 0);
        existing.revenue += Number(sale.totalPrice || 0);
        existing.sales.push(sale);
        if (!existing.lastSale || new Date(sale.createdAt) > new Date(existing.lastSale)) {
            existing.lastSale = sale.createdAt;
        }
        summaries.set(key, existing);
    });

    return [...summaries.values()].sort((a, b) => b.bottles - a.bottles);
}

function closeClientDetails() {
    const modal = document.getElementById("clientDetailsModal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function showClientDetails(client) {
    const modal = document.getElementById("clientDetailsModal");
    const title = document.getElementById("clientDetailsTitle");
    const content = document.getElementById("clientDetailsContent");

    title.textContent = client.name;
    content.innerHTML = `
        <div class="client-detail-stats">
            <div><strong>${client.bottles}</strong><span> szt. LQ</span></div>
            <div><strong>${client.orders}</strong><span> zamówień</span></div>
            <div><strong>${client.revenue.toFixed(2)} zł</strong><span> wartość</span></div>
        </div>
        <div class="table-wrap client-detail-table-wrap">
            <table>
                <thead><tr><th>Data</th><th>Smak</th><th>Moc</th><th>Ilość</th><th>Wartość</th></tr></thead>
                <tbody>
                    ${client.sales.map((sale) => `
                        <tr>
                            <td>${formatClientDate(sale.createdAt)}</td>
                            <td>${sale.flavorName || "-"}</td>
                            <td>${sale.strength || "-"} mg</td>
                            <td>${Number(sale.saleQuantity || 0)} szt.</td>
                            <td>${Number(sale.totalPrice || 0).toFixed(2)} zł</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function renderClients() {
    const clients = getClientSummaries();
    const body = document.getElementById("clientsTableBody");
    const count = document.getElementById("clientsCount");
    body.innerHTML = "";
    count.textContent = `${clients.length} ${clients.length === 1 ? "klient" : "klientów"}`;

    if (clients.length === 0) {
        body.innerHTML = '<tr><td colspan="6">Brak zapisanych klientów.</td></tr>';
        return;
    }

    clients.forEach((client) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="font-weight-bold"></td>
            <td>${client.orders}</td>
            <td><strong>${client.bottles}</strong> szt.</td>
            <td>${client.revenue.toFixed(2)} zł</td>
            <td>${formatClientDate(client.lastSale)}</td>
            <td><button type="button" class="table-button table-button-secondary">Szczegóły</button></td>
        `;
        row.querySelector("td").textContent = client.name;
        row.querySelector("button").addEventListener("click", () => showClientDetails(client));
        body.appendChild(row);
    });
}

function initializeClientsPage() {
    renderClients();
    document.getElementById("closeClientDetailsBtn").addEventListener("click", closeClientDetails);
    document.querySelector('[data-close-client-details="true"]').addEventListener("click", closeClientDetails);
    window.addEventListener("lqme:data-updated", renderClients);
    hydrateDataFromRemote().then(renderClients).catch(() => { });
}

initializeClientsPage();

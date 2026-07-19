function formatSaleDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderSalesStats() {
  const data = getData();
  const salesStats = document.getElementById('salesStats');
  const totalBottles = data.sales.reduce((sum, sale) => sum + Number(sale.saleQuantity || 0), 0);
  const totalRevenue = data.sales.reduce((sum, sale) => sum + Number(sale.totalPrice || 0), 0);
  const totalProfit = data.sales.length * 5;
  const maxValue = Math.max(totalRevenue, totalBottles, totalProfit, 1);

  const stats = [
    {
      label: 'Łączna wartość sprzedaży',
      value: `${Number(totalRevenue.toFixed(2))} zł`,
      subtitle: 'Suma wszystkich zapisanych zamówień',
      fillPercent: Math.max(10, Math.round((totalRevenue / maxValue) * 100)),
    },
    {
      label: 'Sprzedane sztuki',
      value: totalBottles,
      subtitle: 'Liczba sprzedanych butelek 60 ml',
      fillPercent: Math.max(10, Math.round((totalBottles / maxValue) * 100)),
    },
    {
      label: 'Łączny profit',
      value: `${totalProfit} zł`,
      subtitle: 'Przyjęto 5 zł zysku na każdą zapisaną sprzedaż',
      fillPercent: Math.max(10, Math.round((totalProfit / maxValue) * 100)),
    },
  ];

  salesStats.innerHTML = '';
  stats.forEach((stat) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <p class="card-title">${stat.label}</p>
      <p class="card-value">${stat.value}</p>
      <p class="card-subtitle">${stat.subtitle}</p>
      <div class="card-meter" aria-hidden="true"><span style="width: ${stat.fillPercent}%"></span></div>
    `;
    salesStats.appendChild(card);
  });
}

function renderSalesTable() {
  const data = getData();
  const salesTableBody = document.getElementById('salesTableBody');

  salesTableBody.innerHTML = '';

  if (data.sales.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="11">Brak zapisanych sprzedaży.</td>';
    salesTableBody.appendChild(row);
    return;
  }

  data.sales.forEach((sale) => {
    const typeLabel = sale.nicotineType === 'salt' ? 'Sól nikotynowa' : 'Nikotyna';
    const row = document.createElement('tr');
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
    `;
    salesTableBody.appendChild(row);
  });
}

renderSalesStats();
renderSalesTable();
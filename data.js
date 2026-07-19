const STORAGE_KEY = 'lq_admin_data_v1';

const DEFAULT_DATA = {
  inventory: [
    { id: 'salt', name: 'Sól nikotynowa', quantity: 1200, unit: 'ml' },
    { id: 'nicotine', name: 'Nikotyna', quantity: 500, unit: 'ml' },
    { id: 'base', name: 'Baza VG/PG', quantity: 8000, unit: 'ml' },
    { id: 'bottles', name: 'Butelki 60ml', quantity: 500, unit: 'szt.' },
  ],
  flavors: [
    { id: 1, name: 'Orange', description: 'Soczysta pomarancza', quantity: 140, unit: 'ml' },
    { id: 2, name: 'Blueberry', description: 'Jagoda', quantity: 80, unit: 'ml' },
    { id: 3, name: 'Mint Ice', description: 'Mietowy chlod', quantity: 95, unit: 'ml' },
  ],
  sales: [],
};

function createDefaultData() {
  return structuredClone(DEFAULT_DATA);
}

function normalizeData(data) {
  return {
    inventory: Array.isArray(data.inventory) ? data.inventory : createDefaultData().inventory,
    flavors: Array.isArray(data.flavors) ? data.flavors : createDefaultData().flavors,
    sales: Array.isArray(data.sales) ? data.sales : [],
  };
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return createDefaultData();
  }

  try {
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return createDefaultData();
  }
}

function setData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

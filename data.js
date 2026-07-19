const STORAGE_KEY = 'lq_admin_data_v1';
const INVENTORY_PRESET_VERSION = 1;
const FLAVOR_PRESET_VERSION = 1;

const DEFAULT_DATA = {
  inventory: [
    { id: 'salt', name: 'Sól nikotynowa', quantity: 80, unit: 'ml' },
    { id: 'nicotine', name: 'Nikotyna', quantity: 40, unit: 'ml' },
    { id: 'base', name: 'Baza VG/PG', quantity: 800, unit: 'ml' },
    { id: 'bottles', name: 'Butelki 60ml', quantity: 18, unit: 'szt.' },
  ],
  flavors: [
    { id: 1, name: 'Orange', description: 'Soczysta pomarancza', quantity: 20, unit: 'ml' },
    { id: 2, name: 'Blueberry', description: 'Jagoda', quantity: 40, unit: 'ml' },
    { id: 3, name: 'Mint Ice', description: 'Mietowy chlod', quantity: 0, unit: 'ml' },
  ],
  sales: [],
  meta: {
    inventoryPresetVersion: INVENTORY_PRESET_VERSION,
    flavorPresetVersion: FLAVOR_PRESET_VERSION,
  },
};

function createDefaultData() {
  return structuredClone(DEFAULT_DATA);
}

function applyInventoryPreset(inventory) {
  const defaults = createDefaultData().inventory;

  return defaults.map((defaultItem) => {
    const existingItem = Array.isArray(inventory)
      ? inventory.find((item) => item.id === defaultItem.id)
      : null;

    return {
      ...defaultItem,
      ...(existingItem || {}),
      quantity: defaultItem.quantity,
    };
  });
}

function applyFlavorPreset(flavors) {
  const defaults = createDefaultData().flavors;

  return defaults.map((defaultFlavor) => {
    const existingFlavor = Array.isArray(flavors)
      ? flavors.find((item) => Number(item.id) === Number(defaultFlavor.id))
      : null;

    return {
      ...defaultFlavor,
      ...(existingFlavor || {}),
      quantity: defaultFlavor.quantity,
    };
  });
}

function normalizeData(data) {
  const normalized = {
    inventory: Array.isArray(data.inventory) ? data.inventory : createDefaultData().inventory,
    flavors: Array.isArray(data.flavors) ? data.flavors : createDefaultData().flavors,
    sales: Array.isArray(data.sales) ? data.sales : [],
    meta: data && typeof data.meta === 'object' && data.meta !== null ? data.meta : {},
  };

  if (normalized.meta.inventoryPresetVersion !== INVENTORY_PRESET_VERSION) {
    normalized.inventory = applyInventoryPreset(normalized.inventory);
    normalized.meta.inventoryPresetVersion = INVENTORY_PRESET_VERSION;
  }

  if (normalized.meta.flavorPresetVersion !== FLAVOR_PRESET_VERSION) {
    normalized.flavors = applyFlavorPreset(normalized.flavors);
    normalized.meta.flavorPresetVersion = FLAVOR_PRESET_VERSION;
  }

  return {
    inventory: normalized.inventory,
    flavors: normalized.flavors,
    sales: normalized.sales,
    meta: normalized.meta,
  };
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return createDefaultData();
  }

  try {
    const normalized = normalizeData(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return createDefaultData();
  }
}

function setData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

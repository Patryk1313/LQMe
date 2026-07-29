const STORAGE_KEY = "lq_admin_data_v1";
const INVENTORY_PRESET_VERSION = 1;
const FLAVOR_PRESET_VERSION = 1;
let currentData = null;

const DEFAULT_DATA = {
    inventory: [
        { id: "salt", name: "Sól nikotynowa", quantity: 80, unit: "ml" },
        { id: "nicotine", name: "Nikotyna", quantity: 40, unit: "ml" },
        { id: "base", name: "Baza VG/PG", quantity: 800, unit: "ml" },
        { id: "bottles", name: "Butelki 60ml", quantity: 18, unit: "szt." },
    ],
    flavors: [
        {
            id: 1,
            name: "Orange",
            description: "Soczysta pomarancza",
            quantity: 20,
            unit: "ml",
        },
        {
            id: 2,
            name: "Blueberry",
            description: "Jagoda",
            quantity: 40,
            unit: "ml",
        },
        {
            id: 3,
            name: "Mint Ice",
            description: "Mietowy chlod",
            quantity: 0,
            unit: "ml",
        },
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
            ? flavors.find(
                  (item) => Number(item.id) === Number(defaultFlavor.id),
              )
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
        inventory: Array.isArray(data.inventory)
            ? data.inventory
            : createDefaultData().inventory,
        flavors: Array.isArray(data.flavors)
            ? data.flavors
            : createDefaultData().flavors,
        sales: Array.isArray(data.sales) ? data.sales : [],
        meta:
            data && typeof data.meta === "object" && data.meta !== null
                ? data.meta
                : {},
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

function persistData(data) {
    const normalized = normalizeData(data);
    currentData = normalized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function getData() {
    if (currentData) {
        return currentData;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const defaultData = createDefaultData();
        persistData(defaultData);
        return defaultData;
    }

    try {
        const normalized = normalizeData(JSON.parse(raw));
        persistData(normalized);
        return normalized;
    } catch (error) {
        const defaultData = createDefaultData();
        persistData(defaultData);
        return defaultData;
    }
}

function setData(data) {
    const normalized = persistData(data);

    if (
        window.firebaseSync &&
        typeof window.firebaseSync.writeData === "function"
    ) {
        window.firebaseSync.writeData(normalized).catch(() => {});
    }

    return normalized;
}

async function loadDataWithRemoteFallback() {
    const remoteData = await window.firebaseSync?.loadRemoteData?.();
    if (remoteData) {
        return setData(remoteData);
    }

    return getData();
}

async function hydrateDataFromRemote() {
    const remoteData = await window.firebaseSync?.loadRemoteData?.();
    if (remoteData) {
        return setData(remoteData);
    }

    return getData();
}

window.addEventListener("lqme:data-updated", (event) => {
    if (event.detail) {
        persistData(event.detail);
    }
});

const PRICE_LIST_STORAGE_KEY = "lqme_price_list";

function getPriceList() {
    const data = getData();
    if (data.meta && data.meta.priceList) {
        return data.meta.priceList;
    }

    return {
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
}

function savePriceList(priceList) {
    const data = getData();
    const nextData = {
        ...data,
        meta: {
            ...data.meta,
            priceList,
        },
    };

    setData(nextData);
}

function populatePriceForm() {
    const priceList = getPriceList();

    document.getElementById("nicotine6").value = priceList.nicotine[6] ?? "";
    document.getElementById("nicotine12").value = priceList.nicotine[12] ?? "";
    document.getElementById("nicotine18").value = priceList.nicotine[18] ?? "";
    document.getElementById("nicotine20").value = priceList.nicotine[20] ?? "";

    document.getElementById("salt6").value = priceList.salt[6] ?? "";
    document.getElementById("salt12").value = priceList.salt[12] ?? "";
    document.getElementById("salt18").value = priceList.salt[18] ?? "";
    document.getElementById("salt20").value = priceList.salt[20] ?? "";
}

function bindPriceForm() {
    const form = document.getElementById("priceForm");
    const message = document.getElementById("priceMessage");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const priceList = {
            nicotine: {
                6: Number(document.getElementById("nicotine6").value || 0),
                12: Number(document.getElementById("nicotine12").value || 0),
                18: Number(document.getElementById("nicotine18").value || 0),
                20: Number(document.getElementById("nicotine20").value || 0),
            },
            salt: {
                6: Number(document.getElementById("salt6").value || 0),
                12: Number(document.getElementById("salt12").value || 0),
                18: Number(document.getElementById("salt18").value || 0),
                20: Number(document.getElementById("salt20").value || 0),
            },
        };

        savePriceList(priceList);
        message.textContent = "Cennik został zapisany.";
    });
}

async function initializeCennikData() {
    try {
        await hydrateDataFromRemote();
    } catch (error) {
        console.warn("LQME cennik: nie udało się zainicjować danych", error);
    }

    populatePriceForm();
}

document.addEventListener("DOMContentLoaded", () => {
    bindPriceForm();
    initializeCennikData();
});

window.addEventListener("lqme:data-updated", () => {
    populatePriceForm();
});

window.addEventListener("focus", () => {
    hydrateDataFromRemote().catch(() => {});
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        hydrateDataFromRemote().catch(() => {});
    }
});

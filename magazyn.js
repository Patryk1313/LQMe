let activeFlavorEditId = null;
let activeFlavorDetailsEditId = null;
let magazynPopupTimeoutId = null;

function isValidFlavorQuantity(value) {
    return Number.isInteger(value) && value >= 0 && value % 10 === 0;
}

function clearMagazynMessages() {
    const inventoryMessage = document.getElementById("inventoryMessage");
    const flavorMessage = document.getElementById("flavorMessage");

    if (inventoryMessage) {
        inventoryMessage.textContent = "";
    }

    if (flavorMessage) {
        flavorMessage.textContent = "";
    }
}

function closeMagazynPopup() {
    const popup = document.getElementById("magazynPopup");

    if (!popup) {
        return;
    }

    popup.classList.remove("visible", "admin-popup-error");
    popup.classList.add("hidden");
}

function showMagazynPopup(message, isError = false) {
    const popup = document.getElementById("magazynPopup");
    const popupText = document.getElementById("magazynPopupText");

    clearMagazynMessages();

    if (!popup || !popupText) {
        return;
    }

    popupText.textContent = message;
    popup.classList.remove("hidden", "admin-popup-error");

    if (isError) {
        popup.classList.add("admin-popup-error");
    }

    popup.classList.add("visible");

    if (magazynPopupTimeoutId) {
        clearTimeout(magazynPopupTimeoutId);
    }

    magazynPopupTimeoutId = setTimeout(() => {
        closeMagazynPopup();
    }, 2800);
}

function bindMagazynPopup() {
    const closeButton = document.getElementById("closeMagazynPopupBtn");

    if (!closeButton) {
        return;
    }

    closeButton.addEventListener("click", closeMagazynPopup);
}

function renderInventoryEditor() {
    const data = getData();
    const inventoryBody = document.getElementById("inventoryBody");

    inventoryBody.innerHTML = "";
    data.inventory.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${item.name}</td>
      <td>${Number(item.quantity)}</td>
      <td>
        <input type="number" min="0" step="0.01" data-id="${item.id}" value="${Number(item.quantity)}" />
      </td>
      <td>${item.unit}</td>
    `;
        inventoryBody.appendChild(row);
    });
}

function renderFlavorInventory() {
    const data = getData();
    const flavorInventoryBody = document.getElementById("flavorInventoryBody");

    flavorInventoryBody.innerHTML = "";
    data.flavors.forEach((flavor) => {
        const isEditingQuantity = activeFlavorEditId === flavor.id;
        const isEditingDetails = activeFlavorDetailsEditId === flavor.id;
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>
        <input
          type="text"
          class="row-text-input"
          data-flavor-name="${flavor.id}"
          value="${flavor.name}"
          ${isEditingDetails ? "" : "disabled"}
        />
      </td>
      <td>
        <input
          type="text"
          class="row-text-input"
          data-flavor-description="${flavor.id}"
          value="${flavor.description}"
          ${isEditingDetails ? "" : "disabled"}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="10"
          class="row-quantity-input"
          data-flavor-input="${flavor.id}"
          value="${Number(flavor.quantity)}"
          ${isEditingQuantity ? "" : "disabled"}
        />
      </td>
      <td>${flavor.unit}</td>
      <td class="actions-cell">
        <button type="button" class="table-button" data-flavor-quantity-id="${flavor.id}">${isEditingQuantity ? "Zapisz ilość" : "Edytuj ilość"}</button>
        <button type="button" class="table-button table-button-secondary" data-flavor-details-id="${flavor.id}">${isEditingDetails ? "Zapisz dane" : "Edytuj nazwę i opis"}</button>
        <button type="button" class="table-button table-button-danger" data-flavor-delete-id="${flavor.id}">Usuń</button>
      </td>
    `;

        row.querySelector("[data-flavor-quantity-id]").addEventListener(
            "click",
            () => {
                handleFlavorQuantityEdit(flavor.id);
            },
        );

        row.querySelector("[data-flavor-details-id]").addEventListener(
            "click",
            () => {
                handleFlavorDetailsEdit(flavor.id);
            },
        );

        row.querySelector("[data-flavor-delete-id]").addEventListener(
            "click",
            () => {
                handleFlavorDelete(flavor.id);
            },
        );

        flavorInventoryBody.appendChild(row);
    });
}

function handleFlavorDelete(flavorId) {
    const data = getData();
    const flavor = data.flavors.find((item) => item.id === flavorId);

    if (!flavor) {
        showMagazynPopup("Błąd: smak nie istnieje.", true);
        return;
    }

    const updatedFlavors = data.flavors.filter((item) => item.id !== flavorId);

    setData({
        ...data,
        flavors: updatedFlavors,
    });

    if (activeFlavorEditId === flavorId) {
        activeFlavorEditId = null;
    }

    if (activeFlavorDetailsEditId === flavorId) {
        activeFlavorDetailsEditId = null;
    }

    showMagazynPopup(`Smak ${flavor.name} został usunięty.`);
    renderFlavorInventory();
}

function handleFlavorQuantityEdit(flavorId) {
    if (activeFlavorEditId !== flavorId) {
        activeFlavorEditId = flavorId;
        clearMagazynMessages();
        renderFlavorInventory();

        const input = document.querySelector(
            `[data-flavor-input="${flavorId}"]`,
        );
        if (input) {
            input.focus();
            input.select();
        }
        return;
    }

    const input = document.querySelector(`[data-flavor-input="${flavorId}"]`);
    const newQuantity = Number(input.value);

    if (!isValidFlavorQuantity(newQuantity)) {
        showMagazynPopup(
            "Błąd: ilość smaku musi być wielokrotnością 10.",
            true,
        );
        return;
    }

    const data = getData();
    const updatedFlavors = data.flavors.map((flavor) => {
        if (flavor.id !== flavorId) {
            return flavor;
        }

        return {
            ...flavor,
            quantity: newQuantity,
        };
    });

    setData({
        ...data,
        flavors: updatedFlavors,
    });

    activeFlavorEditId = null;
    showMagazynPopup("Ilość smaku została zapisana.");
    renderFlavorInventory();
}

function handleFlavorDetailsEdit(flavorId) {
    if (activeFlavorDetailsEditId !== flavorId) {
        activeFlavorDetailsEditId = flavorId;
        clearMagazynMessages();
        renderFlavorInventory();

        const nameInput = document.querySelector(
            `[data-flavor-name="${flavorId}"]`,
        );
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
        return;
    }

    const nameInput = document.querySelector(
        `[data-flavor-name="${flavorId}"]`,
    );
    const descriptionInput = document.querySelector(
        `[data-flavor-description="${flavorId}"]`,
    );
    const newName = nameInput.value.trim();
    const newDescription = descriptionInput.value.trim();

    if (!newName) {
        showMagazynPopup("Błąd: nazwa smaku nie może być pusta.", true);
        return;
    }

    const data = getData();
    const updatedFlavors = data.flavors.map((flavor) => {
        if (flavor.id !== flavorId) {
            return flavor;
        }

        return {
            ...flavor,
            name: newName,
            description: newDescription,
        };
    });

    setData({
        ...data,
        flavors: updatedFlavors,
    });

    activeFlavorDetailsEditId = null;
    showMagazynPopup("Nazwa i opis smaku zostały zapisane.");
    renderFlavorInventory();
}

function bindNewFlavorForm() {
    const form = document.getElementById("newFlavorForm");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const nameInput = document.getElementById("newFlavorName");
        const descriptionInput = document.getElementById(
            "newFlavorDescription",
        );
        const quantityInput = document.getElementById("newFlavorQuantity");
        const unitInput = document.getElementById("newFlavorUnit");

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const quantity = Number(quantityInput.value);
        const unit = "ml";

        if (!name) {
            showMagazynPopup("Błąd: nazwa smaku nie może być pusta.", true);
            return;
        }

        if (!description) {
            showMagazynPopup("Błąd: opis smaku nie może być pusty.", true);
            return;
        }

        if (!isValidFlavorQuantity(quantity)) {
            showMagazynPopup(
                "Błąd: ilość smaku musi być wielokrotnością 10.",
                true,
            );
            return;
        }

        const data = getData();
        const nextId =
            data.flavors.reduce(
                (maxId, flavor) => Math.max(maxId, Number(flavor.id) || 0),
                0,
            ) + 1;

        setData({
            ...data,
            flavors: [
                ...data.flavors,
                {
                    id: nextId,
                    name,
                    description,
                    quantity,
                    unit,
                },
            ],
        });

        form.reset();
        unitInput.value = "ml";
        showMagazynPopup(`Dodano smak ${name}.`);
        renderFlavorInventory();
    });
}

function bindSaveInventory() {
    const saveBtn = document.getElementById("saveInventoryBtn");

    saveBtn.addEventListener("click", () => {
        const data = getData();
        const inputs = document.querySelectorAll("input[data-id]");
        let isValid = true;

        const updatedInventory = data.inventory.map((item) => {
            const input = Array.from(inputs).find(
                (el) => el.dataset.id === item.id,
            );
            const value = Number(input.value);

            if (!Number.isFinite(value) || value < 0) {
                isValid = false;
            }

            return {
                ...item,
                quantity: value,
            };
        });

        if (!isValid) {
            showMagazynPopup("Błąd: ilość nie może być ujemna.", true);
            return;
        }

        setData({
            ...data,
            inventory: updatedInventory,
        });

        showMagazynPopup("Zapisano zmiany magazynowe.");
        renderInventoryEditor();
    });
}

async function initializeMagazynData() {
    try {
        const remoteData = await hydrateDataFromRemote();
        if (remoteData) {
            renderInventoryEditor();
            renderFlavorInventory();
        }
    } catch (error) {
        console.warn("LQME magazyn: nie udało się zainicjować danych", error);
    }
}

renderInventoryEditor();
bindSaveInventory();
renderFlavorInventory();
bindNewFlavorForm();
bindMagazynPopup();
initializeMagazynData();

window.addEventListener("lqme:data-updated", () => {
    renderInventoryEditor();
    renderFlavorInventory();
});

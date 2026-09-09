(function () {
    const THEME_KEY = "lqme_theme";

    function getSavedTheme() {
        return localStorage.getItem(THEME_KEY) || "light";
    }

    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.classList.add("dark-theme");
        } else {
            document.documentElement.classList.remove("dark-theme");
        }
        localStorage.setItem(THEME_KEY, theme);
        updateToggleButtons(theme);
    }

    function toggleTheme() {
        const currentTheme = getSavedTheme();
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(newTheme);
    }

    function updateToggleButtons(theme) {
        const buttons = document.querySelectorAll("[data-theme-toggle]");
        buttons.forEach((btn) => {
            if (theme === "dark") {
                btn.innerHTML =
                    '☀️ <span class="theme-btn-text">Jasny motyw</span>';
                btn.setAttribute("aria-label", "Przełącz na jasny motyw");
            } else {
                btn.innerHTML =
                    '🌙 <span class="theme-btn-text">Ciemny motyw</span>';
                btn.setAttribute("aria-label", "Przełącz na ciemny motyw");
            }
        });
    }

    function showReleaseNotes(userId = "guest") {
        const isAdminPage =
            document.querySelector(".page") &&
            !document.body.classList.contains("client-view");
        const releaseNotesKey = `lqme_release_notes_2026_09_09_${userId}`;

        if (!isAdminPage || localStorage.getItem(releaseNotesKey) === "closed") {
            return;
        }

        const modal = document.createElement("div");
        modal.className = "modal lqme-release-modal";
        modal.setAttribute("aria-hidden", "false");
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog release-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="releaseNotesTitle">
                <div class="modal-header">
                    <div>
                        <p class="page-eyebrow">Aktualizacja panelu</p>
                        <h3 id="releaseNotesTitle">Co zostało zmienione?</h3>
                    </div>
                    <button type="button" class="modal-close" aria-label="Zamknij">X</button>
                </div>
                <ul class="release-notes-list">
                    <li>Dodano kartę klientów z historią zakupów i szczegółami zamówień.</li>
                    <li>Historia sprzedaży obsługuje edycję klienta oraz wykres sprzedaży według zakresu dni.</li>
                    <li>Formularz sprzedaży podpowiada klientów zapisanych wcześniej w bazie.</li>
                    <li>Uproszczono tabele, menu boczne, responsywność i obsługę trybu jasnego oraz ciemnego.</li>
                    <li>Sklep otrzymał popup koszyka, edycję ilości produktów i możliwość ich usuwania.</li>
                </ul>
                <div class="release-notes-actions">
                    <button type="button" class="release-notes-close">Zamknij</button>
                </div>
            </div>
        `;

        const close = () => {
            localStorage.setItem(releaseNotesKey, "closed");
            modal.remove();
        };

        modal.querySelector(".modal-close").addEventListener("click", close);
        modal.querySelector(".release-notes-close").addEventListener("click", close);
        modal.querySelector(".modal-backdrop").addEventListener("click", close);
        document.body.appendChild(modal);
    }

    function bindMobileAdminMenu() {
        const page = document.querySelector(".page");
        const topbar = page?.querySelector(".topbar");
        const menu = topbar?.querySelector(".menu");

        if (!topbar || !menu || document.body.classList.contains("client-view")) {
            return;
        }

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "mobile-menu-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "panelMenu");
        toggle.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';
        menu.id = "panelMenu";
        topbar.insertBefore(toggle, menu);

        const closeMenu = () => {
            topbar.classList.remove("mobile-menu-open");
            toggle.setAttribute("aria-expanded", "false");
        };

        toggle.addEventListener("click", () => {
            const isOpen = topbar.classList.toggle("mobile-menu-open");
            toggle.setAttribute("aria-expanded", String(isOpen));
        });

        menu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeMenu);
        });
    }

    // Aplikuj zapisany motyw natychmiast, aby zapobiec miganiu
    applyTheme(getSavedTheme());

    document.addEventListener("DOMContentLoaded", () => {
        updateToggleButtons(getSavedTheme());
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            btn.addEventListener("click", toggleTheme);
        });
        bindMobileAdminMenu();
        const firebaseAuth =
            window.firebase && typeof window.firebase.auth === "function"
                ? window.firebase.auth()
                : null;

        if (firebaseAuth && typeof firebaseAuth.onAuthStateChanged === "function") {
            firebaseAuth.onAuthStateChanged((user) => {
                showReleaseNotes(user?.uid || "guest");
            });
        } else {
            showReleaseNotes();
        }
    });

    window.toggleLqmeTheme = toggleTheme;
})();

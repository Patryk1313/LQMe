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
                btn.innerHTML = '☀️ <span class="theme-btn-text">Jasny motyw</span>';
                btn.setAttribute("aria-label", "Przełącz na jasny motyw");
            } else {
                btn.innerHTML = '🌙 <span class="theme-btn-text">Ciemny motyw</span>';
                btn.setAttribute("aria-label", "Przełącz na ciemny motyw");
            }
        });
    }

    // Aplikuj zapisany motyw natychmiast, aby zapobiec miganiu
    applyTheme(getSavedTheme());

    document.addEventListener("DOMContentLoaded", () => {
        updateToggleButtons(getSavedTheme());
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            btn.addEventListener("click", toggleTheme);
        });
    });

    window.toggleLqmeTheme = toggleTheme;
})();

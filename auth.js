(function () {
    const AUTH_MODE_SIGN_IN = "sign-in";
    const AUTH_MODE_SIGN_UP = "sign-up";
    let currentMode = AUTH_MODE_SIGN_IN;
    let authInstance = null;

    function hasAuthenticatedUser(user) {
        return Boolean(user && !user.isAnonymous);
    }

    function getFirebaseAuth() {
        if (authInstance) {
            return authInstance;
        }

        if (window.lqmeFirebaseAuth) {
            authInstance = window.lqmeFirebaseAuth;
            return authInstance;
        }

        if (window.firebase && typeof window.firebase.auth === "function") {
            authInstance = window.firebase.auth();
            return authInstance;
        }

        return null;
    }

    async function ensureFirebaseAuth() {
        if (authInstance) {
            return authInstance;
        }

        if (
            window.firebaseSync &&
            typeof window.firebaseSync.initialize === "function"
        ) {
            await window.firebaseSync.initialize();
        }

        authInstance =
            window.lqmeFirebaseAuth ||
            (window.firebase && typeof window.firebase.auth === "function"
                ? window.firebase.auth()
                : null);

        return authInstance;
    }

    function setMessage(messageEl, text, isError) {
        if (!messageEl) {
            return;
        }

        messageEl.textContent = text;
        messageEl.classList.toggle("error", Boolean(isError));
        messageEl.classList.toggle("success", !isError && Boolean(text));
    }

    function getFriendlyAuthError(error) {
        const code = error?.code;

        if (code === "auth/admin-restricted-operation") {
            return "Logowanie e-mail/hasło jest zablokowane w tym projekcie Firebase. Włącz metodę Email/Password w Firebase Console > Authentication > Sign-in method.";
        }

        if (code === "auth/operation-not-allowed") {
            return "Ta metoda logowania nie jest aktywna w projekcie Firebase.";
        }

        if (code === "auth/invalid-email") {
            return "Wpisz poprawny adres e-mail.";
        }

        if (code === "auth/wrong-password") {
            return "Nieprawidłowe hasło.";
        }

        if (code === "auth/user-not-found") {
            return "Nie znaleziono użytkownika z tym adresem e-mail.";
        }

        if (code === "auth/email-already-in-use") {
            return "Ten adres e-mail jest już używany.";
        }

        return error?.message || "Błąd logowania.";
    }

    function getRedirectPath() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || "index.html";
        return decodeURIComponent(redirect);
    }

    function redirectToLogin() {
        const redirectPath = encodeURIComponent(
            window.location.pathname +
                window.location.search +
                window.location.hash,
        );

        window.location.replace(`login.html?redirect=${redirectPath}`);
    }

    function updateAuthLinks() {
        const links = document.querySelectorAll("[data-panel-auth-link]");
        const auth = getFirebaseAuth();
        const isAuthenticated = hasAuthenticatedUser(auth?.currentUser);

        links.forEach((link) => {
            link.textContent = isAuthenticated ? "Wyloguj" : "Logowanie";
            link.href = isAuthenticated ? "login.html?logout=1" : "login.html";
            link.onclick = (event) => {
                if (!isAuthenticated) {
                    return;
                }

                event.preventDefault();
                window.LQMEAuth.logout();
            };
        });
    }

    async function handleLogout() {
        const auth = await ensureFirebaseAuth();
        if (auth) {
            await auth.signOut();
        }
        window.location.replace("login.html?logout=1");
    }

    function setAuthMode(
        mode,
        form,
        titleEl,
        subtitleEl,
        submitBtn,
        toggleBtn,
    ) {
        currentMode = mode;

        if (titleEl) {
            titleEl.textContent =
                mode === AUTH_MODE_SIGN_UP ? "Utwórz konto" : "Logowanie";
        }

        if (subtitleEl) {
            subtitleEl.textContent =
                mode === AUTH_MODE_SIGN_UP
                    ? "Utwórz konto Firebase, aby uzyskać dostęp do panelu."
                    : "Zaloguj się, aby wejść do panelu. Sklep jest dostępny dla wszystkich.";
        }

        if (submitBtn) {
            submitBtn.textContent =
                mode === AUTH_MODE_SIGN_UP ? "Utwórz konto" : "Zaloguj się";
        }

        if (toggleBtn) {
            toggleBtn.textContent =
                mode === AUTH_MODE_SIGN_UP ? "Mam już konto" : "Utwórz konto";
        }

        if (form) {
            form.dataset.mode = mode;
        }
    }

    async function attachLoginForm() {
        const form = document.getElementById("loginForm");
        const messageEl = document.getElementById("loginMessage");
        const titleEl = document.getElementById("authTitle");
        const subtitleEl = document.getElementById("authSubtitle");
        const submitBtn = document.getElementById("authSubmitBtn");
        const toggleBtn = document.getElementById("authModeToggle");

        if (!form || !messageEl) {
            return;
        }

        const redirectPath = getRedirectPath();
        const auth = await ensureFirebaseAuth();

        if (!auth) {
            setMessage(messageEl, "Firebase Auth nie jest dostępne.", true);
            return;
        }

        auth.onAuthStateChanged((user) => {
            if (hasAuthenticatedUser(user)) {
                window.location.replace(redirectPath);
            }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get("logout") === "1") {
            setMessage(messageEl, "Wylogowano z panelu.", false);
        }

        setAuthMode(
            currentMode,
            form,
            titleEl,
            subtitleEl,
            submitBtn,
            toggleBtn,
        );

        toggleBtn?.addEventListener("click", () => {
            const nextMode =
                currentMode === AUTH_MODE_SIGN_IN
                    ? AUTH_MODE_SIGN_UP
                    : AUTH_MODE_SIGN_IN;
            setAuthMode(
                nextMode,
                form,
                titleEl,
                subtitleEl,
                submitBtn,
                toggleBtn,
            );
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email =
                document.getElementById("loginEmail")?.value?.trim() || "";
            const password =
                document.getElementById("loginPassword")?.value || "";
            const passwordInput = document.getElementById("loginPassword");

            if (!email || !password) {
                setMessage(messageEl, "Wpisz adres e-mail i hasło.", true);
                return;
            }

            try {
                if (currentMode === AUTH_MODE_SIGN_UP) {
                    await auth.createUserWithEmailAndPassword(email, password);
                    setMessage(
                        messageEl,
                        "Konto utworzono. Trwa przekierowanie...",
                        false,
                    );
                } else {
                    await auth.signInWithEmailAndPassword(email, password);
                    setMessage(
                        messageEl,
                        "Logowanie przebiegło pomyślnie.",
                        false,
                    );
                }

                if (passwordInput) {
                    passwordInput.value = "";
                }

                window.location.replace(redirectPath);
            } catch (error) {
                setMessage(messageEl, getFriendlyAuthError(error), true);
            }
        });
    }

    async function enforcePanelAccess() {
        if (window.location.pathname.includes("login.html")) {
            return;
        }

        const auth = await ensureFirebaseAuth();
        if (!auth) {
            redirectToLogin();
            return;
        }

        const currentUser = auth.currentUser;
        if (hasAuthenticatedUser(currentUser)) {
            updateAuthLinks();
            return;
        }

        auth.onAuthStateChanged((user) => {
            if (hasAuthenticatedUser(user)) {
                updateAuthLinks();
            } else {
                redirectToLogin();
            }
        });
    }

    window.LQMEAuth = {
        isLoggedIn: async () => {
            const auth = await ensureFirebaseAuth();
            const user = auth?.currentUser;
            return hasAuthenticatedUser(user);
        },
        login: async (email, password) => {
            const auth = await ensureFirebaseAuth();
            if (!auth) {
                return false;
            }

            try {
                await auth.signInWithEmailAndPassword(email, password);
                return true;
            } catch (error) {
                console.warn("LQME auth: nie udało się zalogować", error);
                return false;
            }
        },
        logout: handleLogout,
    };

    document.addEventListener("DOMContentLoaded", async () => {
        if (document.getElementById("loginForm")) {
            await attachLoginForm();
            return;
        }

        await enforcePanelAccess();
    });
})();

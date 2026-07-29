(function () {
    const COLLECTION_NAME = "lqme";
    const DOC_NAME = "workspace";
    const STORAGE_KEY = "lq_admin_data_v1";

    const defaultConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
    };

    const config = window.LQME_FIREBASE_CONFIG || defaultConfig;
    const isConfigured = Boolean(
        config &&
        config.projectId &&
        config.projectId !== "YOUR_PROJECT_ID" &&
        config.apiKey &&
        config.apiKey !== "YOUR_API_KEY",
    );

    let syncState = {
        isConfigured,
        isReady: false,
        lastError: null,
    };

    let firebaseApp = null;
    let firestore = null;
    let auth = null;
    let documentRef = null;
    let unsubscribe = null;
    let initPromise = null;

    function updateUiStatus() {
        const statusEl = document.getElementById("firebaseStatus");
        if (!statusEl) {
            return;
        }

        const currentState = window.lqmeSyncStatus || {};

        statusEl.classList.remove("connected", "error");

        if (currentState.isReady) {
            statusEl.classList.add("connected");
            statusEl.textContent = "Połączono z bazą danych";
            return;
        }

        if (currentState.lastError) {
            statusEl.classList.add("error");
            statusEl.textContent = `Firebase: ${currentState.lastError}`;
            return;
        }

        statusEl.textContent = "Sprawdzam połączenie z bazą...";
    }

    function setSyncState(patch) {
        syncState = { ...syncState, ...patch };
        window.lqmeSyncStatus = syncState;
        updateUiStatus();
        window.dispatchEvent(
            new CustomEvent("lqme:sync-status-updated", {
                detail: syncState,
            }),
        );
    }

    function dispatchDataUpdate(data) {
        if (!data) {
            return;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn(
                "LQME sync: nie udało się zapisać do localStorage",
                error,
            );
        }

        window.dispatchEvent(
            new CustomEvent("lqme:data-updated", {
                detail: data,
            }),
        );

        try {
            window.localStorage.setItem(
                "lqme:last-sync",
                JSON.stringify({
                    data,
                    timestamp: Date.now(),
                }),
            );
        } catch (error) {
            console.warn(
                "LQME sync: nie udało się zaktualizować broadcastu",
                error,
            );
        }
    }

    function extractPayload(documentData) {
        if (!documentData) {
            return null;
        }

        if (documentData.payload && typeof documentData.payload === "object") {
            return documentData.payload;
        }

        return documentData;
    }

    async function initializeFirebase() {
        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
            if (!isConfigured) {
                setSyncState({
                    isConfigured: false,
                    isReady: false,
                    lastError:
                        "Brak konfiguracji Firebase. Uzupełnij LQME_FIREBASE_CONFIG.",
                });
                return null;
            }

            if (!window.firebase || !window.firebase.apps) {
                setSyncState({
                    isConfigured: true,
                    isReady: false,
                    lastError: "Firebase SDK nie zostało załadowane.",
                });
                return null;
            }

            try {
                firebaseApp = window.firebase.apps.length
                    ? window.firebase.apps[0]
                    : window.firebase.initializeApp(config);

                auth = window.firebase.auth(firebaseApp);
                window.lqmeFirebaseAuth = auth;
                firestore = window.firebase.firestore(firebaseApp);
                documentRef = firestore
                    .collection(COLLECTION_NAME)
                    .doc(DOC_NAME);

                const remoteSnapshot = await documentRef.get();
                const remoteData = extractPayload(remoteSnapshot.data());
                if (remoteData) {
                    dispatchDataUpdate(remoteData);
                }

                unsubscribe = documentRef.onSnapshot((snapshot) => {
                    const nextData = extractPayload(snapshot.data());
                    if (nextData) {
                        dispatchDataUpdate(nextData);
                    }
                });

                setSyncState({
                    isConfigured: true,
                    isReady: true,
                    lastError: null,
                });

                return {
                    auth,
                    firestore,
                    app: firebaseApp,
                    writeData: async (payload) => {
                        if (!documentRef) {
                            return null;
                        }

                        await documentRef.set(
                            {
                                payload,
                                updatedAt: new Date().toISOString(),
                            },
                            { merge: true },
                        );

                        return payload;
                    },
                    loadRemoteData: async () => {
                        const snapshot = await documentRef.get();
                        return extractPayload(snapshot.data());
                    },
                };
            } catch (error) {
                console.warn(
                    "LQME sync: nie udało się zainicjować Firebase",
                    error,
                );
                setSyncState({
                    isConfigured: true,
                    isReady: false,
                    lastError: error.message || "Błąd inicjalizacji Firebase.",
                });
                return null;
            }
        })();

        return initPromise;
    }

    async function writeData(payload) {
        const sync = await initializeFirebase();
        if (!sync || !sync.writeData) {
            return payload;
        }

        try {
            return await sync.writeData(payload);
        } catch (error) {
            console.warn(
                "LQME sync: zapis do Firestore nie powiódł się",
                error,
            );
            return payload;
        }
    }

    window.firebaseSync = {
        initialize: initializeFirebase,
        writeData,
        getAuth: () => auth,
        loadRemoteData: async () => {
            const sync = await initializeFirebase();
            if (!sync || !sync.loadRemoteData) {
                return null;
            }

            try {
                return await sync.loadRemoteData();
            } catch (error) {
                console.warn(
                    "LQME sync: odczyt z Firestore nie powiódł się",
                    error,
                );
                return null;
            }
        },
    };

    window.lqmeSyncStatus = syncState;

    window.addEventListener("storage", (event) => {
        if (event.key === "lqme:last-sync" && event.newValue) {
            try {
                const parsed = JSON.parse(event.newValue);
                if (parsed && parsed.data) {
                    window.dispatchEvent(
                        new CustomEvent("lqme:data-updated", {
                            detail: parsed.data,
                        }),
                    );
                }
            } catch (error) {
                console.warn(
                    "LQME sync: nie udało się odczytać broadcastu",
                    error,
                );
            }
        }
    });

    window.addEventListener("DOMContentLoaded", () => {
        initializeFirebase().catch(() => {});
    });
})();

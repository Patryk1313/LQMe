import { Firestore, Timestamp } from "@google-cloud/firestore";

// Inicjalizacja Firestore (upewnij się, że masz ustawione zmienne środowiskowe lub klucz konta usługowego)
const firestore = new Firestore({
    projectId: "lqme-cd75b",
});

async function przywrocDane() {
    // Określamy dokładny punkt w czasie (10 minut temu)
    const dziesiecMinutTemu = new Date(Date.now() - 10 * 60 * 1000);

    console.log(
        `Odczytywanie danych z momentu: ${dziesiecMinutTemu.toISOString()}`,
    );

    try {
        // Wykonujemy transakcję tylko do odczytu z określonym historycznym punktem czasowym
        const stareDokumenty = await firestore.runTransaction(
            async (transaction) => {
                const kolekcjaRef = firestore.collection(
                    "NAZWA_TWOJEJ_KOLEKCJI",
                );
                return transaction.get(kolekcjaRef);
            },
            {
                readOnly: true,
                readTime: Timestamp.fromDate(dziesiecMinutTemu),
            },
        );

        // Zapisujemy odzyskane dokumenty z powrotem do aktywnej bazy danych
        for (const doc of stareDokumenty.docs) {
            const dane = doc.data();
            await firestore
                .collection("NAZWA_TWOJEJ_KOLEKCJI")
                .doc(doc.id)
                .set(dane);
            console.log(`Przywrócono dokument: ${doc.id}`);
        }

        console.log("Pomyślnie przywrócono stan bazy sprzed 10 minut!");
    } catch (error) {
        console.error("Błąd podczas odzyskiwania danych:", error);
    }
}

przywrocDane();

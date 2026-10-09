import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    initializeAuth,
    browserSessionPersistence,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCJzSqxLm5XyNq4uTg9LwqKStgn37Vrns0",
  authDomain: "fabula-inlinea.firebaseapp.com",
  projectId: "fabula-inlinea",
  storageBucket: "fabula-inlinea.firebasestorage.app",
  messagingSenderId: "894995545457",
  appId: "1:894995545457:web:2b6824bf7dab6840e68ad0"
};

export const app = initializeApp(firebaseConfig);
// Anmeldung gilt nur für diesen Browser-Tab (nicht für alle Tabs/Fenster).
// So kannst du in zwei Tabs gleichzeitig als GM und als Player testen.
// Nachteil: Nach dem Schließen des Tabs muss man sich neu anmelden.
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });
export const db = getFirestore(app);

// Jede Person hat ein Konto "<name>@fabula.local". Das Suffix ist nur ein
// Platzhalter, damit Firebase eine E-Mail-Adresse hat. Es wird nie eine Mail verschickt.
export const EMAIL_DOMAIN = "@fabula.local";
export const GM_ID = "gm";

// Wird erst erfüllt, wenn jemand angemeldet ist.
// gameState.js wartet darauf, bevor es Daten liest oder schreibt.
let resolveAuth;
export const authReady = new Promise((resolve) => { resolveAuth = resolve; });

// Ruft callback(user) bei Anmeldung und callback(null) bei Abmeldung auf
export function onUser(callback) {
    onAuthStateChanged(auth, (user) => {
        // Alte anonyme Sitzungen aus früheren Tests abmelden
        if (user && !user.email) {
            signOut(auth);
            return;
        }
        if (user) resolveAuth(user);
        callback(user);
    });
}

export function login(id, password) {
    return signInWithEmailAndPassword(auth, `${id}${EMAIL_DOMAIN}`, password);
}

export function logout() {
    return signOut(auth);
}

// "anna@fabula.local" -> "anna"
export function idFromUser(user) {
    return user.email.replace(EMAIL_DOMAIN, "");
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDMql-4w16ikUP-5E15n1m0L-dJLEiO9yA",
  authDomain:        "coachhub-218d3.firebaseapp.com",
  projectId:         "coachhub-218d3",
  storageBucket:     "coachhub-218d3.firebasestorage.app",
  messagingSenderId: "735505757755",
  appId:             "1:735505757755:web:b4726571d35e928cd28e1e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

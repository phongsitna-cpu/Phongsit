import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { API_BASE_URL } from "./config";

const firebaseConfig = {
  apiKey: "AIzaSyA_hjDNN9JljIvJLmtj_OT8oYf90oACSWs",
  authDomain: "ai-manga-diary.firebaseapp.com",
  projectId: "ai-manga-diary",
  storageBucket: "ai-manga-diary.firebasestorage.app",
  messagingSenderId: "935042661922",
  appId: "1:935042661922:web:af735f4c83321b9f4d947b",
  measurementId: "G-ZF9KEF6328"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ทุกครั้งที่สถานะล็อกอินเปลี่ยน (login, register, หรือเปิดแอปแล้วมี session ค้างอยู่)
// ให้ sync ผู้ใช้เข้า MySQL backend (get-or-create) เพื่อผูก firebase_uid <-> user_id
// ไว้ที่เดียวตรงนี้ เพื่อไม่ต้องเรียกซ้ำในทุกหน้าที่ login ได้ (Login.jsx, LoginNew.jsx)
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const username = userDoc.exists() ? userDoc.data().username : (user.email || "ผู้ใช้");

    await fetch(`${API_BASE_URL}/api/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebase_uid: user.uid, username }),
    });
  } catch (error) {
    console.error("ซิงก์ผู้ใช้กับ backend ไม่สำเร็จ:", error);
  }
});
// Đồng bộ Firestore. Chạy dạng module; nếu tải lỗi (mất mạng), trang vẫn chạy bằng dữ liệu trên máy.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBz3n9nhStnBvTSKn_WVxVuZU1XTw2I1-g",
  authDomain: "trac-nghiem-1a00f.firebaseapp.com",
  projectId: "trac-nghiem-1a00f",
  storageBucket: "trac-nghiem-1a00f.firebasestorage.app",
  messagingSenderId: "1098562780198",
  appId: "1:1098562780198:web:85eb7d522d5b305006fae7"
};

const db = getFirestore(initializeApp(firebaseConfig));

const code = () => window.getCode();
window.Cloud = {
  ok: true,
  push: (d) => setDoc(doc(db, "rooms", code(), "projects", d.id), d),
  pullAll: async () => (await getDocs(collection(db, "rooms", code(), "projects"))).docs.map((x) => x.data()),
  pushH: (d) => setDoc(doc(db, "rooms", code(), "history", d.id), d),
  publish: async (m, qs) => { await setDoc(doc(db, "libq", m.id), { id: m.id, qs }); await setDoc(doc(db, "library", m.id), m); },
  listLib: async () => (await getDocs(query(collection(db, "library"), orderBy("t", "desc"), limit(100)))).docs.map((x) => x.data()),
  getLib: async (id) => { const s = await getDoc(doc(db, "libq", id)); return s.exists() ? s.data() : null; },
  ping: async () => { const r = doc(db, "rooms", code(), "ping", "last"); await setDoc(r, { t: Date.now() }); await getDoc(r); },
  pullH: async () => (await getDocs(collection(db, "rooms", code(), "history"))).docs.map((x) => x.data())
};
window.cloudSync();

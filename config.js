const API_URL = "https://script.google.com/macros/s/AKfycbwkWA4FHpHs3ZW0Ey7lyOLZzLfEhbw_J2xVkYsfxCmYyIM5H1aOOru2Cpn1f6qvQSQP7w/exec";

// Gemini API KEY
const GEMINI_KEY = "AIzaSyCvpahgRPmGUTEEgQtDIE-FmWScGBwGvGk";

async function apiGet(params) {
  const url = `${API_URL}?${new URLSearchParams(params)}`;
  const r = await fetch(url);
  return r.json();
}

async function apiPost(action, data) {
  const url = `${API_URL}?action=${action}`;
  const r = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return r.json();
}

function getSession() {
  const x = localStorage.getItem("pegawai");
  if (!x) return null;
  return JSON.parse(x);
}

function requireLogin() {
  const p = getSession();
  if (!p) window.location.href = "login.html";
  return p;
}

function logout() {
  localStorage.removeItem("pegawai");
  window.location.href = "login.html";
}

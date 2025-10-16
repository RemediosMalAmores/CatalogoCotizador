const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT55h9WDz9aZWLp6YX5lcDDOjLjg82b5MqnwDn8GQJlFeyCOiDdsXWmTYvm170MbA/pub?gid=348620354&single=true&output=csv";

async function getProducts() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows.shift().map(h => h.trim().toLowerCase());

  const data = rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || "").trim());
    if (obj.visible && (obj.visible.toLowerCase() === "true" || obj.visible === "✅")) {
      obj.presentaciones = (obj.presentaciones || "").split(" ").filter(Boolean);
      obj.clase = (obj.clase || "").toLowerCase();
      return obj;
    }
  }).filter(Boolean);
  return data;
}

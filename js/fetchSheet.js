const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT55h9WDz9aZWLp6YX5lcDDOjLjg82b5MqnwDn8GQJlFeyCOiDdsXWmTYvm170MbA/pub?gid=1739731162&single=true&output=csv";

/* === Parser CSV === */
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c !== "\r") cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/* === Lector principal === */
async function getProducts() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows.shift().map((h) => (h || "").trim().toLowerCase());

  const idx = {
    clase: headers.indexOf("clase"),
    desc: headers.indexOf("descripcion"),
    img: headers.indexOf("imagenes"),
    check: headers.indexOf("check")
  };

  const codeCols = [], stockCols = [];
  headers.forEach((h, i) => {
    if (/^(codigo_)?c\d+$/.test(h)) codeCols.push(i);
    if (h.includes("existencias")) stockCols.push(i);
  });

  const raw = rows.map((r) => {
    const visible = (r[idx.check] || "").toLowerCase();
    if (!(visible.includes("true") || visible.includes("✅") || visible === "1" || visible === "x")) return null;

    const clase = (r[idx.clase] || "").trim().toLowerCase();
    const desc = (r[idx.desc] || "").trim();
    const imagen_name = (r[idx.img] || "").trim();

    const nombre = desc
      .replace(/[0-9]+\/[0-9]+ml.*$/i, "")
      .replace(/[0-9]+ml.*$/i, "")
      .replace(/[0-9]+%.*$/i, "")
      .replace(/botella/i, "")
      .trim();

    const presMatch = desc.match(/([0-9]+ ?m?l|[0-9]+ ?l)/i);
    const presentacion = presMatch ? presMatch[1].replace(/\s+/g, "").toLowerCase() : "";

    // Selección correcta de código por existencias
    let maxStock = -1, bestCode = "";
    for (let i = 0; i < codeCols.length && i < stockCols.length; i++) {
      const code = (r[codeCols[i]] || "").trim();
      const stock = parseInt((r[stockCols[i]] || "").trim());
      if (!code) continue;
      const val = isNaN(stock) ? 0 : stock;
      if (val > maxStock) { maxStock = val; bestCode = code; }
    }
    if (!bestCode) {
      for (let i = 0; i < codeCols.length; i++) {
        const code = (r[codeCols[i]] || "").trim();
        if (code) { bestCode = code; break; }
      }
    }

    return { clase, nombre, imagen_name, presentacion, codigo: bestCode, stock: maxStock };
  }).filter(Boolean);

  const map = new Map();
  for (const p of raw) {
    const key = `${p.nombre.toLowerCase()}_${p.imagen_name}`;
    if (!map.has(key)) {
      map.set(key, { clase: p.clase, nombre: p.nombre, imagen_name: p.imagen_name, presentaciones: [] });
    }
    const prod = map.get(key);
    if (!prod.presentaciones.find(x => x.presentacion === p.presentacion)) {
      prod.presentaciones.push({ presentacion: p.presentacion, codigo: p.codigo, stock: p.stock });
    }
  }

  return Array.from(map.values());
}


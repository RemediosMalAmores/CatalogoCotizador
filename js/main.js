let DATA = [];
let carrito = [];
let seleccion = {};
let filtro = "all";
const EXT = [".webp", ".jpg", ".jpeg", ".png"];
const WHATSAPP = "529984662008";

/* === CARGA INICIAL === */
getProducts().then(products => {
  DATA = products;
  renderChips();
  renderGrid();
  paint();
});

/* === LIMPIAR TEXTO PARA PID === */
function normalizeId(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/* === CHIPS === */
function renderChips() {
  const clases = Array.from(new Set(DATA.map(p => p.clase))).sort();
  const chips = document.getElementById("chips");
  chips.innerHTML = `<button class="chip active" data-clase="all">Todas</button>` +
    clases.map(c => `<button class="chip" data-clase="${c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join("");

  chips.onclick = e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll(".chip").forEach(ch => ch.classList.remove("active"));
    btn.classList.add("active");
    filtro = btn.dataset.clase;
    renderGrid();
  };
}

/* === IMÁGENES CON FALLBACK === */
function imgWithFallback(clase, name) {
  const base = `imagenes-producto/${clase}/${name}`;
  return `<img src="${base}${EXT[0]}" onerror="tryNextExt(this,'${base}',1)">`;
}
function tryNextExt(img, base, i) {
  if (i >= EXT.length) { img.onerror = null; img.src = ""; return; }
  img.onerror = () => tryNextExt(img, base, i + 1);
  img.src = base + EXT[i];
}

/* === GRID === */
function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  const productos = DATA.filter(p => filtro === "all" || p.clase === filtro);

  productos.forEach(p => {
    const pid = normalizeId(`${p.clase}-${p.imagen_name}-${p.nombre}`);

    const presBtns = p.presentaciones.map((pr, i) =>
      `<button class="pres-btn ${i === 0 ? "active" : ""}" data-role="sel" data-pid="${pid}" data-pres="${pr.presentacion}" data-code="${pr.codigo}">${pr.presentacion}</button>`
    ).join("");

    seleccion[pid] = { presentacion: p.presentaciones[0].presentacion, codigo: p.presentaciones[0].codigo };

    grid.insertAdjacentHTML("beforeend", `
      <div class="card" data-pid="${pid}">
        <div class="card-img">${imgWithFallback(p.clase, p.imagen_name)}</div>
        <h3>${p.nombre}</h3>
        <div class="presentaciones">${presBtns}</div>
        <div class="cantidad">
          <button data-role="dec" data-pid="${pid}">-</button>
          <input id="cant-${pid}" type="number" value="1" min="1" max="999">
          <button data-role="inc" data-pid="${pid}">+</button>
        </div>
        <button class="agregar" data-role="add" data-pid="${pid}">Agregar</button>
      </div>
    `);
  });

  grid.onclick = onGridClick;
}

/* === EVENTOS === */
function onGridClick(e) {
  const el = e.target.closest("[data-role]");
  if (!el) return;
  const role = el.dataset.role;
  const pid = el.dataset.pid;
  const product = DATA.find(p => normalizeId(`${p.clase}-${p.imagen_name}-${p.nombre}`) === pid);
  if (!product) return;

  if (role === "sel") {
    el.parentElement.querySelectorAll(".pres-btn").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    seleccion[pid] = { presentacion: el.dataset.pres, codigo: el.dataset.code };
    return;
  }

  const input = document.getElementById(`cant-${pid}`);
  let v = parseInt(input.value) || 1;

  if (role === "dec") input.value = Math.max(1, v - 1);
  if (role === "inc") input.value = Math.min(999, v + 1);
  if (role === "add") addProduct(product, Math.max(1, v), pid);
}

/* === CARRITO === */
function addProduct(product, cantidad, pid) {
  const sel = seleccion[pid];
  if (!sel) return alert("Selecciona una presentación");

  const existing = carrito.find(i => i.codigo === sel.codigo && i.presentacion === sel.presentacion && i.nombre === product.nombre);
  if (existing) existing.cantidad += cantidad;
  else carrito.push({ codigo: sel.codigo, nombre: product.nombre, presentacion: sel.presentacion, cantidad });

  paint();
}

function removeItem(index) {
  carrito.splice(index, 1);
  paint();
}

function vaciar() {
  carrito = [];
  paint();
}

/* === RENDERIZAR CARRITO (sin imágenes) === */
function paint() {
  const box = document.getElementById("carrito");
  if (!carrito.length) {
    box.innerHTML = "<p class='vacio'>Vacío</p>";
    return;
  }

  box.innerHTML = carrito.map((i, idx) => `
    <div class="item-carrito sin-img">
      <div class="info">
        <div class="nombre">${i.nombre}</div>
        <div class="desc">Presentación: <b>${i.presentacion.toUpperCase()}</b></div>
        <div class="cant">Cantidad: <b>${i.cantidad}</b></div>
      </div>
      <button class="borrar" onclick="removeItem(${idx})" title="Eliminar">✖</button>
    </div>
  `).join("");
}

/* === WHATSAPP Y COPIA EXCEL + CLIENTE === */
function wa() {
  if (!carrito.length) return alert("Carrito vacío");

  const clienteDesktop = document.getElementById("cliente");
  const clienteMobile = document.getElementById("cliente-mob");

  const cliente = (clienteDesktop?.value || clienteMobile?.value || "").trim();

  if (!cliente) {
    if (!confirm("No escribiste el nombre del cliente. ¿Deseas continuar sin él?")) return;
  }

  let msg = "";

  if (cliente) msg += `Cliente: ${cliente}\n\n`;

  carrito.forEach(i => msg += `${i.codigo}\t${i.cantidad}\n`);
  msg += "\n";
  carrito.forEach((i, idx) => msg += `${idx + 1}. ${i.nombre} ${i.presentacion.toUpperCase()} (${i.cantidad} UDS)*\n`);

  navigator.clipboard.writeText(msg.replace(/\n/g, "\r\n")).then(() => {
    console.log("Mensaje copiado al portapapeles listo para Excel");
  });

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/${WHATSAPP}?text=${encoded}`, "_blank");
}

/* === SINCRONIZAR NOMBRE CLIENTE ENTRE VERSIONES === */
document.addEventListener("input", e => {
  if (e.target.id === "cliente" && document.getElementById("cliente-mob")) {
    document.getElementById("cliente-mob").value = e.target.value;
  } else if (e.target.id === "cliente-mob" && document.getElementById("cliente")) {
    document.getElementById("cliente").value = e.target.value;
  }
});

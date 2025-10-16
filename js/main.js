let DATA = [];
let carrito = [];
let seleccion = {};
let filtro = "all";
const EXT = [".webp", ".jpg", ".jpeg", ".png"];
const WHATSAPP = "529984662008";

// 🚀 Carga inicial de productos
getProducts().then(products => {
  DATA = products;
  renderChips();
  renderGrid();
});

// === Renderizado de categorías (chips) ===
function renderChips() {
  const clases = Array.from(new Set(DATA.map(p => p.clase))).sort();
  const chips = document.getElementById("chips");
  chips.innerHTML = `<button class="chip active" data-clase="all">Todas</button>` +
    clases.map(c => {
      const label = c.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      return `<button class="chip" data-clase="${c}">${label}</button>`;
    }).join("");

  chips.addEventListener("click", (e) => {
    if (e.target.classList.contains("chip")) {
      document.querySelectorAll(".chip").forEach(ch => ch.classList.remove("active"));
      e.target.classList.add("active");
      filtro = e.target.dataset.clase;
      renderGrid();
    }
  });
}

// === Renderizado de imagen con fallback ===
function imgWithFallback(clase, nombreImg) {
  const base = `imagenes-producto/${clase}/${nombreImg}`;
  return `<img src="${base}${EXT[0]}" alt="${nombreImg}" onerror="tryNextExt(this,'${base}',1)">`;
}

function tryNextExt(imgEl, base, idx) {
  if (idx >= EXT.length) {
    imgEl.onerror = null;
    imgEl.src = "";
    return;
  }
  imgEl.onerror = function () {
    tryNextExt(imgEl, base, idx + 1);
  };
  imgEl.src = base + EXT[idx];
}

// === Renderizado del grid ===
function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  (DATA || [])
    .filter(p => filtro === "all" || p.clase === filtro)
    .forEach(p => {
      // Ordenar presentaciones (más pequeñas primero)
      let sorted = [...p.presentaciones];
      sorted.sort((a, b) => parseInt(a) - parseInt(b));
      const presBtns = sorted
        .map((pr, i) =>
          `<button class="pres-btn ${i === 0 ? "active" : ""}" onclick="sel('${p.nombre}','${pr}',this)">${pr}</button>`
        )
        .join("");

      // Preseleccionar automáticamente la presentación más baja
      seleccion[p.nombre] = sorted[0] || "";

      grid.innerHTML += `
        <div class="card" data-clase="${p.clase}">
          <div class="card-img">${imgWithFallback(p.clase, p.imagen_name)}</div>
          <h3>${p.nombre}</h3>
          <div class="presentaciones">${presBtns}</div>
          <div class="cantidad">
            <button onclick="chg('${p.nombre}',-1)">-</button>
            <input id="cant-${p.nombre}" type="number" value="1" min="1" max="999" />
            <button onclick="chg('${p.nombre}',1)">+</button>
          </div>
          <button class="agregar" onclick="add('${p.nombre}')">Agregar</button>
        </div>`;
    });
}

// === Selección de presentación ===
function sel(nombre, presentacion, btn) {
  seleccion[nombre] = presentacion;
  btn.parentElement.querySelectorAll(".pres-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// === Cambio de cantidad ===
function chg(nombre, delta) {
  const el = document.getElementById("cant-" + nombre);
  let v = parseInt(el.value) || 1;
  v = Math.max(1, v + delta);
  el.value = v;
}

// === Agregar producto al carrito ===
function add(nombre) {
  if (!seleccion[nombre]) {
    alert("Selecciona una presentación");
    return;
  }
  const cant = parseInt(document.getElementById("cant-" + nombre).value) || 1;
  const ex = carrito.find(i => i.nombre === nombre && i.presentacion === seleccion[nombre]);
  if (ex) ex.cantidad += cant;
  else carrito.push({ nombre, presentacion: seleccion[nombre], cantidad: cant });
  paint();
}

// === Vaciar carrito ===
function vaciar() {
  carrito = [];
  paint();
}

// === Enviar por WhatsApp ===
function wa() {
  if (carrito.length === 0) {
    alert("Carrito vacío");
    return;
  }
  let msg = "Cotización:%0A";
  carrito.forEach(i => {
    msg += `${i.cantidad} x ${i.nombre} (${i.presentacion})%0A`;
  });
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, "_blank");
}

// === Renderizado del carrito (web + móvil) ===
function paint() {
  const box = document.getElementById("carrito");
  const mobileBox = document.getElementById("mobileCarrito");

  if (carrito.length === 0) {
    box.innerHTML = "<p>Vacío</p>";
    mobileBox.innerHTML = "<p>Vacío</p>";
    updateCartBadge(0);
    return;
  }

  const html = carrito
    .map(
      i =>
        `<div class="item">${i.cantidad}x - ${i.nombre} (${i.presentacion})</div>`
    )
    .join("");

  box.innerHTML = html;
  mobileBox.innerHTML = html;
  updateCartBadge(carrito.length);
}

// === Actualiza el contador en el botón del carrito flotante ===
function updateCartBadge(count) {
  let badge = document.querySelector(".cart-badge");
  if (!badge) {
    const btn = document.getElementById("cartBtn");
    badge = document.createElement("div");
    badge.className = "cart-badge";
    btn.appendChild(badge);
  }
  badge.textContent = count > 99 ? "99+" : count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// === Inicializar contador en 0 ===
updateCartBadge(0);

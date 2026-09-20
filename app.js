const K = 'enruta04';

let db = JSON.parse(localStorage.getItem(K) || 'null') || {
  vehicles: [
    {
      id: 'v1',
      name: 'Autocaravana',
      type: 'diesel',
      cons: 10
    }
  ],
  fuel: [],
  trips: [],
  maint: []
};

let page = 'home';

const $ = selector => document.querySelector(selector);

function save() {
  localStorage.setItem(K, JSON.stringify(db));
}

function uid() {
  return crypto.randomUUID?.() || Date.now() + Math.random();
}

function eur(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value) || 0);
}

function vehicle(id) {
  return db.vehicles.find(v => v.id === id);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function closeModal() {
  const modal = document.querySelector('.enruta-modal');

  if (modal) {
    modal.remove();
  }

  document.body.style.overflow = '';
}

function toast(message) {
  const x = $('#toast');

  if (!x) return;

  x.textContent = message;

  x.style.cssText =
    'position:fixed;' +
    'bottom:85px;' +
    'left:50%;' +
    'transform:translateX(-50%);' +
    'background:#101828;' +
    'color:white;' +
    'padding:10px 14px;' +
    'border-radius:10px;' +
    'z-index:3000;';

  setTimeout(() => {
    x.style.cssText = '';
  }, 2200);
}


/* =========================
   MIGRACIÓN DE DATOS
   ========================= */

function migrateData() {
  if (!db || typeof db !== 'object') {
    db = {
      vehicles: [],
      fuel: [],
      trips: [],
      maint: []
    };
  }

  if (!Array.isArray(db.vehicles)) db.vehicles = [];
  if (!Array.isArray(db.fuel)) db.fuel = [];
  if (!Array.isArray(db.trips)) db.trips = [];
  if (!Array.isArray(db.maint)) db.maint = [];

  if (!db.vehicles.length) {
    db.vehicles.push({
      id: 'v1',
      name: 'Autocaravana',
      type: 'diesel',
      cons: 10
    });
  }

  db.fuel = db.fuel.map(x => {
    const record = { ...x };

    /*
      Compatibilidad con la versión anterior:
      si existían litros + precio, calculamos el importe.
    */
    if (
      (record.amount === undefined ||
        record.amount === null ||
        record.amount === '') &&
      Number(record.liters) > 0 &&
      Number(record.price) > 0
    ) {
      record.amount =
        Number(record.liters) * Number(record.price);
    }

    if (record.km === undefined) {
      record.km = null;
    }

    if (record.amount === undefined) {
      record.amount = 0;
    }

    return record;
  });

  save();
}

migrateData();


/* =========================
   COMBUSTIBLE
   ========================= */

function fuelLiters(record) {
  if (
    record.liters !== undefined &&
    record.liters !== null &&
    Number(record.liters) > 0
  ) {
    return Number(record.liters);
  }

  if (
    Number(record.amount) > 0 &&
    Number(record.price) > 0
  ) {
    return Number(record.amount) / Number(record.price);
  }

  return 0;
}

function avg(v) {
  const records = db.fuel
    .filter(x =>
      x.vehicle === v.id &&
      x.km !== null &&
      x.km !== undefined &&
      x.km !== '' &&
      fuelLiters(x) > 0
    )
    .sort((a, b) => Number(a.km) - Number(b.km));

  const values = [];

  for (let i = 1; i < records.length; i++) {
    const previous = records[i - 1];
    const current = records[i];

    const distance =
      Number(current.km) - Number(previous.km);

    const liters =
      fuelLiters(current);

    if (
      distance > 20 &&
      distance < 2000 &&
      current.full &&
      previous.full &&
      liters > 0
    ) {
      values.push(
        liters / distance * 100
      );
    }
  }

  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : Number(v.cons) || 0;
}


/* =========================
   LAYOUT
   ========================= */

function layout() {
  const app = $('#app');

  if (!app) return;

  document
    .querySelectorAll('#nav button')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.page === page
      );
    });

  try {
    switch (page) {
      case 'home':
        home(app);
        break;

      case 'vehicles':
        vehicles(app);
        break;

      case 'fuel':
        fuel(app);
        break;

      case 'trips':
        trips(app);
        break;

      case 'more':
        more(app);
        break;

      default:
        page = 'home';
        home(app);
    }
  } catch (error) {
    console.error(error);

    app.innerHTML = `
      <div class="card">
        <h2>ENRUTA</h2>
        <p>Se ha producido un error al cargar esta sección.</p>
        <button class="btn" type="button" data-action="home">
          Volver a Inicio
        </button>
      </div>
    `;
  }
}


/* =========================
   INICIO
   ========================= */

function home(A) {
  const kms = db.trips.reduce(
    (sum, trip) =>
      sum + (Number(trip.km) || 0),
    0
  );

  const cost = db.trips.reduce(
    (sum, trip) =>
      sum + (Number(trip.cost) || 0),
    0
  );

  A.innerHTML = `
    <section class="hero">
      <h1>Tu vehículo. Tus rutas. Todo ENRUTA.</h1>

      <p>
        Controla costes sin tener que apuntarlo todo.
      </p>

      <div class="actions">
        <button
          class="btn"
          type="button"
          data-action="sim"
        >
          Simular viaje
        </button>

        <button
          class="btn secondary"
          type="button"
          data-action="addFuel"
        >
          + Repostaje
        </button>
      </div>
    </section>

    <div class="grid">

      <div class="card stat">
        <small>Vehículos</small>
        <b>${db.vehicles.length}</b>
      </div>

      <div class="card stat">
        <small>Viajes reales</small>
        <b>${db.trips.length}</b>
      </div>

      <div class="card stat">
        <small>Km registrados</small>
        <b>${Math.round(kms)}</b>
      </div>

      <div class="card stat">
        <small>Coste viajes</small>
        <b>${eur(cost)}</b>
      </div>

    </div>

    <div class="card">

      <div class="row">
        <h2>Consumo aprendido</h2>
        <span class="pill">automático</span>
      </div>

      ${
        db.vehicles.length
          ? db.vehicles.map(v => `
              <div
                class="row"
                style="padding:8px 0;border-top:1px solid #eee"
              >
                <span>${v.name}</span>
                <b>${avg(v).toFixed(1)} L/100 km</b>
              </div>
            `).join('')
          : `
            <p class="empty">
              No hay vehículos.
            </p>
          `
      }

    </div>
  `;
}


/* =========================
   VEHÍCULOS
   ========================= */

function vehicles(A) {
  A.innerHTML = `
    <div class="row">

      <h1>Vehículos</h1>

      <button
        class="btn"
        type="button"
        data-action="addVehicle"
      >
        + Añadir
      </button>

    </div>

    <div class="list">

      ${
        db.vehicles.map(v => `
          <div class="item">

            <div class="row">

              <div>
                <h3>${v.name}</h3>
                <span class="pill">${v.type}</span>
              </div>

              <b>
                ${avg(v).toFixed(1)} L/100
              </b>

            </div>

            <p class="muted">
              Consumo base:
              ${Number(v.cons) || 0} L/100 km
            </p>

            <button
              class="btn danger"
              type="button"
              data-action="delVehicle"
              data-id="${v.id}"
            >
              Archivar
            </button>

          </div>
        `).join('') ||
        `
          <div class="empty">
            No hay vehículos.
          </div>
        `
      }

    </div>
  `;
}


/* =========================
   REPOSTAJES
   ========================= */

function fuel(A) {
  const records = db.fuel
    .slice()
    .sort((a, b) =>
      String(b.date || '').localeCompare(
        String(a.date || '')
      )
    );

  A.innerHTML = `
    <div class="row">

      <h1>Repostajes</h1>

      <button
        class="btn"
        type="button"
        data-action="addFuel"
      >
        + Añadir
      </button>

    </div>

    <p class="muted">
      El importe es el dato principal.
      Los kilómetros pueden añadirse después.
    </p>

    <div class="list">

      ${
        records.length
          ? records.map(x => {

              const kmText =
                x.km === null ||
                x.km === undefined ||
                x.km === ''
                  ? 'Km pendiente'
                  : `${x.km} km`;

              const amount =
                Number(x.amount) ||
                (
                  Number(x.liters) > 0 &&
                  Number(x.price) > 0
                    ? Number(x.liters) * Number(x.price)
                    : 0
                );

              return `
                <div class="item">

                  <div class="row">
                    <b>
                      ${vehicle(x.vehicle)?.name || 'Vehículo'}
                    </b>

                    <span>
                      ${x.date || ''}
                    </span>
                  </div>

                  <p>
                    <strong>${eur(amount)}</strong>

                    ${
                      Number(x.price) > 0
                        ? ` · ${eur(x.price)}/L`
                        : ''
                    }

                    · ${kmText}

                    · ${
                      x.full
                        ? 'depósito lleno'
                        : 'parcial'
                    }
                  </p>

                  <div class="actions">

                    <button
                      class="btn secondary"
                      type="button"
                      data-action="editFuel"
                      data-id="${x.id}"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      class="btn danger"
                      type="button"
                      data-action="deleteFuel"
                      data-id="${x.id}"
                    >
                      🗑️ Borrar
                    </button>

                  </div>

                </div>
              `;
            }).join('')
          : `
            <div class="empty">
              No hay repostajes todavía.
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   AÑADIR / EDITAR REPOSTAJE
   ========================= */

function fuelForm(record = null) {
  const editing = !!record;

  const currentAmount =
    record?.amount ??
    (
      Number(record?.liters) > 0 &&
      Number(record?.price) > 0
        ? Number(record.liters) * Number(record.price)
        : ''
    );

  const currentKm =
    record?.km === null ||
    record?.km === undefined
      ? ''
      : record.km;

  const currentPrice =
    record?.price ?? '';

  modal(
    editing
      ? 'Editar repostaje'
      : 'Nuevo repostaje',

    `
      <form
        class="form"
        id="fuelForm"
      >

        <label>
          Vehículo

          <select id="fuelVehicle" required>
            ${
              db.vehicles.map(v => `
                <option
                  value="${v.id}"
                  ${
                    record?.vehicle === v.id
                      ? 'selected'
                      : ''
                  }
                >
                  ${v.name}
                </option>
              `).join('')
            }
          </select>
        </label>

        <label>
          Importe repostado (€)

          <input
            id="fuelAmount"
            type="number"
            min="0"
            step="0.01"
            value="${currentAmount}"
            required
            inputmode="decimal"
            placeholder="Ej. 85,50"
          >
        </label>

        <label>
          Precio por litro (€/L)

          <input
            id="fuelPrice"
            type="number"
            min="0"
            step="0.001"
            value="${currentPrice}"
            inputmode="decimal"
            placeholder="Ej. 1,559"
          >
        </label>

        <label>
          Km odómetro
          <span class="muted">(opcional)</span>

          <input
            id="fuelKm"
            type="number"
            min="0"
            step="1"
            value="${currentKm}"
            inputmode="numeric"
            placeholder="Puedes añadirlo después"
          >
        </label>

        <label>
          Fecha

          <input
            id="fuelDate"
            type="date"
            value="${record?.date || today()}"
            required
          >
        </label>

        <label>
          <input
            id="fuelFull"
            type="checkbox"
            ${
              record
                ? (record.full ? 'checked' : '')
                : 'checked'
            }
          >
          Depósito lleno
        </label>

        <div class="actions">

          <button
            class="btn"
            type="submit"
          >
            ${editing ? 'Guardar cambios' : 'Guardar repostaje'}
          </button>

          <button
            class="btn secondary"
            type="button"
            data-action="closeModal"
          >
            Cancelar
          </button>

        </div>

      </form>
    `
  );

  const form = $('#fuelForm');

  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();

    const amount =
      Number($('#fuelAmount').value);

    const price =
      Number($('#fuelPrice').value);

    const kmValue =
      $('#fuelKm').value.trim();

    const km =
      kmValue === ''
        ? null
        : Number(kmValue);

    if (!amount || amount <= 0) {
      toast('Introduce un importe válido');
      return;
    }

    if (km !== null && (!Number.isFinite(km) || km < 0)) {
      toast('Los kilómetros no son válidos');
      return;
    }

    const data = {
      vehicle: $('#fuelVehicle').value,
      amount,
      price: price > 0 ? price : 0,
      km,
      full: $('#fuelFull').checked,
      date: $('#fuelDate').value,
      updatedAt: Date.now()
    };

    if (editing) {
      const index =
        db.fuel.findIndex(x => x.id === record.id);

      if (index >= 0) {
        db.fuel[index] = {
          ...db.fuel[index],
          ...data
        };
      }
    } else {
      db.fuel.push({
        id: uid(),
        ...data
      });
    }

    save();
    closeModal();
    layout();

    toast(
      editing
        ? 'Repostaje actualizado'
        : 'Repostaje guardado'
    );
  });
}


/* =========================
   BORRAR REPOSTAJE
   ========================= */

function deleteFuel(id) {
  const record =
    db.fuel.find(x => x.id === id);

  if (!record) return;

  const name =
    vehicle(record.vehicle)?.name ||
    'este vehículo';

  const ok = confirm(
    `¿Quieres borrar este repostaje de ${name}?`
  );

  if (!ok) return;

  db.fuel =
    db.fuel.filter(x => x.id !== id);

  save();
  layout();

  toast('Repostaje borrado');
}


/* =========================
   VIAJES
   ========================= */

function trips(A) {
  const records = db.trips
    .slice()
    .sort((a, b) =>
      String(b.date || '').localeCompare(
        String(a.date || '')
      )
    );

  A.innerHTML = `
    <div class="row">

      <h1>Viajes</h1>

      <div class="actions">

        <button
          class="btn"
          type="button"
          data-action="sim"
        >
          Simular
        </button>

        <button
          class="btn secondary"
          type="button"
          data-action="addTrip"
        >
          + Real
        </button>

      </div>

    </div>

    <div class="list">

      ${
        records.length
          ? records.map(t => `
              <div class="item">

                <h3>${t.name}</h3>

                <p class="muted">
                  ${t.date || ''}
                  ·
                  ${vehicle(t.vehicle)?.name || ''}
                </p>

                <div class="row">
                  <span>
                    ${Number(t.km) || 0} km
                  </span>

                  <b>
                    ${eur(t.cost)}
                  </b>
                </div>

              </div>
            `).join('')
          : `
            <div class="empty">
              No hay viajes reales.
              Las simulaciones nunca aparecen aquí.
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   MÁS
   ========================= */

function more(A) {
  A.innerHTML = `
    <h1>Más</h1>

    <div class="card">
      <h2>🧮 Simulador</h2>

      <p>
        Calcula un viaje sin contaminar tus estadísticas.
      </p>

      <button
        class="btn"
        type="button"
        data-action="sim"
      >
        Abrir simulador
      </button>
    </div>

    <div class="card">
      <h2>🔧 Mantenimiento</h2>

      <p>
        En esta versión inicial la estructura está
        preparada para mantenimiento.
      </p>

      <button
        class="btn secondary"
        type="button"
        data-action="maint"
      >
        Añadir mantenimiento
      </button>
    </div>

    <div class="card">
      <h2>💾 Datos</h2>

      <button
        class="btn"
        type="button"
        data-action="exportData"
      >
        Exportar copia
      </button>

      <button
        class="btn secondary"
        type="button"
        data-action="importData"
      >
        Importar
      </button>

      <p class="muted">
        Puedes guardar una copia de seguridad de ENRUTA.
      </p>
    </div>
  `;
}


/* =========================
   MODAL
   ========================= */

function modal(title, html) {
  closeModal();

  const d =
    document.createElement('div');

  d.className = 'enruta-modal';

  d.style.cssText =
    'position:fixed;' +
    'inset:0;' +
    'background:#0008;' +
    'z-index:2500;' +
    'padding:20px;' +
    'display:grid;' +
    'place-items:center;';

  d.innerHTML = `
    <div
      class="card"
      style="
        width:min(600px,100%);
        max-height:90vh;
        overflow:auto;
      "
    >

      <div class="row">

        <h2>${title}</h2>

        <button
          class="btn secondary"
          type="button"
          data-action="closeModal"
        >
          Cerrar
        </button>

      </div>

      ${html}

    </div>
  `;

  document.body.appendChild(d);

  document.body.style.overflow = 'hidden';
}


/* =========================
   VEHÍCULO
   ========================= */

function addVehicle() {
  modal(
    'Nuevo vehículo',

    `
      <form class="form" id="vehicleForm">

        <label>
          Nombre

          <input
            id="vehicleName"
            required
            placeholder="Mi coche"
          >
        </label>

        <label>
          Combustible

          <select id="vehicleType">
            <option value="diesel">Diésel</option>
            <option value="gasolina">Gasolina</option>
            <option value="electrico">Eléctrico</option>
          </select>
        </label>

        <label>
          Consumo base

          <input
            id="vehicleCons"
            type="number"
            min="0"
            step="0.1"
            placeholder="7.5"
          >
        </label>

        <button
          class="btn"
          type="submit"
        >
          Guardar
        </button>

      </form>
    `
  );

  $('#vehicleForm')?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      db.vehicles.push({
        id: uid(),
        name: $('#vehicleName').value.trim(),
        type: $('#vehicleType').value,
        cons:
          Number($('#vehicleCons').value) || 0,
        updatedAt: Date.now()
      });

      save();
      closeModal();
      layout();

      toast('Vehículo añadido');
    }
  );
}

function delVehicle(id) {
  const v = vehicle(id);

  if (!v) return;

  const ok = confirm(
    `¿Archivar el vehículo "${v.name}"?`
  );

  if (!ok) return;

  db.vehicles =
    db.vehicles.filter(x => x.id !== id);

  save();
  layout();

  toast('Vehículo archivado');
}


/* =========================
   AÑADIR VIAJE
   ========================= */

function addTrip() {
  modal(
    'Nuevo viaje real',

    `
      <form class="form" id="tripForm">

        <label>
          Nombre

          <input
            id="tripName"
            required
            placeholder="Escapada a Gredos"
          >
        </label>

        <div class="two">

          <label>
            Fecha

            <input
              id="tripDate"
              type="date"
              value="${today()}"
              required
            >
          </label>

          <label>
            Vehículo

            <select id="tripVehicle">
              ${
                db.vehicles.map(v => `
                  <option value="${v.id}">
                    ${v.name}
                  </option>
                `).join('')
              }
            </select>
          </label>

        </div>

        <div class="two">

          <label>
            Km

            <input
              id="tripKm"
              type="number"
              min="0"
              required
            >
          </label>

          <label>
            €/L

            <input
              id="tripPrice"
              type="number"
              min="0"
              step="0.001"
              value="1.55"
            >
          </label>

        </div>

        <div class="two">

          <label>
            Peajes €

            <input
              id="tripTolls"
              type="number"
              value="0"
            >
          </label>

          <label>
            Aparcamiento €

            <input
              id="tripParking"
              type="number"
              value="0"
            >
          </label>

        </div>

        <label>
          Otros €

          <input
            id="tripOther"
            type="number"
            value="0"
          >
        </label>

        <button
          class="btn"
          type="submit"
        >
          Guardar viaje
        </button>

      </form>
    `
  );

  $('#tripForm')?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const km =
        Number($('#tripKm').value);

      const v =
        vehicle($('#tripVehicle').value);

      const consumption =
        avg(v);

      const price =
        Number($('#tripPrice').value) || 0;

      const fuelCost =
        km *
        consumption /
        100 *
        price;

      const cost =
        fuelCost +
        (Number($('#tripTolls').value) || 0) +
        (Number($('#tripParking').value) || 0) +
        (Number($('#tripOther').value) || 0);

      db.trips.push({
        id: uid(),
        name: $('#tripName').value.trim(),
        date: $('#tripDate').value,
        vehicle: $('#tripVehicle').value,
        km,
        cost,
        updatedAt: Date.now()
      });

      save();
      closeModal();
      layout();

      toast('Viaje guardado');
    }
  );
}


/* =========================
   SIMULADOR
   ========================= */

function sim() {
  modal(
    'Simulador — no guarda estadísticas',

    `
      <form class="form" id="simForm">

        <label>
          Vehículo

          <select id="simVehicle">
            ${
              db.vehicles.map(v => `
                <option value="${v.id}">
                  ${v.name}
                </option>
              `).join('')
            }
          </select>
        </label>

        <div class="two">

          <label>
            Km

            <input
              id="simKm"
              type="number"
              min="0"
              required
            >
          </label>

          <label>
            €/L

            <input
              id="simPrice"
              type="number"
              min="0"
              step="0.001"
              value="1.55"
            >
          </label>

        </div>

        <label>
          Consumo estimado

          <input
            id="simConsumption"
            type="number"
            min="0"
            step="0.1"
            placeholder="Usar consumo aprendido"
          >
        </label>

        <div class="two">

          <label>
            Peajes €

            <input
              id="simTolls"
              type="number"
              value="0"
            >
          </label>

          <label>
            Aparcamiento €

            <input
              id="simParking"
              type="number"
              value="0"
            >
          </label>

        </div>

        <label>
          Otros €

          <input
            id="simOther"
            type="number"
            value="0"
          >
        </label>

        <button
          class="btn"
          type="submit"
        >
          Calcular
        </button>

        <div id="simResult"></div>

      </form>
    `
  );

  $('#simForm')?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const v =
        vehicle($('#simVehicle').value);

      const km =
        Number($('#simKm').value);

      const consumptionInput =
        Number($('#simConsumption').value);

      const consumption =
        consumptionInput > 0
          ? consumptionInput
          : avg(v);

      const price =
        Number($('#simPrice').value) || 0;

      const fuelCost =
        km *
        consumption /
        100 *
        price;

      const total =
        fuelCost +
        (Number($('#simTolls').value) || 0) +
        (Number($('#simParking').value) || 0) +
        (Number($('#simOther').value) || 0);

      $('#simResult').innerHTML = `
        <div class="card">

          <h2>${eur(total)}</h2>

          <p>
            ${km} km ·
            ${consumption.toFixed(1)} L/100 km
          </p>

          <p>
            Combustible:
            <strong>${eur(fuelCost)}</strong>
          </p>

        </div>
      `;
    }
  );
}


/* =========================
   MANTENIMIENTO
   ========================= */

function maint() {
  modal(
    'Mantenimiento',

    `
      <form
        class="form"
        id="maintForm"
      >

        <label>
          Vehículo

          <select id="maintVehicle">
            ${
              db.vehicles.map(v => `
                <option value="${v.id}">
                  ${v.name}
                </option>
              `).join('')
            }
          </select>
        </label>

        <label>
          Tipo

          <input
            id="maintType"
            required
            placeholder="Aceite, neumáticos…"
          >
        </label>

        <label>
          Km

          <input
            id="maintKm"
            type="number"
          >
        </label>

        <label>
          Importe €

          <input
            id="maintAmount"
            type="number"
            step="0.01"
          >
        </label>

        <label>
          Notas

          <textarea id="maintNotes"></textarea>
        </label>

        <button
          class="btn"
          type="submit"
        >
          Guardar
        </button>

      </form>
    `
  );

  $('#maintForm')?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      db.maint.push({
        id: uid(),
        vehicle: $('#maintVehicle').value,
        type: $('#maintType').value.trim(),
        km: Number($('#maintKm').value) || null,
        amount:
          Number($('#maintAmount').value) || 0,
        notes: $('#maintNotes').value.trim(),
        date: today(),
        updatedAt: Date.now()
      });

      save();
      closeModal();

      toast('Mantenimiento guardado');
    }
  );
}


/* =========================
   EXPORTAR
   ========================= */

function exportData() {
  const data = {
    ...db,
    exportedAt:
      new Date().toISOString()
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type: 'application/json'
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download =
    'enruta-backup.json';

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  toast('Copia exportada');
}


/* =========================
   IMPORTAR
   ========================= */

function importData() {
  const input =
    document.createElement('input');

  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener(
    'change',
    () => {

      const file =
        input.files?.[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onload = () => {

        try {

          const imported =
            JSON.parse(reader.result);

          if (
            !imported ||
            !Array.isArray(imported.vehicles)
          ) {
            throw new Error('invalid');
          }

          db = imported;

          migrateData();

          layout();

          toast('Copia importada');

        } catch (error) {

          console.error(error);

          toast(
            'El archivo no es válido'
          );
        }
      };

      reader.readAsText(file);
    }
  );

  input.click();
}


/* =========================
   NAVEGACIÓN
   ========================= */

document.addEventListener(
  'click',
  event => {

    const navButton =
      event.target.closest(
        '#nav button[data-page]'
      );

    if (navButton) {

      page =
        navButton.dataset.page;

      closeModal();
      layout();

      return;
    }

    const actionButton =
      event.target.closest(
        '[data-action]'
      );

    if (!actionButton) return;

    const action =
      actionButton.dataset.action;

    const id =
      actionButton.dataset.id;

    switch (action) {

      case 'home':
        page = 'home';
        closeModal();
        layout();
        break;

      case 'addFuel':
        fuelForm();
        break;

      case 'editFuel':
        {
          const record =
            db.fuel.find(x => x.id === id);

          if (record) {
            fuelForm(record);
          }
        }
        break;

      case 'deleteFuel':
        deleteFuel(id);
        break;

      case 'addVehicle':
        addVehicle();
        break;

      case 'delVehicle':
        delVehicle(id);
        break;

      case 'addTrip':
        addTrip();
        break;

      case 'sim':
        sim();
        break;

      case 'maint':
        maint();
        break;

      case 'exportData':
        exportData();
        break;

      case 'importData':
        importData();
        break;

      case 'closeModal':
        closeModal();
        break;
    }
  }
);


/* =========================
   PWA
   ========================= */

window.addEventListener(
  'beforeinstallprompt',
  event => {

    event.preventDefault();

    window.deferredInstallPrompt =
      event;

    const install =
      $('#install');

    if (install) {
      install.hidden = false;
    }
  }
);

$('#install')?.addEventListener(
  'click',
  async () => {

    if (!window.deferredInstallPrompt) {
      return;
    }

    window.deferredInstallPrompt.prompt();

    await window.deferredInstallPrompt.userChoice;

    window.deferredInstallPrompt = null;

    const install =
      $('#install');

    if (install) {
      install.hidden = true;
    }
  }
);


/* =========================
   SERVICE WORKER
   ========================= */

if ('serviceWorker' in navigator) {

  navigator.serviceWorker
    .register('./sw.js')
    .catch(error => {
      console.error(
        'Service Worker:',
        error
      );
    });
}


/* =========================
   ARRANQUE
   ========================= */

layout();

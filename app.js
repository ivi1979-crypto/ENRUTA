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
  }).format(+value || 0);
}

function vehicle(id) {
  return db.vehicles.find(v => v.id === id);
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
    'z-index:2000;';

  setTimeout(() => {
    x.style.cssText = '';
  }, 2200);
}


/* =========================
   CONSUMO
   ========================= */

function fuelLiters(record) {
  if (record.liters > 0) {
    return +record.liters;
  }

  if (
    record.amount > 0 &&
    record.price > 0
  ) {
    return record.amount / record.price;
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
    .sort((a, b) => +a.km - +b.km);

  const values = [];

  for (let i = 1; i < records.length; i++) {
    const previous = records[i - 1];
    const current = records[i];

    const distance =
      +current.km - +previous.km;

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
    : v.cons || 0;
}


/* =========================
   NAVEGACIÓN
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
  }
}


/* =========================
   INICIO
   ========================= */

function home(A) {
  const kms = db.trips.reduce(
    (sum, trip) =>
      sum + (+trip.km || 0),
    0
  );

  const cost = db.trips.reduce(
    (sum, trip) =>
      sum + (+trip.cost || 0),
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
        db.vehicles
          .map(v => `
            <div
              class="row"
              style="padding:8px 0;border-top:1px solid #eee"
            >
              <span>${v.name}</span>
              <b>${avg(v).toFixed(1)} L/100 km</b>
            </div>
          `)
          .join('')
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
        db.vehicles
          .map(v => `
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
                ${v.cons || 0} L/100 km
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
          `)
          .join('') ||
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
      Puedes guardar un repostaje aunque no conozcas
      todavía los kilómetros. Podrás añadirlos
      posteriormente.
    </p>

    <div class="list">

      ${
        db.fuel
          .slice()
          .sort((a, b) =>
            b.date.localeCompare(a.date)
          )
          .map(x => {

            const kmText =
              x.km === null ||
              x.km === undefined ||
              x.km === ''
                ? 'Km pendiente'
                : `${x.km} km`;

            return `
              <div class="item">

                <div class="row">
                  <b>
                    ${vehicle(x.vehicle)?.name || 'Vehículo'}
                  </b>

                  <span>${x.date}</span>
                </div>

                <p>
                  ${eur(x.amount)}
                  ${
                    x.price
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

              </div>
            `;
          })
          .join('') ||
        `
          <div class="empty">
            No hay repostajes todavía.
          </div>
        `
      }

    </div>
  `;
}


/* =========================
   VIAJES
   ========================= */

function trips(A) {
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
        db.trips
          .slice()
          .sort((a, b) =>
            b.date.localeCompare(a.date)
          )
          .map(t => `
            <div class="item">

              <h3>${t.name}</h3>

              <p class="muted">${t.date} · ${vehicle(t.vehicle)?.name || ''}</p>

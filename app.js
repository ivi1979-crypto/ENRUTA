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

const $ = s => document.querySelector(s);

const save = () => {
  localStorage.setItem(K, JSON.stringify(db));
};

const uid = () =>
  crypto.randomUUID?.() || Date.now() + Math.random();

const eur = n =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(+n || 0);

const toast = t => {
  const x = $('#toast');
  if (!x) return;

  x.textContent = t;
  x.style =
    'position:fixed;bottom:85px;left:50%;transform:translateX(-50%);background:#101828;color:white;padding:10px 14px;border-radius:10px;z-index:30';

  setTimeout(() => {
    x.style = '';
  }, 2200);
};

const vehicle = id =>
  db.vehicles.find(v => v.id === id);

function avg(v) {
  const a = db.fuel
    .filter(x => x.vehicle === v.id && x.liters > 0)
    .sort((a, b) => a.km - b.km);

  const vals = [];

  for (let i = 1; i < a.length; i++) {
    const d = a[i].km - a[i - 1].km;

    if (
      d > 20 &&
      d < 2000 &&
      a[i].full &&
      a[i - 1].full
    ) {
      vals.push((a[i].liters / d) * 100);
    }
  }

  return vals.length
    ? vals.reduce((a, b) => a + b, 0) / vals.length
    : v.cons || 0;
}

function layout() {
  const A = $('#app');
  if (!A) return;

  document
    .querySelectorAll('nav button')
    .forEach(b =>
      b.classList.toggle(
        'active',
        b.dataset.page === page
      )
    );

  if (page === 'home') home(A);
  if (page === 'vehicles') vehicles(A);
  if (page === 'fuel') fuel(A);
  if (page === 'trips') trips(A);
  if (page === 'more') more(A);
}

function home(A) {
  const kms = db.trips.reduce(
    (s, t) => s + (+t.km || 0),
    0
  );

  const cost = db.trips.reduce(
    (s, t) => s + (+t.cost || 0),
    0
  );

  A.innerHTML = `
    <section class="hero">
      <h1>Tu vehículo. Tus rutas. Todo ENRUTA.</h1>

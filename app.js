const NativeGeolocation =
  window.Capacitor?.registerPlugin?.('Geolocation');

function getAppPosition(success, error, options = {}) {

  if (NativeGeolocation) {

    NativeGeolocation.requestPermissions()
      .then(permission => {

        if (
          permission.location !== 'granted' &&
          permission.location !== 'limited'
        ) {
          throw new Error('Permiso de ubicación denegado');
        }

        return NativeGeolocation.getCurrentPosition(options);

      })
      .then(position => {
        success(position);
      })
      .catch(err => {

        if (error) {
          error(err);
        }

      });

    return;
  }

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(
      success,
      error,
      options
    );

    return;
  }

  if (error) {
    error(
      new Error(
        'La geolocalización no está disponible'
      )
    );
  }
}
/* =========================================================
   SUPABASE - AUTENTICACIÓN
========================================================= */

let currentUser = null;
let currentWorkspaceId = null;


async function initSupabaseAuth() {

  if (
     !window.supabase ||
     !window.supabase.createClient
  ) {
    console.error('Supabase no está disponible');
    render('home');
    return;
  }

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      'Error obteniendo sesión:',
      error
    );

    showLogin();

    return;
  }

  if (!session?.user) {

    showLogin();

    return;
  }

  currentUser =
    session.user;


  const {
    data: membership,
    error: membershipError
  } =
    await supabaseClient
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name
        )
      `)
      .eq(
        'user_id',
        currentUser.id
      )
      .limit(1)
      .maybeSingle();


  if (membershipError) {

    console.error(
      'Error obteniendo espacio ENRUTA:',
      membershipError
    );

    showLogin(
      'No se ha podido cargar el espacio ENRUTA.'
    );

    return;
  }


  if (!membership) {

    showLogin(
      'Tu usuario todavía no está asociado a ENRUTA Familia.'
    );

    return;
  }


  currentWorkspaceId =
    membership.workspace_id;


  console.log(
    'ENRUTA conectado:',
    currentUser.email,
    membership.workspaces?.name
  );


  render('home');
}


function showLogin(message = '') {

  const app =
    document.getElementById('app');

  if (!app) return;


  app.innerHTML = `

    <section class="page">

      <div class="form-page">

        <div class="form-page-head">

          <div>

            <h1>ENRUTA</h1>

            <p class="muted">
              Inicia sesión para continuar.
            </p>

          </div>

        </div>


        ${
          message
            ? `
              <div class="card">
                <p class="muted">
                  ${escapeHtml(message)}
                </p>
              </div>
            `
            : ''
        }


        <form
          id="loginForm"
          class="full-form"
        >

          <label>

            Correo electrónico

            <input
              type="email"
              name="email"
              autocomplete="email"
              required
            >

          </label>


          <label>

            Contraseña

            <input
              type="password"
              name="password"
              autocomplete="current-password"
              required
            >

          </label>


          <div class="form-page-actions">

            <button
              type="submit"
              class="primary"
            >
              Entrar
            </button>

          </div>

        </form>

      </div>

    </section>

  `;


  document
    .getElementById('loginForm')
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const fd =
          new FormData(event.target);


        const email =
          String(
            fd.get('email') || ''
          ).trim();

        const password =
          String(
            fd.get('password') || ''
          );


        const button =
          event.target.querySelector(
            'button[type="submit"]'
          );


        if (button) {
          button.disabled = true;
          button.textContent =
            'Entrando...';
        }


        const {
          data,
          error
        } =
          await supabaseClient.auth
            .signInWithPassword({
              email,
              password
            });


        if (error) {

          console.error(
            'Error de inicio de sesión:',
            error
          );


          showLogin(
            'Correo o contraseña incorrectos.'
          );

          return;
        }


        currentUser =
          data.user;


        await initSupabaseAuth();

      }
    );

}
const K = 'enruta04';

let db = JSON.parse(localStorage.getItem(K) || 'null') || {
  vehicles: [],
  fuel: [],
  trips: [],
  maint: []
};


/* =========================================================
   UTILIDADES
========================================================= */

function save() {
  localStorage.setItem(K, JSON.stringify(db));
}


function uid(prefix = 'id') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 7);
}


function eur(n) {
  return Number(n || 0).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });
}


function today() {
  return new Date().toISOString().slice(0, 10);
}


function vehicle(id) {
  return db.vehicles.find(v => v.id === id);
}


function closeModal() {
  const m = document.querySelector('.modal');
  if (m) m.remove();
}


function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2200);
}


/* =========================================================
   ITV
========================================================= */

function formatDateES(value) {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-ES');
}


function itvInfo(v) {
  const next = v?.itvNext || '';

  if (!next) {
    return {
      label: 'Sin fecha registrada',
      className: 'muted',
      icon: '⚪'
    };
  }

  const todayDate = new Date();

  todayDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(`${next}T00:00:00`);

  if (Number.isNaN(nextDate.getTime())) {
    return {
      label: 'Fecha no válida',
      className: 'danger',
      icon: '🔴'
    };
  }

  const days = Math.ceil(
    (nextDate - todayDate) / 86400000
  );

  if (days < 0) {
    return {
      label: `Caducada hace ${Math.abs(days)} días`,
      className: 'danger',
      icon: '🔴'
    };
  }

  if (days === 0) {
    return {
      label: 'Caduca hoy',
      className: 'warning',
      icon: '🟠'
    };
  }

  if (days <= 30) {
    return {
      label: `Vence en ${days} días`,
      className: 'warning',
      icon: '🟠'
    };
  }

  return {
    label: 'En vigor',
    className: 'good',
    icon: '🟢'
  };
}


/* =========================================================
   MIGRACIÓN / COMPATIBILIDAD
========================================================= */

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


  db.vehicles.forEach(v => {
    if (v.itvLast == null) v.itvLast = '';
    if (v.itvNext == null) v.itvNext = '';
  });


  db.fuel.forEach(f => {

    if (f.liters == null && f.litres != null) {
      f.liters = f.litres;
    }

    if (f.amount == null && f.importe != null) {
      f.amount = f.importe;
    }

    if (f.price == null && f.precio != null) {
      f.price = f.precio;
    }

    if (f.date == null && f.fecha != null) {
      f.date = f.fecha;
    }

    if (f.km == null && f.odometer != null) {
      f.km = f.odometer;
    }

    if (f.full == null && f.lleno != null) {
      f.full = f.lleno;
    }

    if (f.fuelType == null) {
      f.fuelType = '';
    }

    if (f.stationName == null) {
      f.stationName = '';
    }

    if (f.stationAddress == null) {
      f.stationAddress = '';
    }

    if (f.stationLat == null) {
      f.stationLat = '';
    }

    if (f.stationLng == null) {
      f.stationLng = '';
    }

  });

  save();
}


migrateData();


/* =========================================================
   COMBUSTIBLE
========================================================= */

function fuelLiters(f) {
  return Number(
    f.liters ??
    f.litres ??
    0
  );
}


function fuelAmount(f) {

  if (f.amount != null) {
    return Number(f.amount || 0);
  }

  return fuelLiters(f) * Number(f.price || 0);
}


function avg(values) {

  const nums = values
    .map(Number)
    .filter(n => Number.isFinite(n));

  if (!nums.length) return 0;

  return nums.reduce((a, b) => a + b, 0) / nums.length;
}


function learnedConsumption(vehicleId) {

  const list = db.fuel
    .filter(f =>
      f.vehicleId === vehicleId &&
      f.full &&
      Number.isFinite(Number(f.km))
    )
    .sort((a, b) =>
      Number(a.km) - Number(b.km)
    );

  if (list.length < 2) return null;

  const consumptions = [];

  for (let i = 1; i < list.length; i++) {

    const previous = list[i - 1];
    const current = list[i];

    const km =
      Number(current.km) -
      Number(previous.km);

    const liters =
      fuelLiters(current);

    if (km > 0 && liters > 0) {
      consumptions.push(
        liters * 100 / km
      );
    }
  }

  if (!consumptions.length) return null;

  return avg(consumptions);
}


/* =========================================================
   ESTADÍSTICAS DE COMBUSTIBLE
========================================================= */

function fuelStatistics(vehicleId = null) {

  const list = db.fuel.filter(f =>
    !vehicleId ||
    f.vehicleId === vehicleId
  );

  const prices = list
    .map(f => Number(f.price || 0))
    .filter(p => p > 0);

  const liters = list.reduce(
    (sum, f) => sum + fuelLiters(f),
    0
  );

  const total = list.reduce(
    (sum, f) => sum + fuelAmount(f),
    0
  );

  const years = {};

  list.forEach(f => {

    const year =
      String(f.date || today()).slice(0, 4);

    years[year] =
      (years[year] || 0) +
      fuelAmount(f);

  });

  const stations = [
    ...new Set(
      list
        .map(f => f.stationName)
        .filter(Boolean)
    )
  ];

  return {
    count: list.length,
    averagePrice: avg(prices),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    liters,
    total,
    years,
    stations
  };
}


function fuelStatsCard(vehicleId = null) {

  const stats =
    fuelStatistics(vehicleId);

  const consumption =
    vehicleId
      ? learnedConsumption(vehicleId)
      : null;

  const years =
    Object.keys(stats.years)
      .sort()
      .reverse();

  return `

    <div class="card">

      <h3>
        📊 Estadísticas de combustible
      </h3>

      <div class="detail-grid">

        <div>
          <span>Precio medio</span>
          <strong>
            ${
              stats.averagePrice
                ? `${stats.averagePrice.toFixed(3)} €/L`
                : '—'
            }
          </strong>
        </div>

        <div>
          <span>Precio mínimo</span>
          <strong>
            ${
              stats.minPrice
                ? `${stats.minPrice.toFixed(3)} €/L`
                : '—'
            }
          </strong>
        </div>

        <div>
          <span>Precio máximo</span>
          <strong>
            ${
              stats.maxPrice
                ? `${stats.maxPrice.toFixed(3)} €/L`
                : '—'
            }
          </strong>
        </div>

        <div>
          <span>Litros acumulados</span>
          <strong>
            ${stats.liters.toFixed(1)} L
          </strong>
        </div>

        <div>
          <span>Gasto total</span>
          <strong>
            ${eur(stats.total)}
          </strong>
        </div>

        ${
          consumption
            ? `
              <div>
                <span>Consumo calculado</span>
                <strong>
                  ${consumption.toFixed(2)} L/100 km
                </strong>
              </div>
            `
            : ''
        }

      </div>

      ${
        years.length
          ? `
            <h4>
              Gasto por año
            </h4>

            ${years.map(year => `

              <div class="list-row">

                <span>
                  ${year}
                </span>

                <strong>
                  ${eur(stats.years[year])}
                </strong>

              </div>

            `).join('')}
          `
          : ''
      }

      ${
        stats.stations.length
          ? `
            <h4>
              Gasolineras utilizadas
            </h4>

            <p class="muted">
              ${stats.stations.join(' · ')}
            </p>
          `
          : ''
      }

    </div>

  `;
}


function fuelPriceEvolution(vehicleId = null) {

  const list =
    db.fuel
      .filter(f =>
        !vehicleId ||
        f.vehicleId === vehicleId
      )
      .filter(f => Number(f.price || 0) > 0)
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      )
      .slice(0, 12);

  return `

    <div class="card">

      <h3>
        📈 Evolución de precios
      </h3>

      ${
        list.length

          ? list.map(f => `

              <div class="list-row">

                <div>

                  <strong>
                    ${f.date || ''}
                  </strong>

                  <small>
                    ${
                      escapeHtml(
                        f.stationName ||
                        fuelTypeLabel(f.fuelType) ||
                        'Repostaje'
                      )
                    }
                  </small>

                </div>

                <strong>
                  ${Number(f.price).toFixed(3)} €/L
                </strong>

              </div>

            `).join('')

          : `

            <p class="muted">
              Todavía no hay precios registrados.
            </p>

          `
      }

    </div>

  `;
}


function fuelTypeLabel(type) {

  switch (type) {

    case 'diesel':
      return 'Diésel';

    case 'gasolina95':
      return 'Gasolina 95';

    case 'gasolina98':
      return 'Gasolina 98';

    default:
      return '';

  }
}


/* =========================================================
   GASOLINERAS - DATOS OFICIALES MITECO
========================================================= */

const FUEL_API =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

let stationSearchResults = [];
let currentFuelLocation = null;
let selectedFuelStation = null;


function firstValue(obj, keys) {

  for (const key of keys) {

    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      String(obj[key]).trim() !== ''
    ) {
      return obj[key];
    }

  }

  return '';
}


function getStationName(s) {

  return firstValue(s, [
    'Rótulo',
    'Rotulo',
    'Nombre',
    'nombre',
    'Rótulo de la estación',
    'Rotulo de la estación'
  ]) || 'Gasolinera';

}


function getStationAddress(s) {

  const address =
    firstValue(s, [
      'Dirección',
      'Direccion',
      'dirección',
      'direccion'
    ]);

  const town =
    firstValue(s, [
      'Municipio',
      'municipio',
      'Localidad',
      'localidad'
    ]);

  const province =
    firstValue(s, [
      'Provincia',
      'provincia'
    ]);

  return [
    address,
    town,
    province
  ]
    .filter(Boolean)
    .join(', ');
}


function getStationProvince(s) {

  return firstValue(s, [
    'Provincia',
    'provincia'
  ]);
}


function parseCoordinate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const n =
    Number(
      String(value)
        .replace(',', '.')
        .trim()
    );

  if (!Number.isFinite(n)) {
    return null;
  }

  return n;
}


function getStationLat(s) {

  return parseCoordinate(
    firstValue(s, [
      'Latitud',
      'latitud',
      'LATITUD',
      'Latitude',
      'latitude'
    ])
  );
}


function getStationLng(s) {

  return parseCoordinate(
    firstValue(s, [
      'Longitud (WGS84)',
      'Longitud',
      'longitud',
      'LONGITUD',
      'Longitude',
      'longitude'
    ])
  );
}


function normalizePrice(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const n =
    Number(
      String(value)
        .replace(',', '.')
        .trim()
    );

  return Number.isFinite(n) ? n : 0;
}


function getFuelPrice(s, fuelType) {

  const keys = {

    diesel: [
      'Precio Gasoleo A',
      'Precio Gasóleo A',
      'Precio GasoleoA',
      'Gasoleo A',
      'Gasóleo A'
    ],

    gasolina95: [
      'Precio Gasolina 95 E5',
      'Precio Gasolina 95',
      'Gasolina 95 E5',
      'Gasolina 95'
    ],

    gasolina98: [
      'Precio Gasolina 98 E5',
      'Precio Gasolina 98',
      'Gasolina 98 E5',
      'Gasolina 98'
    ]

  };

  return normalizePrice(
    firstValue(
      s,
      keys[fuelType] || []
    )
  );
}


function stationHasFuelType(s, fuelType) {
  return getFuelPrice(s, fuelType) > 0;
}


function distanceKm(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat =
    (lat2 - lat1) *
    Math.PI /
    180;

  const dLon =
    (lon2 - lon1) *
    Math.PI /
    180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}


function extractStations(data) {

  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const possibleKeys = [
    'ListaEESSPrecio',
    'listaEESSPrecio',
    'Estaciones',
    'estaciones',
    'Stations',
    'stations'
  ];

  for (const key of possibleKeys) {

    if (Array.isArray(data[key])) {
      return data[key];
    }

  }

  for (const value of Object.values(data)) {

    if (Array.isArray(value)) {

      if (
        value.length &&
        typeof value[0] === 'object'
      ) {
        return value;
      }

    }

  }

  return [];
}


function prepareNearbyStations(
  rawStations,
  lat,
  lng,
  fuelType
) {

  const stations = [];

  rawStations.forEach(s => {

    const stationLat =
      getStationLat(s);

    const stationLng =
      getStationLng(s);

    if (
      stationLat === null ||
      stationLng === null
    ) {
      return;
    }

    const distance =
      distanceKm(
        lat,
        lng,
        stationLat,
        stationLng
      );

    if (distance > 25) {
      return;
    }

    const price =
      getFuelPrice(
        s,
        fuelType
      );

    stations.push({

      raw: s,

      name:
        getStationName(s),

      address:
        getStationAddress(s),

      province:
        getStationProvince(s),

      lat:
        stationLat,

      lng:
        stationLng,

      distance,

      price,

      fuelType

    });

  });


  stations.sort((a, b) => {

    if (
      a.price > 0 &&
      b.price <= 0
    ) {
      return -1;
    }

    if (
      a.price <= 0 &&
      b.price > 0
    ) {
      return 1;
    }

    return a.distance - b.distance;

  });


  return stations.slice(0, 20);
}


async function fetchFuelStations() {

  const response =
    await fetch(
      FUEL_API,
      {
        method: 'GET',
        cache: 'no-store'
      }
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return response.json();
}


function renderStationResults() {

  const box =
    document.getElementById(
      'stationResults'
    );

  if (!box) return;


  if (!stationSearchResults.length) {

    box.innerHTML = `

      <div class="card">

        <p class="muted">
          No hemos encontrado gasolineras
          con este combustible a menos de
          25 km.
        </p>

      </div>

    `;

    return;
  }


  box.innerHTML = `

    <div class="card">

      <h3>
        Gasolineras cercanas
      </h3>

      ${stationSearchResults.map(
        (s, index) => `

          <div class="list-row">

            <div>

              <strong>
                ${escapeHtml(s.name)}
              </strong>

              <small>
                ${
                  escapeHtml(
                    s.address || ''
                  )
                }
              </small>

              <small>
                ${s.distance.toFixed(1)} km
              </small>

            </div>


            <div
              style="
                text-align:right;
                min-width:90px;
              "
            >

              ${
                s.price > 0

                  ? `
                    <strong>
                      ${s.price.toFixed(3)} €/L
                    </strong>
                  `

                  : `
                    <small class="muted">
                      Precio no disponible
                    </small>
                  `
              }


              <br>


              <button
                type="button"
                onclick="selectFuelStation(${index})"
              >
                ${
                  s.price > 0
                    ? 'Usar este precio'
                    : 'Usar estación'
                }
              </button>

            </div>

          </div>

        `
      ).join('')}

    </div>

  `;
}


function findNearbyStations() {

  const status =
    document.getElementById(
      'locationStatus'
    );

  if (status) {
    status.textContent =
      '📍 Obteniendo ubicación...';
  }


  stationSearchResults = [];
  selectedFuelStation = null;


  if (
    !navigator.geolocation
  ) {

    if (status) {
      status.textContent =
        'Este dispositivo no permite obtener la ubicación.';
    }

    toast(
      'La geolocalización no está disponible'
    );

    return;

  }


  getAppPosition(

    async position => {

      currentFuelLocation = {

        lat:
          position.coords.latitude,

        lng:
          position.coords.longitude

      };


      if (status) {
        status.textContent =
          '🔎 Buscando gasolineras cercanas...';
      }


      const fuelType =
        document.querySelector(
          'select[name="fuelType"]'
        )?.value ||
        'diesel';


      try {

        const data =
          await fetchFuelStations();


        const stations =
          extractStations(data);


        stationSearchResults =
          prepareNearbyStations(
            stations,
            currentFuelLocation.lat,
            currentFuelLocation.lng,
            fuelType
          );


        renderStationResults();


        if (status) {

          status.textContent =
            stationSearchResults.length

              ? `📍 ${stationSearchResults.length} gasolineras encontradas`

              : '📍 No hay gasolineras a menos de 25 km';

        }


        if (!stationSearchResults.length) {

          toast(
            'No se han encontrado gasolineras cercanas'
          );

        }

      } catch (error) {

        console.error(
          'Error buscando gasolineras:',
          error
        );


        if (status) {

          status.textContent =
            '⚠️ No se han podido consultar los precios';

        }


        toast(
          'No se han podido consultar las gasolineras'
        );

      }

    },

    error => {

      console.warn(
        'Geolocalización:',
        error
      );


      if (status) {

        if (error.code === 1) {

          status.textContent =
            '⚠️ Permiso de ubicación denegado';

        } else {

          status.textContent =
            '⚠️ No se ha podido obtener tu ubicación';

        }

      }


      if (error.code === 1) {

        toast(
          'Permite la ubicación para buscar gasolineras'
        );

      } else {

        toast(
          'No se ha podido obtener la ubicación'
        );

      }

    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }

  );

}


async function refreshStationFuelType() {

  if (!currentFuelLocation) {
    return;
  }

  const fuelType =
    document.querySelector(
      'select[name="fuelType"]'
    )?.value ||
    'diesel';


  try {

    const data =
      await fetchFuelStations();

    const stations =
      extractStations(data);


    stationSearchResults =
      prepareNearbyStations(
        stations,
        currentFuelLocation.lat,
        currentFuelLocation.lng,
        fuelType
      );


    selectedFuelStation = null;

    renderStationResults();

  } catch (error) {

    console.warn(
      'No se pudo actualizar el combustible:',
      error
    );

  }

}


function selectFuelStation(index) {

  const station =
    stationSearchResults[index];

  if (!station) {
    return;
  }


  selectedFuelStation =
    station;


  const name =
    document.querySelector(
      'input[name="stationName"]'
    );

  const address =
    document.querySelector(
      'input[name="stationAddress"]'
    );

  const price =
    document.querySelector(
      'input[name="price"]'
    );


  if (name) {
    name.value =
      station.name;
  }


  if (address) {
    address.value =
      station.address;
  }


  if (
    price &&
    station.price > 0
  ) {

    price.value =
      station.price.toFixed(3);

  }


  updateFuelAmount();


  renderStationResults();


  toast(
    station.price > 0
      ? `Precio ${station.price.toFixed(3)} €/L seleccionado`
      : 'Gasolinera seleccionada'
  );

}


function updateFuelAmount() {

  const form =
    document.getElementById(
      'fuelForm'
    );

  if (!form) return;


  const liters =
    Number(
      form.elements.liters?.value || 0
    );

  const price =
    Number(
      form.elements.price?.value || 0
    );

  const amount =
    form.elements.amount;


  if (
    amount &&
    liters > 0 &&
    price > 0
  ) {

    amount.value =
      (liters * price).toFixed(2);

  }

}


/* =========================================================
   LAYOUT
========================================================= */

function pageLayout(
  title,
  content,
  back = null
) {

  return `

    <section class="page">

      <div class="page-head">

        <div>

          ${
            back
              ? `
                <button
                  class="ghost"
                  type="button"
                  onclick="${back}"
                >
                  ← Volver
                </button>
              `
              : ''
          }

          <h1>${title}</h1>

        </div>

      </div>

      ${content}

    </section>

  `;
}


/* =========================================================
   INICIO
========================================================= */

function home() {

  const totalFuel =
    db.fuel.reduce(
      (sum, f) =>
        sum + fuelAmount(f),
      0
    );


  const totalMaint =
    db.maint.reduce(
      (sum, m) =>
        sum + Number(m.amount || 0),
      0
    );


  const totalTrips =
    db.trips.length;


  const totalVehicles =
    db.vehicles.length;


  return pageLayout(
    'Inicio',
    `

      <div class="hero">

        <div>

          <h2>ENRUTA</h2>

          <p>
            Gestiona tus vehículos,
            viajes, combustible y mantenimiento.
          </p>

        </div>

      </div>


      <div class="grid stats-grid">

        <div class="card stat">

          <strong>
            ${totalVehicles}
          </strong>

          <span>
            Vehículos
          </span>

        </div>


        <div class="card stat">

          <strong>
            ${totalTrips}
          </strong>

          <span>
            Viajes
          </span>

        </div>


        <div class="card stat">

          <strong>
            ${eur(totalFuel)}
          </strong>

          <span>
            Combustible
          </span>

        </div>


        <div class="card stat">

          <strong>
            ${eur(totalMaint)}
          </strong>

          <span>
            Mantenimiento
          </span>

        </div>

      </div>


      <div class="card">

        <h3>Resumen</h3>

        ${
          db.vehicles.length

            ? db.vehicles
                .map(v => {

                  const consumption =
                    learnedConsumption(v.id);

                  return `

                    <div class="list-row">

                      <div>

                        <strong>
                          ${escapeHtml(
                            v.name ||
                            v.brand ||
                            'Vehículo'
                          )}
                        </strong>

                        <small>
                          ${
                            v.plate
                              ? escapeHtml(v.plate)
                              : ''
                          }
                        </small>

                      </div>


                      <div class="row-right">

                        ${
                          consumption
                            ? `${consumption.toFixed(2)} L/100 km`
                            : 'Sin consumo calculado'
                        }

                      </div>

                    </div>

                  `;

                })
                .join('')

            : `

              <p class="muted">
                Todavía no tienes vehículos registrados.
              </p>

            `
        }

      </div>

    `
  );
}


/* =========================================================
   VEHÍCULOS
========================================================= */

function vehicles() {

  return pageLayout(
    'Vehículos',
    `

      <div class="page-actions">

        <button
          class="primary"
          type="button"
          onclick="vehicleForm()"
        >
          + Nuevo vehículo
        </button>

      </div>


      <div class="stack">

        ${
          db.vehicles.length

            ? db.vehicles
                .map(v => {

                  const consumption =
                    learnedConsumption(v.id);

                  const itv =
                    itvInfo(v);

                  return `

                    <article class="card">

                      <div class="card-head">

                        <div>

                          <h3>
                            ${escapeHtml(
                              v.name ||
                              v.brand ||
                              'Vehículo'
                            )}
                          </h3>

                          <p class="muted">
                            ${escapeHtml(v.brand || '')}
                            ${escapeHtml(v.model || '')}
                          </p>

                          ${
                            v.plate
                              ? `
                                <small>
                                  Matrícula:
                                  ${escapeHtml(v.plate)}
                                </small>
                              `
                              : ''
                          }

                          <small>
                            ITV:
                            ${itv.icon}
                            ${itv.label}
                          </small>

                        </div>


                        <div class="vehicle-icon">
                          🚐
                        </div>

                      </div>


                      ${
                        consumption
                          ? `
                            <p>
                              Consumo:
                              <strong>
                                ${consumption.toFixed(2)}
                                L/100 km
                              </strong>
                            </p>
                          `
                          : ''
                      }


                      <div class="actions">

                        <button
                          type="button"
                          onclick="vehicleDetail('${v.id}')"
                        >
                          Ver ficha
                        </button>


                        <button
                          type="button"
                          onclick="editVehicle('${v.id}')"
                        >
                          ✏️ Editar
                        </button>


                        <button
                          class="danger"
                          type="button"
                          onclick="delVehicle('${v.id}')"
                        >
                          Archivar
                        </button>

                      </div>

                    </article>

                  `;

                })
                .join('')

            : `

              <div class="card empty">

                <h3>
                  No hay vehículos
                </h3>

                <p>
                  Añade tu primer vehículo para empezar.
                </p>

                <button
                  class="primary"
                  type="button"
                  onclick="vehicleForm()"
                >
                  + Añadir vehículo
                </button>

              </div>

            `
        }

      </div>

    `
  );
}


/* =========================================================
   FICHA VEHÍCULO
========================================================= */
function updateVehicleCostPeriod(vehicleId) {

  const fromInput =
    document.getElementById(
      `costFrom-${vehicleId}`
    );

  const toInput =
    document.getElementById(
      `costTo-${vehicleId}`
    );

  const from =
    fromInput?.value || '';

  const to =
    toInput?.value || '';

  const result =
    document.getElementById(
      `costPeriodResult-${vehicleId}`
    );

  if (!result) {
    return;
  }

  if (!from || !to) {

    result.innerHTML = `
      <p class="muted">
        Selecciona las dos fechas para calcular el coste.
      </p>
    `;

    return;
  }

  if (from > to) {

    result.innerHTML = `
      <p class="muted">
        La fecha inicial no puede ser posterior a la fecha final.
      </p>
    `;

    return;
  }

  const fuel =
    db.fuel.filter(f =>
      f.vehicleId === vehicleId &&
      String(f.date || '') >= from &&
      String(f.date || '') <= to
    );

  const maint =
    db.maint.filter(m =>
      m.vehicleId === vehicleId &&
      String(m.date || '') >= from &&
      String(m.date || '') <= to
    );

  const trips =
    db.trips.filter(t =>
      t.vehicleId === vehicleId &&
      String(t.date || '') >= from &&
      String(t.date || '') <= to
    );

  const fuelTotal =
    fuel.reduce(
      (sum, f) =>
        sum + fuelAmount(f),
      0
    );

  const maintTotal =
    maint.reduce(
      (sum, m) =>
        sum + Number(m.amount || 0),
      0
    );

  const tripTotal =
    trips.reduce(
      (sum, t) =>
        sum + Number(t.cost || 0),
      0
    );

  const total =
    fuelTotal +
    maintTotal +
    tripTotal;

  result.innerHTML = `

    <div class="detail-grid">

      <div>
        <span>⛽ Combustible</span>
        <strong>
          ${eur(fuelTotal)}
        </strong>
      </div>

      <div>
        <span>🔧 Mantenimiento</span>
        <strong>
          ${eur(maintTotal)}
        </strong>
      </div>

      <div>
        <span>🚐 Viajes</span>
        <strong>
          ${eur(tripTotal)}
        </strong>
      </div>

      <div>
        <span>💰 Coste total</span>
        <strong>
          ${eur(total)}
        </strong>
      </div>

    </div>

  `;
}
function vehicleDetail(id) {

  const v = vehicle(id);

  if (!v) {
    return render('vehicles');
  }


  currentPage = 'vehicleDetail';
  currentVehicleId = id;


  const fuel =
    db.fuel
      .filter(f => f.vehicleId === id)
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  const maint =
    db.maint
      .filter(m => m.vehicleId === id)
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  const trips =
    db.trips
      .filter(t => t.vehicleId === id)
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  const totalFuel =
    fuel.reduce(
      (sum, f) =>
        sum + fuelAmount(f),
      0
    );


  const totalMaint =
    maint.reduce(
      (sum, m) =>
        sum + Number(m.amount || 0),
      0
    );


  const totalTripCost =
    trips.reduce(
      (sum, t) =>
        sum + Number(t.cost || 0),
      0
    );


  const totalCost =
    totalFuel +
    totalMaint +
    totalTripCost;


  const totalLiters =
    fuel.reduce(
      (sum, f) =>
        sum + fuelLiters(f),
      0
    );


  const totalTripKm =
    trips.reduce(
      (sum, t) =>
        sum + Number(t.km || 0),
      0
    );


  const consumption =
    learnedConsumption(id);


  const itv =
    itvInfo(v);


  const yearly = {};


  fuel.forEach(f => {

    const year =
      String(
        f.date || today()
      ).slice(0, 4);

    yearly[year] =
      (yearly[year] || 0) +
      fuelAmount(f);

  });


  maint.forEach(m => {

    const year =
      String(
        m.date || today()
      ).slice(0, 4);

    yearly[year] =
      (yearly[year] || 0) +
      Number(m.amount || 0);

  });


  trips.forEach(t => {

    const year =
      String(
        t.date || today()
      ).slice(0, 4);

    yearly[year] =
      (yearly[year] || 0) +
      Number(t.cost || 0);

  });


  const years =
    Object.keys(yearly)
      .sort()
      .reverse();


  const html =
    pageLayout(
      escapeHtml(
        v.name ||
        v.brand ||
        'Vehículo'
      ),
      `

        <div class="actions">

          <button
            type="button"
            onclick="editVehicle('${v.id}')"
          >
            ✏️ Editar vehículo
          </button>

        </div>


        <div class="grid stats-grid">

          <div class="card stat">
            <strong>${eur(totalCost)}</strong>
            <span>Coste total</span>
          </div>

          <div class="card stat">
            <strong>${eur(totalFuel)}</strong>
            <span>Combustible</span>
          </div>

          <div class="card stat">
            <strong>${eur(totalMaint)}</strong>
            <span>Mantenimiento</span>
          </div>

          <div class="card stat">
            <strong>${eur(totalTripCost)}</strong>
            <span>Viajes</span>
          </div>

        </div>


        <div class="card">

          <div class="section-head">
        <div class="card">

          <h3>📅 Coste por periodo</h3>

          <p class="muted">
            Consulta cuánto has gastado con este vehículo entre dos fechas.
          </p>

          <div class="detail-grid">

            <label>

              Desde

              <input
                type="date"
                id="costFrom-${v.id}"
                onchange="updateVehicleCostPeriod('${v.id}')"
              >

            </label>


            <label>

              Hasta

              <input
                type="date"
                id="costTo-${v.id}"
                onchange="updateVehicleCostPeriod('${v.id}')"
              >

            </label>

          </div>


          <div
            id="costPeriodResult-${v.id}"
            style="margin-top:16px"
          >

            <p class="muted">
              Selecciona las dos fechas para calcular el coste.
            </p>

          </div>

        </div>
            <div>

              <h3>🔎 ITV</h3>

              <p class="muted">
                ${itv.icon}
                ${itv.label}
              </p>

            </div>

            <button
              type="button"
              onclick="itvForm('${v.id}')"
            >
              ✏️ Editar
            </button>

          </div>


          <div class="detail-grid">

            <div>
              <span>Última ITV</span>
              <strong>
                ${formatDateES(v.itvLast)}
              </strong>
            </div>

            <div>
              <span>Próxima ITV</span>
              <strong>
                ${formatDateES(v.itvNext)}
              </strong>
            </div>

          </div>

        </div>


        <div class="card">

          <h3>Datos del vehículo</h3>

          <div class="detail-grid">

            <div>
              <span>Marca</span>
              <strong>
                ${escapeHtml(v.brand || '-')}
              </strong>
            </div>

            <div>
              <span>Modelo</span>
              <strong>
                ${escapeHtml(v.model || '-')}
              </strong>
            </div>

            <div>
              <span>Matrícula</span>
              <strong>
                ${escapeHtml(v.plate || '-')}
              </strong>
            </div>

            <div>
              <span>Año</span>
              <strong>
                ${escapeHtml(v.year || '-')}
              </strong>
            </div>

            <div>
              <span>Consumo indicado</span>
              <strong>
                ${
                  v.consumption
                    ? `${v.consumption} L/100 km`
                    : '-'
                }
              </strong>
            </div>

            <div>
              <span>Consumo calculado</span>
              <strong>
                ${
                  consumption
                    ? `${consumption.toFixed(2)} L/100 km`
                    : '-'
                }
              </strong>
            </div>

          </div>

        </div>


        <div class="card">

          <h3>Costes por año</h3>

          ${
            years.length
              ? years.map(year => `

                  <div class="list-row">

                    <strong>${year}</strong>

                    <strong>
                      ${eur(yearly[year])}
                    </strong>

                  </div>

                `).join('')
              : `
                <p class="muted">
                  Todavía no hay costes registrados.
                </p>
              `
          }

        </div>


        ${fuelStatsCard(id)}

        ${fuelPriceEvolution(id)}


        <div class="card">

          <h3>Resumen</h3>

          <div class="detail-grid">

            <div>
              <span>Litros repostados</span>
              <strong>
                ${totalLiters.toFixed(1)} L
              </strong>
            </div>

            <div>
              <span>Viajes registrados</span>
              <strong>${trips.length}</strong>
            </div>

            <div>
              <span>Mantenimientos</span>
              <strong>${maint.length}</strong>
            </div>

            <div>
              <span>Km de viajes</span>
              <strong>
                ${totalTripKm.toLocaleString('es-ES')} km
              </strong>
            </div>

          </div>

        </div>


        <div class="card">

          <div class="section-head">

            <h3>Mantenimientos</h3>

            <button
              type="button"
              onclick="maintenanceForm(null, '${v.id}')"
            >
              + Añadir
            </button>

          </div>


          ${
            maint.length
              ? maint.map(m => `

                  <div class="list-row">

                    <div>

                      <strong>
                        ${escapeHtml(
                          m.type ||
                          'Mantenimiento'
                        )}
                      </strong>

                      <small>
                        ${m.date || ''}
                        ${
                          m.km
                            ? ` · ${Number(m.km).toLocaleString('es-ES')} km`
                            : ''
                        }
                      </small>

                      ${
                        m.notes
                          ? `
                            <small>
                              ${escapeHtml(m.notes)}
                            </small>
                          `
                          : ''
                      }

                    </div>

                    <div class="row-actions">

                      <strong>
                        ${eur(m.amount)}
                      </strong>

                      <button
                        type="button"
                        onclick="maintenanceForm('${m.id}')"
                      >
                        ✏️
                      </button>

                      <button
                        class="danger"
                        type="button"
                        onclick="deleteMaintenance('${m.id}')"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                `).join('')
              : `
                <p class="muted">
                  No hay mantenimientos registrados.
                </p>
              `
          }

        </div>


        <div class="card">

          <h3>Repostajes</h3>

          ${
            fuel.length
              ? fuel.map(f => `

                  <div class="list-row">

                    <div>

                      <strong>
                        ${f.date || ''}
                      </strong>

                      <small>
                        ${fuelLiters(f).toFixed(2)} L
                        ${
                          f.km
                            ? ` · ${Number(f.km).toLocaleString('es-ES')} km`
                            : ''
                        }
                      </small>

                      ${
                        f.stationName
                          ? `
                            <small>
                              ⛽
                              ${escapeHtml(f.stationName)}
                            </small>
                          `
                          : ''
                      }

                    </div>

                    <strong>
                      ${eur(fuelAmount(f))}
                    </strong>

                  </div>

                `).join('')
              : `
                <p class="muted">
                  No hay repostajes registrados.
                </p>
              `
          }

        </div>


        <div class="card">

          <h3>Viajes</h3>

          ${
            trips.length
              ? trips.map(t => `

                  <div class="list-row">

                    <div>

                      <strong>
                        ${escapeHtml(
                          t.name ||
                          t.destination ||
                          'Viaje'
                        )}
                      </strong>

                      <small>
                        ${t.date || ''}
                        ${
                          t.km
                            ? ` · ${Number(t.km).toLocaleString('es-ES')} km`
                            : ''
                        }
                      </small>

                    </div>

                    <strong>
                      ${eur(t.cost)}
                    </strong>

                  </div>

                `).join('')
              : `
                <p class="muted">
                  No hay viajes registrados.
                </p>
              `
          }

        </div>

      `,
      "go('vehicles')"
    );


  document.getElementById('app').innerHTML =
    html;

  updateNav('vehicles');
}


/* =========================================================
   FORMULARIO ITV
========================================================= */

function itvForm(id) {

  const v = vehicle(id);

  if (!v) return;


  fullScreenForm(`

    <div class="form-page">

      <div class="form-page-head">

        <button
          type="button"
          class="ghost form-back"
          onclick="closeModal(); vehicleDetail('${v.id}')"
        >
          ← Volver
        </button>

        <div>

          <h1>ITV</h1>

          <p class="muted">
            ${escapeHtml(
              v.name ||
              v.brand ||
              'Vehículo'
            )}
          </p>

        </div>

      </div>


      <form
        id="itvForm"
        class="full-form"
      >

        <label>

          Última ITV

          <input
            type="date"
            name="itvLast"
            value="${escapeAttr(v.itvLast || '')}"
          >

        </label>


        <label>

          Próxima ITV

          <input
            type="date"
            name="itvNext"
            value="${escapeAttr(v.itvNext || '')}"
          >

        </label>


        <div class="card">

          <h3>Estado actual</h3>

          <p class="muted">
            ${itvInfo(v).icon}
            ${itvInfo(v).label}
          </p>

        </div>


        <div class="form-page-actions">

          <button
            type="button"
            class="ghost"
            onclick="closeModal(); vehicleDetail('${v.id}')"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="primary"
          >
            Guardar ITV
          </button>

        </div>

      </form>

    </div>

  `);


  document
    .getElementById('itvForm')
    .addEventListener(
      'submit',
      e => {

        e.preventDefault();

        const fd =
          new FormData(e.target);

        const last =
          fd.get('itvLast') || '';

        const next =
          fd.get('itvNext') || '';

        if (
          last &&
          next &&
          next < last
        ) {

          toast(
            'La próxima ITV no puede ser anterior a la última'
          );

          return;
        }

        v.itvLast = last;
        v.itvNext = next;
        v.updatedAt = Date.now();

        save();

        closeModal();

        toast('ITV actualizada');

        vehicleDetail(v.id);

      }
    );

}


/* =========================================================
   FORMULARIO VEHÍCULO
========================================================= */

function vehicleForm(record = null) {

  const editing = !!record;
  const v = record || {};


  fullScreenForm(`

    <div class="form-page">

      <div class="form-page-head">

        <button
          type="button"
          class="ghost form-back"
          onclick="closeModal()"
        >
          ← Volver
        </button>

        <div>

          <h1>
            ${
              editing
                ? 'Editar vehículo'
                : 'Nuevo vehículo'
            }
          </h1>

          <p class="muted">
            ${
              editing
                ? 'Modifica los datos del vehículo'
                : 'Añade un vehículo a ENRUTA'
            }
          </p>

        </div>

      </div>


      <form
        id="vehicleForm"
        class="full-form"
      >

        <label>
          Nombre

          <input
            name="name"
            value="${escapeAttr(v.name || '')}"
            placeholder="Ej. Autocaravana"
          >
        </label>


        <label>
          Marca

          <input
            name="brand"
            value="${escapeAttr(v.brand || '')}"
          >
        </label>


        <label>
          Modelo

          <input
            name="model"
            value="${escapeAttr(v.model || '')}"
          >
        </label>


        <label>
          Matrícula

          <input
            name="plate"
            value="${escapeAttr(v.plate || '')}"
          >
        </label>


        <label>
          Año

          <input
            type="number"
            name="year"
            value="${escapeAttr(v.year || '')}"
          >
        </label>


        <label>
          Consumo indicado (L/100 km)

          <input
            type="number"
            step="0.01"
            name="consumption"
            value="${escapeAttr(v.consumption || '')}"
          >
        </label>


        <div class="card">

          <h3>ITV</h3>

          <p class="muted">
            Puedes dejar estas fechas vacías
            y añadirlas más adelante.
          </p>


          <label>

            Última ITV

            <input
              type="date"
              name="itvLast"
              value="${escapeAttr(v.itvLast || '')}"
            >

          </label>


          <label>

            Próxima ITV

            <input
              type="date"
              name="itvNext"
              value="${escapeAttr(v.itvNext || '')}"
            >

          </label>

        </div>


        <div class="form-page-actions">

          <button
            type="button"
            class="ghost"
            onclick="closeModal()"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="primary"
          >
            ${
              editing
                ? 'Guardar cambios'
                : 'Guardar vehículo'
            }
          </button>

        </div>

      </form>

    </div>

  `);


  document
    .getElementById('vehicleForm')
    .addEventListener(
      'submit',
      e => {

        e.preventDefault();

        const fd =
          new FormData(e.target);

        const itvLast =
          fd.get('itvLast') || '';

        const itvNext =
          fd.get('itvNext') || '';

        if (
          itvLast &&
          itvNext &&
          itvNext < itvLast
        ) {

          toast(
            'La próxima ITV no puede ser anterior a la última'
          );

          return;
        }

        const data = {

          name:
            fd.get('name').trim(),

          brand:
            fd.get('brand').trim(),

          model:
            fd.get('model').trim(),

          plate:
            fd.get('plate').trim(),

          year:
            fd.get('year'),

          consumption:
            Number(
              fd.get('consumption') || 0
            ),

          itvLast,
          itvNext

        };


        if (editing) {

          Object.assign(v, data);

          toast(
            'Vehículo actualizado'
          );

        } else {

          db.vehicles.push({

            id:
              uid('v_'),

            ...data

          });

          toast(
            'Vehículo añadido'
          );

        }


        save();

        closeModal();


        if (editing) {
          vehicleDetail(v.id);
        } else {
          render('vehicles');
        }

      }
    );

}


function editVehicle(id) {

  const v = vehicle(id);

  if (!v) return;

  vehicleForm(v);
}


function delVehicle(id) {

  const v = vehicle(id);

  if (!v) return;


  if (
    !confirm(
      `¿Archivar "${v.name || v.brand || 'este vehículo'}"?`
    )
  ) {
    return;
  }


  db.vehicles =
    db.vehicles.filter(
      item => item.id !== id
    );


  save();

  toast('Vehículo archivado');

  go('vehicles');
}


/* =========================================================
   REPOSTAJES
========================================================= */

function fuelPage() {

  const list =
    [...db.fuel]
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  return pageLayout(
    'Repostajes',
    `

      <div class="page-actions">

        <button
          class="primary"
          type="button"
          onclick="fuelForm()"
        >
          + Nuevo repostaje
        </button>

      </div>


      ${fuelStatsCard()}

      ${fuelPriceEvolution()}


      <div class="stack">

        ${
          list.length

            ? list
                .map(f => {

                  const v =
                    vehicle(f.vehicleId);

                  return `

                    <article class="card">

                      <div class="list-row">

                        <div>

                          <h3>
                            ${escapeHtml(
                              v?.name ||
                              'Vehículo'
                            )}
                          </h3>

                          <small>
                            ${f.date || ''}
                            ${
                              f.km
                                ? ` · ${Number(f.km).toLocaleString('es-ES')} km`
                                : ''
                            }
                          </small>

                          <p>

                            ${fuelLiters(f).toFixed(2)} L

                            ${
                              f.price
                                ? ` · ${Number(f.price).toFixed(3)} €/L`
                                : ''
                            }

                          </p>


                          ${
                            f.stationName
                              ? `
                                <small>
                                  ⛽
                                  ${escapeHtml(f.stationName)}
                                </small>
                              `
                              : ''
                          }

                        </div>


                        <strong>
                          ${eur(fuelAmount(f))}
                        </strong>

                      </div>


                      <div class="actions">

                        <button
                          type="button"
                          onclick="fuelForm('${f.id}')"
                        >
                          ✏️ Editar
                        </button>


                        <button
                          class="danger"
                          type="button"
                          onclick="deleteFuel('${f.id}')"
                        >
                          🗑️ Borrar
                        </button>

                      </div>

                    </article>

                  `;

                })
                .join('')

            : `

              <div class="card empty">

                <h3>
                  No hay repostajes
                </h3>

              </div>

            `
        }

      </div>

    `
  );
}


/* =========================================================
   FORMULARIO REPOSTAJE
========================================================= */

function fuelForm(id = null) {

  const editing = !!id;


  const record =
    editing
      ? db.fuel.find(f => f.id === id)
      : null;


  const f =
    record || {

      date:
        today(),

      full:
        true,

      fuelType:
        'diesel',

      stationName:
        '',

      stationAddress:
        ''

    };


  stationSearchResults = [];
  currentFuelLocation = null;
  selectedFuelStation = null;


  fullScreenForm(`

    <div class="form-page">

      <div class="form-page-head">

        <button
          type="button"
          class="ghost form-back"
          onclick="closeModal()"
        >
          ← Volver
        </button>


        <div>

          <h1>
            ${
              editing
                ? 'Editar repostaje'
                : 'Nuevo repostaje'
            }
          </h1>

          <p class="muted">
            ${
              editing
                ? 'Modifica los datos del repostaje'
                : 'Registra un nuevo repostaje'
            }
          </p>

        </div>

      </div>


      <form
        id="fuelForm"
        class="full-form"
      >

        <label>

          Vehículo

          <select
            name="vehicleId"
            required
          >

            <option value="">
              Selecciona vehículo
            </option>

            ${db.vehicles.map(v => `

              <option
                value="${v.id}"
                ${v.id === f.vehicleId ? 'selected' : ''}
              >
                ${escapeHtml(
                  v.name ||
                  v.brand ||
                  'Vehículo'
                )}
              </option>

            `).join('')}

          </select>

        </label>


        <label>

          Fecha

          <input
            type="date"
            name="date"
            value="${escapeAttr(f.date || today())}"
            required
          >

        </label>


        <label>

          Kilómetros

          <input
            type="number"
            name="km"
            min="0"
            step="1"
            value="${escapeAttr(f.km ?? '')}"
          >

        </label>


        <label>

          Tipo de combustible

          <select
            name="fuelType"
          >

            <option
              value="diesel"
              ${f.fuelType === 'diesel' ? 'selected' : ''}
            >
              Diésel
            </option>

            <option
              value="gasolina95"
              ${f.fuelType === 'gasolina95' ? 'selected' : ''}
            >
              Gasolina 95
            </option>

            <option
              value="gasolina98"
              ${f.fuelType === 'gasolina98' ? 'selected' : ''}
            >
              Gasolina 98
            </option>

          </select>

        </label>


        <div class="card">

          <h3>
            ⛽ Precio automático
          </h3>

          <p class="muted">
            Busca las estaciones cercanas y
            selecciona una para rellenar
            automáticamente el precio.
          </p>


          <button
            type="button"
            class="primary"
            onclick="findNearbyStations()"
          >
            📍 Buscar gasolineras cercanas
          </button>


          <p
            id="locationStatus"
            class="muted"
          >
            Pulsa el botón para buscar
            gasolineras.
          </p>

        </div>


        <div
          id="stationResults"
        ></div>


        <label>

          Gasolinera

          <input
            type="text"
            name="stationName"
            value="${escapeAttr(f.stationName || '')}"
            placeholder="Opcional"
          >

        </label>


        <label>

          Dirección gasolinera

          <input
            type="text"
            name="stationAddress"
            value="${escapeAttr(f.stationAddress || '')}"
            placeholder="Opcional"
          >

        </label>


        <label>

          Litros

          <input
            type="number"
            name="liters"
            min="0"
            step="0.01"
            value="${escapeAttr(fuelLiters(f) || '')}"
            required
          >

        </label>


        <label>

          Precio por litro

          <input
            type="number"
            name="price"
            min="0"
            step="0.001"
            value="${escapeAttr(f.price || '')}"
          >

        </label>


        <label>

          Importe total

          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            value="${escapeAttr(fuelAmount(f) || '')}"
          >

        </label>


        <label class="check">

          <input
            type="checkbox"
            name="full"
            ${f.full ? 'checked' : ''}
          >

          <span>
            Depósito lleno
          </span>

        </label>


        <div class="form-page-actions">

          <button
            type="button"
            class="ghost"
            onclick="closeModal()"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="primary"
          >
            ${
              editing
                ? 'Guardar cambios'
                : 'Guardar repostaje'
            }
          </button>

        </div>

      </form>

    </div>

  `);


  const form =
    document.getElementById(
      'fuelForm'
    );


  form.addEventListener(
    'input',
    event => {

      if (
        event.target.name === 'liters' ||
        event.target.name === 'price'
      ) {

        updateFuelAmount();

      }

    }
  );


  form.elements.fuelType.addEventListener(
    'change',
    () => {

      if (currentFuelLocation) {
        refreshStationFuelType();
      }

    }
  );


  form.addEventListener(
    'submit',
    e => {

      e.preventDefault();


      const fd =
        new FormData(e.target);


      const liters =
        Number(
          fd.get('liters') || 0
        );


      const price =
        Number(
          fd.get('price') || 0
        );


      let amount =
        Number(
          fd.get('amount') || 0
        );


      if (
        !amount &&
        liters &&
        price
      ) {

        amount =
          liters * price;

      }


      const data = {

        vehicleId:
          fd.get('vehicleId'),

        date:
          fd.get('date'),

        km:
          Number(
            fd.get('km') || 0
          ),

        fuelType:
          fd.get('fuelType') || 'diesel',

        liters,

        price,

        amount,

        full:
          fd.get('full') === 'on',

        stationName:
          fd.get('stationName') || '',

        stationAddress:
          fd.get('stationAddress') || '',

        stationLat:
          selectedFuelStation?.lat ||
          record?.stationLat ||
          '',

        stationLng:
          selectedFuelStation?.lng ||
          record?.stationLng ||
          ''

      };


      if (editing) {

        Object.assign(
          record,
          data
        );

        toast(
          'Repostaje actualizado'
        );

      } else {

        db.fuel.push({

          id:
            uid('f_'),

          ...data

        });

        toast(
          'Repostaje guardado'
        );

      }


      save();

      closeModal();

      render('fuel');

    }
  );

}


function deleteFuel(id) {

  if (
    !confirm(
      '¿Quieres borrar este repostaje?'
    )
  ) {
    return;
  }


  db.fuel =
    db.fuel.filter(
      f => f.id !== id
    );


  save();

  toast(
    'Repostaje borrado'
  );

  render('fuel');
}


/* =========================================================
   MANTENIMIENTO
========================================================= */

function maintenancePage() {

  const list =
    [...db.maint]
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  return pageLayout(
    'Mantenimiento',
    `

      <div class="page-actions">

        <button
          class="primary"
          type="button"
          onclick="maintenanceForm()"
        >
          + Nuevo mantenimiento
        </button>

      </div>


      <div class="stack">

        ${
          list.length

            ? list
                .map(m => {

                  const v =
                    vehicle(m.vehicleId);


                  return `

                    <article class="card">

                      <div class="list-row">

                        <div>

                          <h3>
                            ${escapeHtml(
                              m.type ||
                              'Mantenimiento'
                            )}
                          </h3>

                          <small>
                            ${escapeHtml(
                              v?.name ||
                              'Vehículo'
                            )}
                            · ${m.date || ''}
                          </small>

                          ${
                            m.km
                              ? `
                                <small>
                                  ${Number(m.km).toLocaleString('es-ES')}
                                  km
                                </small>
                              `
                              : ''
                          }

                        </div>


                        <strong>
                          ${eur(m.amount)}
                        </strong>

                      </div>


                      <div class="actions">

                        <button
                          type="button"
                          onclick="maintenanceForm('${m.id}')"
                        >
                          ✏️ Editar
                        </button>


                        <button
                          class="danger"
                          type="button"
                          onclick="deleteMaintenance('${m.id}')"
                        >
                          🗑️ Borrar
                        </button>

                      </div>

                    </article>

                  `;

                })
                .join('')

            : `

              <div class="card empty">

                <h3>
                  No hay mantenimientos
                </h3>

              </div>

            `
        }

      </div>

    `
  );
}


/* =========================================================
   FORMULARIO MANTENIMIENTO
========================================================= */

function maintenanceForm(
  id = null,
  vehicleId = ''
) {

  const editing = !!id;


  const record =
    editing
      ? db.maint.find(m => m.id === id)
      : null;


  const m =
    record || {

      vehicleId,

      date:
        today()

    };


  fullScreenForm(`

    <div class="form-page">

      <div class="form-page-head">

        <button
          type="button"
          class="ghost form-back"
          onclick="closeModal()"
        >
          ← Volver
        </button>


        <div>

          <h1>
            ${
              editing
                ? 'Editar mantenimiento'
                : 'Nuevo mantenimiento'
            }
          </h1>

          <p class="muted">
            ${
              editing
                ? 'Modifica los datos del mantenimiento'
                : 'Registra una intervención o gasto'
            }
          </p>

        </div>

      </div>


      <form
        id="maintenanceForm"
        class="full-form"
      >

        <label>

          Vehículo

          <select
            name="vehicleId"
            required
          >

            <option value="">
              Selecciona vehículo
            </option>

            ${db.vehicles.map(v => `

              <option
                value="${v.id}"
                ${v.id === m.vehicleId ? 'selected' : ''}
              >
                ${escapeHtml(
                  v.name ||
                  v.brand ||
                  'Vehículo'
                )}
              </option>

            `).join('')}

          </select>

        </label>


        <label>

          Tipo de mantenimiento

          <input
            name="type"
            value="${escapeAttr(m.type || '')}"
            placeholder="Ej. Cambio de aceite"
            required
          >

        </label>


        <label>

          Fecha

          <input
            type="date"
            name="date"
            value="${escapeAttr(m.date || today())}"
            required
          >

        </label>


        <label>

          Kilómetros

          <input
            type="number"
            name="km"
            min="0"
            step="1"
            value="${escapeAttr(m.km ?? '')}"
          >

        </label>


        <label>

          Importe

          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            value="${escapeAttr(m.amount || '')}"
          >

        </label>


        <label>

          Notas

          <textarea
            name="notes"
            rows="5"
            placeholder="Observaciones, piezas cambiadas, taller..."
          >${escapeHtml(m.notes || '')}</textarea>

        </label>


        <div class="form-page-actions">

          <button
            type="button"
            class="ghost"
            onclick="closeModal()"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="primary"
          >
            ${
              editing
                ? 'Guardar cambios'
                : 'Guardar mantenimiento'
            }
          </button>

        </div>

      </form>

    </div>

  `);


  document
    .getElementById('maintenanceForm')
    .addEventListener(
      'submit',
      e => {

        e.preventDefault();


        const fd =
          new FormData(e.target);


        const data = {

          vehicleId:
            fd.get('vehicleId'),

          type:
            fd.get('type').trim(),

          date:
            fd.get('date'),

          km:
            Number(
              fd.get('km') || 0
            ),

          amount:
            Number(
              fd.get('amount') || 0
            ),

          notes:
            fd.get('notes').trim()

        };


        if (editing) {

          Object.assign(
            record,
            data
          );

          toast(
            'Mantenimiento actualizado'
          );

        } else {

          db.maint.push({

            id:
              uid('m_'),

            ...data

          });

          toast(
            'Mantenimiento guardado'
          );

        }


        save();

        closeModal();


        if (
          currentPage === 'vehicleDetail' &&
          currentVehicleId
        ) {

          vehicleDetail(
            currentVehicleId
          );

        } else {

          render('maintenance');

        }

      }
    );

}


function deleteMaintenance(id) {

  if (
    !confirm(
      '¿Quieres borrar este mantenimiento?'
    )
  ) {
    return;
  }


  db.maint =
    db.maint.filter(
      m => m.id !== id
    );


  save();

  toast(
    'Mantenimiento borrado'
  );


  if (
    currentPage === 'vehicleDetail' &&
    currentVehicleId
  ) {

    vehicleDetail(
      currentVehicleId
    );

  } else {

    render('maintenance');

  }
}


/* =========================================================
   VIAJES
========================================================= */

function tripsPage() {

  const list =
    [...db.trips]
      .sort((a, b) =>
        String(b.date || '')
          .localeCompare(
            String(a.date || '')
          )
      );


  return pageLayout(
    'Viajes',
    `

      <div class="page-actions">

        <button
          class="primary"
          type="button"
          onclick="tripForm()"
        >
          + Nuevo viaje
        </button>

      </div>


      <div class="stack">

        ${
          list.length

            ? list
                .map(t => {

                  const v =
                    vehicle(t.vehicleId);


                  return `

                    <article class="card">

                      <div class="list-row">

                        <div>

                          <h3>
                            ${escapeHtml(
                              t.name ||
                              t.destination ||
                              'Viaje'
                            )}
                          </h3>

                          <small>
                            ${escapeHtml(
                              v?.name ||
                              'Vehículo'
                            )}
                          </small>

                          <small>
                            ${t.date || ''}
                          </small>


                          ${
                            t.origin ||
                            t.destination
                              ? `
                                <small>

                                  ${
                                    t.origin
                                      ? escapeHtml(t.origin)
                                      : ''
                                  }

                                  ${
                                    t.origin &&
                                    t.destination
                                      ? ' → '
                                      : ''
                                  }

                                  ${
                                    t.destination
                                      ? escapeHtml(t.destination)
                                      : ''
                                  }

                                </small>
                              `
                              : ''
                          }


                          ${
                            t.km
                              ? `
                                <small>
                                  ${Number(t.km).toLocaleString('es-ES')}
                                  km
                                </small>
                              `
                              : ''
                          }

                        </div>


                        <strong>
                          ${eur(t.cost)}
                        </strong>

                      </div>


                      <div class="actions">

                        <button
                          type="button"
                          onclick="tripForm('${t.id}')"
                        >
                          ✏️ Editar
                        </button>


                        <button
                          class="danger"
                          type="button"
                          onclick="deleteTrip('${t.id}')"
                        >
                          🗑️ Borrar
                        </button>

                      </div>

                    </article>

                  `;

                })
                .join('')

            : `

              <div class="card empty">

                <h3>
                  No hay viajes
                </h3>

                <p>
                  Añade tu primer viaje para empezar.
                </p>

              </div>

            `
        }

      </div>

    `
  );
}


/* =========================================================
   FORMULARIO VIAJE
========================================================= */

function tripForm(id = null) {

  const editing = !!id;


  const record =
    editing
      ? db.trips.find(t => t.id === id)
      : null;


  if (
    editing &&
    !record
  ) {

    toast(
      'No se encontró el viaje'
    );

    return;

  }


  const t =
    record || {

      date:
        today(),

      km:
        0,

      cost:
        0

    };


  fullScreenForm(`

    <div class="form-page">

      <div class="form-page-head">

        <button
          type="button"
          class="ghost form-back"
          onclick="closeModal()"
        >
          ← Volver
        </button>


        <div>

          <h1>
            ${
              editing
                ? 'Editar viaje'
                : 'Nuevo viaje'
            }
          </h1>

          <p class="muted">
            ${
              editing
                ? 'Modifica los datos del viaje'
                : 'Registra un nuevo viaje'
            }
          </p>

        </div>

      </div>


      <form
        id="tripForm"
        class="full-form"
      >

        <label>

          Vehículo

          <select
            name="vehicleId"
            required
          >

            <option value="">
              Selecciona vehículo
            </option>

            ${db.vehicles.map(v => `

              <option
                value="${v.id}"
                ${v.id === t.vehicleId ? 'selected' : ''}
              >
                ${escapeHtml(
                  v.name ||
                  v.brand ||
                  'Vehículo'
                )}
              </option>

            `).join('')}

          </select>

        </label>


        <label>

          Nombre del viaje

          <input
            name="name"
            value="${escapeAttr(t.name || '')}"
            placeholder="Ej. Fin de semana en Gredos"
          >

        </label>


        <label>

          Fecha

          <input
            type="date"
            name="date"
            value="${escapeAttr(t.date || today())}"
            required
          >

        </label>


        <label>

          Origen

          <input
            name="origin"
            value="${escapeAttr(t.origin || '')}"
            placeholder="Ej. Toledo"
          >

        </label>


        <label>

          Destino

          <input
            name="destination"
            value="${escapeAttr(t.destination || '')}"
            placeholder="Ej. Poyales del Hoyo"
          >

        </label>


        <label>

          Kilómetros

          <input
            type="number"
            name="km"
            min="0"
            step="1"
            value="${escapeAttr(t.km || '')}"
          >

        </label>


        <label>

          Coste del viaje

          <input
            type="number"
            name="cost"
            min="0"
            step="0.01"
            value="${escapeAttr(t.cost || '')}"
          >

        </label>


        <label>

          Notas

          <textarea
            name="notes"
            rows="5"
            placeholder="Observaciones del viaje..."
          >${escapeHtml(t.notes || '')}</textarea>

        </label>


        <div class="form-page-actions">

          <button
            type="button"
            class="ghost"
            onclick="closeModal()"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="primary"
          >
            ${
              editing
                ? 'Guardar cambios'
                : 'Guardar viaje'
            }
          </button>

        </div>

      </form>

    </div>

  `);


  document
    .getElementById('tripForm')
    .addEventListener(
      'submit',
      e => {

        e.preventDefault();


        const fd =
          new FormData(e.target);


        const data = {

          vehicleId:
            fd.get('vehicleId'),

          name:
            fd.get('name').trim(),

          date:
            fd.get('date'),

          origin:
            fd.get('origin').trim(),

          destination:
            fd.get('destination').trim(),

          km:
            Number(
              fd.get('km') || 0
            ),

          cost:
            Number(
              fd.get('cost') || 0
            ),

          notes:
            fd.get('notes').trim()

        };


        if (editing) {

          Object.assign(
            record,
            data
          );

          save();

          closeModal();

          toast(
            'Viaje actualizado'
          );

          render('trips');

          return;

        }


        db.trips.push({

          id:
            uid('t_'),

          ...data

        });


        save();

        closeModal();

        toast(
          'Viaje guardado'
        );

        render('trips');

      }
    );

}


/* =========================================================
   BORRAR VIAJE
========================================================= */

function deleteTrip(id) {

  const trip =
    db.trips.find(
      t => t.id === id
    );


  if (!trip) return;


  const title =
    trip.name ||
    trip.destination ||
    'este viaje';


  if (
    !confirm(
      `¿Quieres borrar "${title}"?`
    )
  ) {
    return;
  }


  db.trips =
    db.trips.filter(
      t => t.id !== id
    );


  save();

  toast(
    'Viaje borrado'
  );

  render('trips');
}


/* =========================================================
   FORMULARIOS A PANTALLA COMPLETA
========================================================= */

function fullScreenForm(content) {

  closeModal();


  const wrapper =
    document.createElement('div');


  wrapper.className =
    'modal full-screen-form';


  wrapper.innerHTML = `

    <div class="modal-backdrop"></div>


    <div
      class="modal-card full-screen-card"
      role="dialog"
      aria-modal="true"
    >

      ${content}

    </div>

  `;


  document.body.appendChild(
    wrapper
  );


  wrapper
    .querySelector('.modal-backdrop')
    .addEventListener(
      'click',
      closeModal
    );


  wrapper.scrollTop = 0;


  const card =
    wrapper.querySelector(
      '.full-screen-card'
    );


  if (card) {
    card.scrollTop = 0;
  }
}


/* =========================================================
   MÁS
========================================================= */

function more() {

  return pageLayout(
    'Más',
    `

      <div class="stack">


        <div class="card">

          <h3>
            Herramientas
          </h3>

          <p class="muted">
            Utilidades para planificar
            y controlar tus viajes.
          </p>


          <div class="actions">

            <button
              type="button"
              onclick="simulator()"
            >
              🧮 Simulador de viaje
            </button>

          </div>

        </div>


        <div class="card">

          <h3>
            Copias de seguridad
          </h3>

          <p class="muted">
            Guarda una copia de todos
            los datos de ENRUTA.
          </p>


          <div class="actions">

            <button
              type="button"
              onclick="exportData()"
            >
              💾 Exportar datos
            </button>


            <button
              type="button"
              onclick="document.getElementById('importFile').click()"
            >
              📂 Importar datos
            </button>

          </div>


          <input
            id="importFile"
            type="file"
            accept=".json,application/json"
            hidden
          >

        </div>


        <div class="card">

          <h3>
            Datos de ENRUTA
          </h3>


          <div class="list-row">

            <span>
              Vehículos
            </span>

            <strong>
              ${db.vehicles.length}
            </strong>

          </div>


          <div class="list-row">

            <span>
              Repostajes
            </span>

            <strong>
              ${db.fuel.length}
            </strong>

          </div>


          <div class="list-row">

            <span>
              Mantenimientos
            </span>

            <strong>
              ${db.maint.length}
            </strong>

          </div>


          <div class="list-row">

            <span>
              Viajes
            </span>

            <strong>
              ${db.trips.length}
            </strong>

          </div>

        </div>


      </div>

    `
  );
}


/* =========================================================
   EXPORTAR / IMPORTAR
========================================================= */

function exportData() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          db,
          null,
          2
        )
      ],
      {
        type:
          'application/json'
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const a =
    document.createElement('a');


  a.href = url;


  a.download =
    `enruta-backup-${today()}.json`;


  document.body.appendChild(a);


  a.click();


  a.remove();


  URL.revokeObjectURL(
    url
  );


  toast(
    'Copia exportada'
  );
}


document.addEventListener(
  'change',
  event => {

    if (
      event.target.id !==
      'importFile'
    ) {
      return;
    }


    const file =
      event.target.files?.[0];


    if (!file) return;


    const reader =
      new FileReader();


    reader.onload = () => {

      try {

        const imported =
          JSON.parse(
            reader.result
          );


        if (
          !imported ||
          typeof imported !== 'object'
        ) {

          throw new Error(
            'Formato incorrecto'
          );

        }


        db = {

          vehicles:
            Array.isArray(
              imported.vehicles
            )
              ? imported.vehicles
              : [],

          fuel:
            Array.isArray(
              imported.fuel
            )
              ? imported.fuel
              : [],

          trips:
            Array.isArray(
              imported.trips
            )
              ? imported.trips
              : [],

          maint:
            Array.isArray(
              imported.maint
            )
              ? imported.maint
              : []

        };


        migrateData();

        save();


        toast(
          'Datos importados correctamente'
        );


        render(
          'home'
        );


      } catch (error) {

        alert(
          'No se ha podido importar la copia.'
        );

      }

    };


    reader.readAsText(file);

  }
);


/* =========================================================
   SIMULADOR
========================================================= */

function simulator() {

  modal(`

    <h2>
      Simulador de viaje
    </h2>


    <form
      id="simulatorForm"
    >

      <label>

        Vehículo

        <select
          name="vehicleId"
        >

          <option value="">
            Introducir datos manualmente
          </option>

          ${db.vehicles.map(v => `

            <option value="${v.id}">
              ${escapeHtml(
                v.name ||
                v.brand ||
                'Vehículo'
              )}
            </option>

          `).join('')}

        </select>

      </label>


      <label>

        Distancia (km)

        <input
          type="number"
          name="km"
          min="0"
          step="1"
          required
        >

      </label>


      <label>

        Consumo (L/100 km)

        <input
          type="number"
          name="consumption"
          min="0"
          step="0.01"
          required
        >

      </label>


      <label>

        Precio combustible (€/L)

        <input
          type="number"
          name="price"
          min="0"
          step="0.001"
          required
        >

      </label>


      <div id="simulatorResult"></div>


      <div class="modal-actions">

        <button
          type="button"
          class="ghost"
          onclick="closeModal()"
        >
          Cerrar
        </button>


        <button
          type="submit"
          class="primary"
        >
          Calcular
        </button>

      </div>

    </form>

  `);


  const form =
    document.getElementById(
      'simulatorForm'
    );


  const vehicleSelect =
    form.elements.vehicleId;


  const consumptionInput =
    form.elements.consumption;


  const priceInput =
    form.elements.price;


  vehicleSelect.addEventListener(
    'change',
    () => {

      const id =
        vehicleSelect.value;

      if (!id) return;


      const v =
        vehicle(id);


      const learned =
        learnedConsumption(id);


      const stats =
        fuelStatistics(id);


      if (learned) {

        consumptionInput.value =
          learned.toFixed(2);

      } else if (v?.consumption) {

        consumptionInput.value =
          Number(v.consumption).toFixed(2);

      }


      if (stats.averagePrice) {

        priceInput.value =
          stats.averagePrice.toFixed(3);

      }

    }
  );


  form.addEventListener(
    'submit',
    e => {

      e.preventDefault();


      const fd =
        new FormData(e.target);


      const km =
        Number(
          fd.get('km')
        );


      const consumption =
        Number(
          fd.get('consumption')
        );


      const price =
        Number(
          fd.get('price')
        );


      const liters =
        km *
        consumption /
        100;


      const cost =
        liters *
        price;


      document
        .getElementById(
          'simulatorResult'
        )
        .innerHTML = `

          <div class="result-box">

            <strong>
              Resultado
            </strong>

            <p>
              Combustible:
              <strong>
                ${liters.toFixed(1)} L
              </strong>
            </p>

            <p>
              Coste:
              <strong>
                ${eur(cost)}
              </strong>
            </p>

          </div>

        `;

    }
  );

}


/* =========================================================
   MODAL NORMAL
========================================================= */

function modal(content) {

  closeModal();


  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'modal';


  wrapper.innerHTML = `

    <div class="modal-backdrop"></div>


    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
    >

      <button
        class="modal-close"
        type="button"
        aria-label="Cerrar"
      >
        ×
      </button>


      ${content}

    </div>

  `;


  document.body.appendChild(
    wrapper
  );


  wrapper
    .querySelector(
      '.modal-backdrop'
    )
    .addEventListener(
      'click',
      closeModal
    );


  wrapper
    .querySelector(
      '.modal-close'
    )
    .addEventListener(
      'click',
      closeModal
    );
}


/* =========================================================
   NAVEGACIÓN
========================================================= */

let currentPage = 'home';

let currentVehicleId = null;


function render(page) {

  const app =
    document.getElementById(
      'app'
    );


  if (!app) return;


  currentPage =
    page;


  switch (page) {

    case 'home':

      app.innerHTML =
        home();

      break;


    case 'vehicles':

      app.innerHTML =
        vehicles();

      break;


    case 'fuel':

      app.innerHTML =
        fuelPage();

      break;


    case 'trips':

      app.innerHTML =
        tripsPage();

      break;


    case 'maintenance':

      app.innerHTML =
        maintenancePage();

      break;


    case 'more':

      app.innerHTML =
        more();

      break;


    default:

      app.innerHTML =
        home();

      currentPage =
        'home';

      break;

  }


  updateNav(
    currentPage
  );
}


function go(page) {

  closeModal();

  currentVehicleId =
    null;

  render(page);
}


function updateNav(page) {

  document
    .querySelectorAll(
      '#nav button'
    )
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.page === page
      );

    });
}


function openVehicleDetail(id) {
  vehicleDetail(id);
}


/* =========================================================
   NAVEGACIÓN INICIAL
========================================================= */

document
  .querySelectorAll(
    '#nav button'
  )
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        const page =
          button.dataset.page;

        go(page);

      }
    );

  });


/* =========================================================
   INSTALACIÓN PWA
========================================================= */

let deferredPrompt =
  null;


window.addEventListener(
  'beforeinstallprompt',
  event => {

    event.preventDefault();

    deferredPrompt =
      event;


    const install =
      document.getElementById(
        'install'
      );


    if (install) {
      install.hidden =
        false;
    }

  }
);


document
  .getElementById(
    'install'
  )
  ?.addEventListener(
    'click',
    async () => {

      if (!deferredPrompt) {
        return;
      }


      deferredPrompt.prompt();


      await deferredPrompt.userChoice;


      deferredPrompt =
        null;


      const install =
        document.getElementById(
          'install'
        );


      if (install) {
        install.hidden =
          true;
      }

    }
  );


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
  'serviceWorker' in navigator
) {

  window.addEventListener(
    'load',
    () => {

      navigator.serviceWorker
        .register(
          './sw.js'
        )
        .catch(
          error => {

            console.warn(
              'Service Worker:',
              error
            );

          }
        );

    }
  );

}


/* =========================================================
   ESCAPE
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );

}


function escapeAttr(value) {

  return escapeHtml(
    value
  );

}


/* =========================================================
   CERRAR MODALES CON ESC
========================================================= */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'Escape'
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   INICIO
========================================================= */

initSupabaseAuth();
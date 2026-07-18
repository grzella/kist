const views = {
  dashboard: renderDashboard,
  cashflow: renderCashflow,
  control: renderControl,
  allocation: renderAllocation,
  taxes: renderTaxes,
  currency: renderCurrency,
  reminders: renderReminders,
  recs: renderRecs,
  transactions: renderTransactions,
  wealth: renderWealth,
  goals: renderGoals,
  italy: renderItaly,
  career: renderCareer,
  commits: renderCommits,
  offers: renderOffers,
  debts: renderDebts,
  firma: renderFirma,
  market: renderMarket,
  forecasts: renderForecasts,
  rsu: renderRsu,
};

let activeCharts = [];
function destroyCharts() {
  activeCharts.forEach((c) => c.destroy());
  activeCharts = [];
}
function trackChart(c) {
  activeCharts.push(c);
  // TRYB DEMO: maskuj osie wartości (nie kategorie/daty) i wyłącz tooltipy
  try {
    if (typeof demoOn === "function" && demoOn() && c && c.options) {
      c.options.plugins = c.options.plugins || {};
      c.options.plugins.tooltip = { enabled: false };
      if (c.data && c.data.datasets) {
        c.data.datasets.forEach((ds) => {
          if (typeof ds.label === "string") _DEMO_WORDS.forEach(([re, rep]) => { ds.label = ds.label.replace(re, rep); });
        });
      }
      const sc = c.options.scales || {};
      Object.keys(sc).forEach((k) => {
        if (k !== "x" && sc[k]) {
          sc[k].ticks = sc[k].ticks || {};
          sc[k].ticks.callback = () => "▪";
        }
      });
      c.update();
    }
  } catch (e) { console.error("demo chart", e); }
  return c;
}

// TRYB DEMO: maskuj wrażliwe słowa (lokalizacje, nazwisko) w wyrenderowanym DOM
const _DEMO_WORDS = [
  // Add your own sensitive words to mask in demo mode, e.g. [/CityName/g, "City-A"]
];
function maskSensitiveText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => {
    let t = n.nodeValue;
    _DEMO_WORDS.forEach(([re, rep]) => { t = t.replace(re, rep); });
    // maskuj liczby finansowe w wolnym tekście (liczba + jednostka), oszczędzając daty/liczniki
    t = t.replace(/(\d[\d   .,]*\d|\d)[   ]?(zł|zl|PLN|EUR|USD|\$|€|k|tys\.?|mln|mld|%)(?=$|\b|\/|\s|,|\.|\))/g,
      (m, num, unit) => {
        const digits = num.replace(/[^\d]/g, "");
        let s = "";
        for (let i = 0; i < Math.max(1, digits.length); i++) s += (i % 2 === 0 ? "0" : "1");
        s = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return s + (/^[a-zA-Zł]/.test(unit) ? " " + unit : unit);
      });
    if (t !== n.nodeValue) n.nodeValue = t;
  });
}

async function route() {
  const name = (location.hash || "#dashboard").slice(1);
  const fn = views[name] || views.dashboard;
  document.querySelectorAll("#nav a").forEach((a) =>
    a.classList.toggle("active", a.dataset.view === name));
  destroyCharts();
  const banner = document.getElementById("demoBanner");
  if (banner) banner.style.display = demoOn() ? "block" : "none";
  const el = document.getElementById("view");
  el.innerHTML = '<div class="empty">Ładowanie…</div>';
  try {
    await fn(el);
    if (demoOn()) { try { maskSensitiveText(el); } catch (e) { console.error("mask", e); } }
  } catch (e) {
    el.innerHTML = `<div class="card"><b>Błąd:</b> <span class="muted">${e.message}</span></div>`;
  }
}

window.addEventListener("hashchange", route);
route();

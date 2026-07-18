async function renderCurrency(el) {
  const [w, fx] = await Promise.all([
    api.get("/api/wealth/summary").catch(() => ({ items: [] })),
    api.get("/api/fx-analysis").catch(() => ({ pairs: [] }))]);

  const pairs = fx.pairs || [];
  const byPair = {};
  pairs.forEach((p) => { byPair[p.pair] = p; });
  const up = (byPair["USDPLN=X"] || {}).last || 3.79;
  const eu = (byPair["EURUSD=X"] || {}).last || 1.14;
  const ep = (byPair["EURPLN=X"] || {}).last || 4.34;

  // ekspozycja walutowa
  const exp = { PLN: 0, USD: 0, EUR: 0 };
  (w.items || []).forEach((it) => {
    if (["income", "savings"].includes(it.kind)) return;
    const v = it.equity != null ? it.equity : (it.latest_value || 0);
    const n = (it.name || "").toLowerCase();
    if (n.includes("usd") || n.includes("rsu") || n.includes("team")) exp.USD += v;
    else if (n.includes("vwce") || n.includes("eur") || n.includes("świat")) exp.EUR += v;
    else exp.PLN += v;
  });
  const totalExp = exp.PLN + exp.USD + exp.EUR || 1;

  const fxCard = (p) => {
    if (p.error) return `<div class="card"><h3>${p.title}</h3><div class="muted">${p.error}</div></div>`;
    const bt = p.backtest || {};
    const btTxt = bt.status === "ok"
      ? `Skuteczność sygnału (backtest): <b class="${bt.hit_rate >= 65 ? "pos" : bt.hit_rate >= 50 ? "" : "neg"}">${bt.hit_rate}%</b> trafień (n=${bt.n}). Średni ruch kursu po sygnale: ${bt.avg_fwd_move}% <span class="muted">(ujemny = łapiesz blisko skraju, dobrze)</span>.`
      : `Backtest: ${bt.status || "—"}`;
    return `<div class="card">
      <h3 style="margin-top:0">${p.title} <span class="muted" style="font-weight:normal;font-size:.6em">${p.conv}</span></h3>
      <div class="value" style="font-size:1.5em"><b>${fmt.num(p.last, 3)}</b></div>
      <div class="mt" style="padding:6px 10px;border-radius:6px;background:#00000022">
        <b class="${p.vcls}">${p.verdict}</b></div>
      <div class="row mt" style="gap:14px;flex-wrap:wrap;font-size:.82em">
        <span title="pozycja po korzystnej stronie zakresu 52 tyg.">🎯 korzystny poziom: <b>${p.fav_pos}/100</b></span>
        <span>📈 trend: <b>${p.trend}</b></span>
        <span>⚡ mom 30d: <b class="${p.mom30 >= 0 ? "pos" : "neg"}">${p.mom30}%</b></span>
        <span title="wychylenie od 50-sesyjnej średniej">📏 vs SMA50: <b>${p.dist50}%</b></span>
      </div>
      <details class="mt"><summary class="muted" style="cursor:pointer;font-size:.85em">dlaczego (wskaźniki)</summary>
        <ul style="padding-left:16px;font-size:.85em">${p.reasons.map((r) => `<li class="mt">${r}</li>`).join("")}</ul>
      </details>
      <div class="muted mt" style="font-size:.8em">${btTxt}</div>
    </div>`;
  };

  el.innerHTML = `
    <h2>💱 Waluty — ekspozycja, sygnały i asystent konwersji</h2>
    <div class="muted" style="margin-bottom:12px">Kursy odświeżane codziennie (n8n → cache; status w Control → „Kursy rynkowe").
      Sygnał łączy poziom + trend + momentum + wychylenie od średniej — nie tylko „czy blisko szczytu".
      Backtest pokazuje, jak często sygnał faktycznie łapał dobry moment. Vesty w USD, wkład na dom w EUR.</div>

    <div class="card">
      <h3>Ekspozycja walutowa (aktywa)</h3>
      <div class="row" style="gap:24px;flex-wrap:wrap">
        ${Object.entries(exp).map(([c, v]) => `<span>${c}: <b>${fmt.pln(v)}</b>
          <span class="muted">(${Math.round(100 * v / totalExp)}%)</span></span>`).join("")}
      </div>
      <div class="muted mt" style="font-size:.85em">USD głównie z RSU/TEAM + gotówka USD. EUR rośnie z akumulacją pod dom.
        Naturalny hedge: część vestów USD→EUR bezpośrednio na wkład (z pominięciem PLN).</div>
    </div>

    <div class="grid cols-3 mt">${pairs.map(fxCard).join("")}</div>

    <div class="card mt">
      <h3>Asystent konwersji</h3>
      <div class="row" style="flex-wrap:wrap;gap:10px;align-items:flex-end">
        <label class="muted">Kwota<br><input data-num id="cvAmt" value="10 000" style="width:140px"></label>
        <label class="muted">Kierunek<br>
          <select id="cvDir" style="width:220px">
            <option value="USD>PLN">USD → PLN (vest → nadpłata)</option>
            <option value="USD>EUR">USD → EUR (vest → wkład na dom)</option>
            <option value="PLN>EUR">PLN → EUR (wkład na dom)</option>
            <option value="PLN>USD">PLN → USD</option>
          </select></label>
        <button class="primary" id="cvGo">Przelicz</button>
      </div>
      <div id="cvOut" class="mt"></div>
    </div>`;

  function convert() {
    const amt = parseNum(document.getElementById("cvAmt")) || 0;
    const dir = document.getElementById("cvDir").value;
    let out, note, sigPair;
    if (dir === "USD>PLN") { out = amt * up; note = `1 USD = ${fmt.num(up, 3)} PLN`; sigPair = "USDPLN=X"; }
    else if (dir === "USD>EUR") { out = amt / eu; note = `1 USD = ${fmt.num(1 / eu, 4)} EUR (EUR/USD ${fmt.num(eu, 3)})`; sigPair = "EURUSD=X"; }
    else if (dir === "PLN>EUR") { out = amt / ep; note = `1 EUR = ${fmt.num(ep, 3)} PLN`; sigPair = "EURPLN=X"; }
    else { out = amt / up; note = `1 USD = ${fmt.num(up, 3)} PLN`; sigPair = "USDPLN=X"; }
    const cur = dir.split(">")[1];
    const sym = cur === "PLN" ? "zł" : cur === "EUR" ? "€" : "$";
    const sig = byPair[sigPair];
    const sigTxt = sig && (dir === "USD>PLN" || dir === "USD>EUR" || dir === "PLN>EUR")
      ? `<div class="mt" style="font-size:.9em">Sygnał dla tego kierunku: <b class="${sig.vcls}">${sig.verdict}</b></div>` : "";
    document.getElementById("cvOut").innerHTML =
      `<div style="font-size:1.3em"><b>${fmt.grouped(Math.round(out))} ${sym}</b></div>
       ${sigTxt}
       <div class="muted mt" style="font-size:.88em">${note}. Konwertuj przez Wise/XTB (nie PKO, spread 2–4%).</div>`;
  }
  document.getElementById("cvGo").addEventListener("click", convert);
  convert();
}

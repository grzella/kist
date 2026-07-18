async function renderRsu(el) {
  const [r, debtsData, deep, adv] = await Promise.all([
    api.get("/api/rsu"), api.get("/api/debts"),
    api.get("/api/rsu/analysis").catch(() => ({})),
    api.get("/api/rsu/advanced").catch(() => ({}))]);
  const bands = await api.get("/api/forecast/bands/" + encodeURIComponent(r.ticker || "")).catch(() => null);
  const nextVestPln = r.next_vest_value_pln;
  const topDebt = debtsData.debts
    .filter((d) => d.balance > 0)
    .sort((a, b) => (b.effective_rate || 0) - (a.effective_rate || 0))[0];
  const rec = (() => {
    if (!r.last_close) return "Brak kursu — dodaj ticker swojej spółki i USDPLN=X do watchlisty.";
    const parts = [];
    if (nextVestPln) {
      parts.push(`W oknie ${r.next_vest_month} vestuje ${fmt.num(r.shares_next_vest, 0)} akcji ≈ ${fmt.pln(nextVestPln)} przy obecnym kursie.`);
    }
    const loan = debtsData.debts.find((d) => d.name.toLowerCase().includes("loan") && d.balance > 0);
    if (loan && nextVestPln) {
      parts.push(
        `sprzedaż vestu od razu i spłata kredytu — saldo ${fmt.pln(loan.balance)}, ` +
        `czyli ~${Math.ceil(loan.balance / nextVestPln)} vesty do zamknięcia kredytu. Każdy vest w kredyt to gwarantowane ` +
        `${fmt.pct(loan.effective_rate, 2)} + uwolnienie ${fmt.pln(loan.monthly_cost_total)}/mies. i skok zdolności ` +
        `kredytowej pod cel. Po spłacie kredytu vesty idą na wkład własny (kredyt hipoteczny załatwiasz aneksem, nie kapitałem).`);
    } else if (topDebt && topDebt.effective_rate > 6.5 && nextVestPln) {
      parts.push(
        `Kredyt ${topDebt.name} kosztuje ${fmt.pct(topDebt.effective_rate, 2)} efektywnie — sprzedaż vestu i nadpłata ` +
        `to gwarantowany, nieopodatkowany zwrot, pewniejszy niż zakład o odbicie jednej spółki.`);
    } else {
      parts.push(
        "Standardowa zasada przy RSU: sprzedawaj przy veście — podatkowo trzymanie " +
        "nic nie daje (Belka 19% liczy się od zysku PO veście), a trzymając kumulujesz " +
        "ryzyko pracodawcy (pensja + bonus + akcje w jednej firmie).");
    }
    if (r.last_close < 100) {
      parts.push(
        `Niuans: ${r.ticker} ~$${r.last_close} jest blisko wieloletnich dołków — sprzedawanie CAŁOŚCI teraz ` +
        "to realizacja dołka. Kompromis: bieżące vesty sprzedawaj od razu (na nadpłatę), " +
        "istniejące " + fmt.num(r.shares_held, 0) + " akcji trzymaj do odbicia — poduszka na to pozwala.");
    }
    return parts.join(" ");
  })();

  el.innerHTML = `
    <h2>RSU — ${r.ticker}</h2>
    <div class="grid cols-4">
      <div class="card kpi"><div class="label">Posiadane akcje</div>
        <div class="value">${fmt.num(r.shares_held, 0)}</div>
        <div class="sub">${r.held_value_pln ? "≈ " + fmt.pln(r.held_value_pln) + " (" + fmt.usd(r.held_value_usd) + ")" : ""}</div></div>
      <div class="card kpi"><div class="label">Następny vest (${r.next_vest_month})</div>
        <div class="value">+${fmt.num(r.shares_next_vest, 0)}</div>
        <div class="sub">${nextVestPln ? "≈ " + fmt.pln(nextVestPln) + " przy $" + r.last_close : ""}</div></div>
      <div class="card kpi"><div class="label">Po veście łącznie</div>
        <div class="value">${fmt.num(r.shares_after_vest, 0)}</div>
        <div class="sub">${r.after_vest_value_pln ? "≈ " + fmt.pln(r.after_vest_value_pln) : ""}</div></div>
      <div class="card kpi"><div class="label">Kurs / USDPLN</div>
        <div class="value">${r.last_close ? "$" + r.last_close : "—"}</div>
        <div class="sub">zamknięcie ${r.last_close_date || "—"} · USD/PLN ${r.usdpln ? fmt.num(r.usdpln, 3) : "—"} (${r.usdpln_date || "—"})<br>
          nowe kursy codziennie ~22:35 (n8n) · sync: ${r.cache_synced ? r.cache_synced.slice(0, 16).replace("T", " ") : "—"}</div></div>
    </div>
    <div class="card mt" style="border-left:4px solid #ffd166">
      <h3 style="margin-top:0">💡 Rekomendacja</h3>
      <div>${rec}</div>
    </div>
    ${deep.headline ? `<div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">🔬 Analiza pogłębiona — vest ${deep.vest_month}
        <span class="muted" style="font-weight:normal;font-size:.75em">(stan na ${deep.as_of}, kurs $${deep.price})</span></h3>
      <div><b>${deep.headline}</b></div>
      ${(deep.sections || []).map((s) => `<details class="mt" ${s === deep.sections[0] ? "open" : ""}>
        <summary style="cursor:pointer"><b>${s.title}</b></summary>
        <div class="mt" style="font-size:.93em">${s.text}</div>
      </details>`).join("")}
      <div class="muted mt" style="font-size:.8em">Snapshot z researchu (wyniki, guidance, targety analityków) —
        nie liczy się automatycznie. Odświeżenie: poproś Claude „odśwież analizę vestu".
        ${(deep.sources || []).length ? `Źródła: ${deep.sources.map((u, i) => `<a href="${u}" target="_blank">[${i + 1}]</a>`).join(" ")}` : ""}</div>
    </div>` : ""}
    ${bands && bands.horizons ? `<div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">📏 Krótki horyzont — zakres, nie kierunek
        <span class="muted" style="font-weight:normal;font-size:.7em">(kierunku pojedynczej akcji nie da się przewidzieć — zarządzamy ryzykiem, nie timingiem)</span></h3>
      <table><thead><tr><th>Okno</th><th>Pesymistycznie (p10)</th><th>Środek</th><th>Optymistycznie (p90)</th><th>Model</th></tr></thead>
      <tbody>${bands.horizons.map((h) => `<tr>
        <td>${h.days === 5 ? "1 tydzień" : h.days === 21 ? "1 miesiąc" : "3 miesiące"}</td>
        <td class="neg">$${fmt.num(h.p10, 2)}</td><td><b>$${fmt.num(h.p50, 2)}</b></td>
        <td class="pos">$${fmt.num(h.p90, 2)}</td>
        <td class="muted" style="font-size:.8em">${h.calibrated ? "🧠 " : ""}${h.source}</td>
      </tr>`).join("")}</tbody></table>
      <div class="muted mt" style="font-size:.82em">EWMA (λ=0.94) + kwantyle realnych ruchów; 🧠 = pasmo skalibrowane
        na własnych rozliczonych prognozach modelu (samouczenie).
        ${bands.coverage ? `Historyczne pokrycie pasma 1M: <b>${bands.coverage.band_coverage_pct}%</b> (cel ~80%).` : ""}</div>
    </div>` : ""}
    ${adv && !adv.error ? `<div class="card mt">
      <h3 style="margin-top:0">📈 Predykcja probabilistyczna — Monte Carlo (${fmt.grouped(adv.sims)} ścieżek)</h3>
      <div class="grid cols-4">
        <div class="card kpi"><div class="label">Zmienność roczna</div>
          <div class="value">${adv.vol_annual_pct}%</div>
          <div class="sub">z realnych notowań (400 sesji) · dryf hist. ${adv.hist_drift_annual_pct != null ? adv.hist_drift_annual_pct + "%" : "—"}</div></div>
        <div class="card kpi"><div class="label">Pozycja w zakresie 52 tyg.</div>
          <div class="value">${adv.pos_in_52w_pct}%</div>
          <div class="sub">$${adv.low_52w}–$${adv.high_52w} · ${adv.trend}</div></div>
        <div class="card kpi"><div class="label">P(kurs ≥ dziś za rok)</div>
          <div class="value ${adv.prob_above_current_1y_pct >= 50 ? "pos" : "neg"}">${adv.prob_above_current_1y_pct}%</div>
          <div class="sub">przy dryfie ${adv.drift_annual_pct}%/rok i tej zmienności</div></div>
        <div class="card kpi"><div class="label">Konsensus analityków</div>
          <div class="value">$${adv.analyst.mid}</div>
          <div class="sub">zakres $${adv.analyst.bear}–$${adv.analyst.bull} · dziś $${adv.last_close}</div></div>
      </div>
      <canvas id="rsuCone" height="110" class="mt"></canvas>
      <div class="muted mt" style="font-size:.85em">Pasmo = rozkład wartości posiadanych + zwestowanych akcji (baza, bez uwzględnienia rosnących grantów)
        z ${fmt.grouped(adv.sims)} symulacji ruchu kursu (GBM na realnej zmienności ${adv.vol_annual_pct}%). Ciemna linia = mediana (p50);
        pasmo = p10–p90. Przerywana = ścieżka do konsensusu analityków $${adv.analyst.mid} (widok fundamentalny, 12 mies.).
        USD/PLN ${fmt.num(adv.usdpln, 2)}. Wartości brutto — Belka 19% od zysku po veście (≈0 przy sprzedaży od razu).</div>
      <table class="mt"><thead><tr><th>Okno</th><th>Akcji (baza)</th>
        <th>Pesym. p10</th><th>Mediana p50</th><th>Optym. p90</th><th>Konsensus analit.</th></tr></thead>
      <tbody>${adv.projection.map((p) => `<tr>
        <td>${p.month}</td><td>${fmt.num(p.shares_base, 0)}</td>
        <td class="neg">${fmt.pln(p.p10)} <span class="muted">($${p.p10_price})</span></td>
        <td><b>${fmt.pln(p.p50)}</b> <span class="muted">($${p.p50_price})</span></td>
        <td class="pos">${fmt.pln(p.p90)} <span class="muted">($${p.p90_price})</span></td>
        <td class="muted">${fmt.pln(p.mid_analyst)}</td>
      </tr>`).join("")}</tbody></table>
    </div>

    ${adv.accuracy && adv.accuracy.backtest && adv.accuracy.backtest.h21 ? (() => {
      const bt = adv.accuracy.backtest, lv = adv.accuracy.live;
      const covCls = (c) => c >= 72 ? "pos" : c >= 55 ? "" : "neg";
      const btRow = (h) => h ? `<tr><td>${h.horizon_days === 21 ? "~1 mies." : "~3 mies."}</td>
        <td class="${covCls(h.band_coverage_pct)}"><b>${h.band_coverage_pct}%</b> <span class="muted">(ideał ~80%)</span></td>
        <td>${h.directional_pct}%</td><td>${h.median_abs_err_pct}%</td><td class="muted">${h.n}</td></tr>` : "";
      return `<div class="card mt" style="border-left:4px solid #ffd166">
      <h3 style="margin-top:0">🎯 Skuteczność mojej predykcji (uczę się na danych)</h3>
      <div class="muted" style="font-size:.88em;margin-bottom:8px">Codziennie pobieram kurs akcji i sprawdzam,
        jak trafne były pasma. „Kalibracja\" = jak często realny kurs wpadł w moje pasmo p10–p90 (ideał ~80%).
        Przy zmienności ${adv.vol_annual_pct}% krótkoterminowy ruch jest prawie losowy — dlatego uczciwą miarą jest kalibracja, nie „trafienie w cenę\".</div>
      <table><thead><tr><th>Horyzont</th><th>Kalibracja pasma</th><th>Kierunek OK</th><th>Błąd mediany</th><th>Próbek</th></tr></thead>
        <tbody>${btRow(bt.h21)}${btRow(bt.h63)}</tbody></table>
      <div class="mt" style="font-size:.9em;padding:8px 12px;background:#00000022;border-radius:6px">
        <b>Wniosek z backtestu (${bt.source}):</b> pasma trafiały ${bt.h21.band_coverage_pct}% zamiast ~80% —
        czyli <b>zbyt wąskie</b>; realne ruchy kursu były większe. Dryf realny w tym okresie: <b class="neg">${bt.realized_drift_pct}%/rok</b>
        vs założony <b>+${bt.assumed_drift_pct}%</b> — kurs mocno spadał, więc kierunek mediany był często mylny.
        <b>Traktuj pasmo p10–p90 jako optymistyczne (węższe niż realne ryzyko).</b> To wzmacnia rekomendację: sprzedawaj przy veście, nie zakładaj odbicia.</div>
      <div class="muted mt" style="font-size:.82em">📡 Track-record na żywo:
        ${lv.scored ? `${lv.scored} ocenionych od ${lv.tracked_since} — kalibracja ${lv.band_coverage_pct}%, kierunek ${lv.directional_pct}%.`
          : `zbieram od ${lv.tracked_since || "dziś"} (${lv.predictions_made} prognoz zapisanych, pierwsze oceny za ~1 tydzień).`}</div>
    </div>`; })() : ""}

` : ""}
    <div class="card mt">
      <h3>Nowy grant ${r.grant_month} (wycena: średnia ${r.pricing_window})</h3>
      <div class="row">
        <span class="muted">Średnia okna (${r.window_days_counted} sesji):</span>
        <b>${r.window_running_average ? fmt.usd(r.window_running_average) : "jeszcze brak danych"}</b>
        <span class="muted">· prognozowane akcje z grantu ${fmt.usd(r.grant_value_usd)}:</span>
        <b>${r.projected_shares ?? (r.estimate_from_last_close ? "~" + r.estimate_from_last_close : "—")}</b>
        <span class="muted">· transza kwartalna: ${r.shares_per_vest ?? "—"} szt.</span>
      </div>
    </div>
    <div class="card mt">
      <h3>Parametry</h3>
      <div class="row">
        <input type="number" id="rHeld" value="${r.shares_held}" title="posiadane akcje" style="width:110px">
        <input type="number" id="rNext" value="${r.shares_next_vest}" title="akcje w następnym veście" style="width:110px">
        <input data-num id="rGrant" value="${fmt.grouped(r.grant_value_usd)}" title="wartość grantu USD">
        <input id="rWindow" value="${r.pricing_window}" title="okno wyceny YYYY-MM" style="width:110px">
        <button class="primary" id="rSave">Zapisz</button>
      </div>
      <div class="muted mt">posiadane · następny vest · wartość grantu USD · okno wyceny.
        Po każdym veście zaktualizuj "posiadane" (i pozycję akcji RSU w Majątku).</div>
    </div>`;

  if (adv && !adv.error && document.getElementById("rsuCone")) {
    const pj = adv.projection;
    trackChart(new Chart(document.getElementById("rsuCone"), {
      type: "line",
      data: {
        labels: pj.map((p) => p.month),
        datasets: [
          { label: "p90 (optymistycznie)", data: pj.map((p) => p.p90),
            borderColor: "transparent", backgroundColor: "rgba(62,207,142,0.13)",
            fill: "+1", pointRadius: 0, tension: 0.2 },
          { label: "p10 (pesymistycznie)", data: pj.map((p) => p.p10),
            borderColor: "transparent", backgroundColor: "transparent",
            fill: false, pointRadius: 0, tension: 0.2 },
          { label: "Mediana (p50)", data: pj.map((p) => p.p50),
            borderColor: CHART_COLORS[0], backgroundColor: "transparent",
            borderWidth: 3, pointRadius: 3, tension: 0.2 },
          { label: "Konsensus analityków ($" + adv.analyst.mid + ")", data: pj.map((p) => p.mid_analyst),
            borderColor: CHART_COLORS[1], backgroundColor: "transparent",
            borderDash: [6, 4], pointRadius: 0, tension: 0.2 },
        ],
      },
      options: { plugins: { legend: { labels: { filter: (i) => !i.text.startsWith("p10") } } },
        scales: { y: { ticks: { callback: (v) => (v / 1000) + "k" } } } },
    }));
  }

  document.getElementById("rSave").addEventListener("click", async () => {
    await api.put("/api/rsu", {
      shares_held: +document.getElementById("rHeld").value,
      shares_next_vest: +document.getElementById("rNext").value,
      grant_value_usd: parseNum(document.getElementById("rGrant")),
      pricing_window: document.getElementById("rWindow").value,
    });
    route();
  });
}

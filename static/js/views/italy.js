async function renderItaly(el) {
  const [a, goals, eurplnRes] = await Promise.all([
    api.get("/api/analysis/italy_location").catch(() => ({})),
    api.get("/api/goals").catch(() => []),
    api.get("/api/market/analytics/EURPLN=X").catch(() => ({}))]);
  const eurpln = eurplnRes.last_close || 4.34;

  if (!a.headline) {
    el.innerHTML = '<div class="card"><h2>Włochy — analiza lokalizacji</h2>'
      + '<div class="muted">Brak zapisanej analizy. Poproś Claude: „odśwież analizę lokalizacji Włochy".</div></div>';
    return;
  }

  const italyGoal = (goals || []).find((g) => /wło|italy|garda/i.test(g.name));
  const dots = (n) => '<span style="letter-spacing:2px">'
    + "●".repeat(n) + '<span class="muted">' + "○".repeat(5 - n) + "</span></span>";
  const scoreColor = (n) => n >= 5 ? "pos" : n >= 4 ? "" : n >= 3 ? "muted" : "neg";

  // weighted total per location
  const weighted = (loc) => {
    let sum = 0, w = 0;
    a.criteria.forEach((c) => { sum += (loc.scores[c.key] || 0) * c.weight; w += c.weight * 5; });
    return Math.round((sum / w) * 100);
  };
  const ranked = [...a.locations].map((l) => ({ ...l, total: weighted(l) }))
    .sort((x, y) => y.total - x.total);

  const critHead = a.criteria.map((c) => `<th style="text-align:center">${c.label}</th>`).join("");

  el.innerHTML = `
    <div class="muted" style="margin-bottom:4px"><a href="#goals" style="text-decoration:none">← Cele</a></div>
    <h2>🇮🇹🇪🇸 Dom za granicą — Włochy vs Andaluzja</h2>
    <div class="card" style="border-left:4px solid #3ecf8e">
      <div style="font-size:1.05em"><b>${a.headline}</b></div>
      <div class="muted mt" style="font-size:.85em">Stan na ${a.as_of} · budżet celu ${fmt.eur ? fmt.eur(a.budget_eur) : "€" + fmt.grouped(a.budget_eur)}
        ${italyGoal ? ` · postęp celu: ${fmt.pln(italyGoal.current_amount)} / ${fmt.pln(italyGoal.target_amount)}` : ""}</div>
    </div>

    ${a.country_comparison ? `<div class="card mt" style="border-left:4px solid #e0a458">
      <h3 style="margin-top:0">🇮🇹 vs 🇪🇸 Włochy czy Andaluzja? — porównanie przy budżecie 400 k €</h3>
      <div style="font-size:1.0em"><b>${a.country_comparison.headline}</b></div>
      <div style="overflow-x:auto" class="mt"><table>
        <thead><tr><th>Kryterium</th><th>🇮🇹 Włochy</th><th>🇪🇸 Andaluzja</th></tr></thead>
        <tbody>${a.country_comparison.dimensions.map((d) => `<tr>
          <td><b>${d.label}</b></td>
          <td style="font-size:.88em;${d.winner === "italy" ? "background:rgba(62,207,142,0.10)" : ""}">${d.italy}${d.winner === "italy" ? ' <span class="pos">✓</span>' : ""}</td>
          <td style="font-size:.88em;${d.winner === "spain" ? "background:rgba(62,207,142,0.10)" : ""}">${d.spain}${d.winner === "spain" ? ' <span class="pos">✓</span>' : ""}</td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="mt" style="padding:8px 12px;background:#00000022;border-radius:6px;font-size:.92em">
        <b>Werdykt:</b> ${a.country_comparison.verdict}</div>
      <div class="muted mt" style="font-size:.88em"><b>Gdzie w Andaluzji:</b> ${a.country_comparison.spain_pick}</div>
    </div>` : ""}

    <div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">🧮 Kalkulator zakupu — realny koszt i bilans</h3>
      <div class="row" style="align-items:center;gap:10px;margin-bottom:8px">
        <b>Kraj:</b>
        <select id="icCountry" style="width:220px">
          <option value="italy">🇮🇹 Włochy (Puglia/Liguria)</option>
          <option value="spain">🇪🇸 Hiszpania (Andaluzja)</option>
        </select>
        <span class="muted" style="font-size:.82em">podstawia koszty transakcyjne, podatek najmu, oprocentowanie, wkład i koszty utrzymania dla wybranego kraju</span>
      </div>
      <div class="muted" style="font-size:.85em;margin-bottom:8px">Liczy się na żywo. EUR/PLN ${fmt.num(eurpln, 3)} (z Rynku).
        Wszystko w € (przeliczenie PLN obok). Zmiany zapisują się w przeglądarce.</div>
      <div id="icInputs" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"></div>
      <div id="icOut" class="mt"></div>
    </div>

    <div class="card mt">
      <h3>Porównanie — ranking wg Twoich kryteriów</h3>
      <div class="muted" style="margin-bottom:8px;font-size:.85em">Waga kryteriów:
        ${a.criteria.map((c) => `${c.label} ×${c.weight}`).join(" · ")}. Ocena 1–5 (● pełne).</div>
      <div style="overflow-x:auto">
      <table>
        <thead><tr><th>Lokalizacja</th><th style="text-align:center">Wynik</th>${critHead}<th style="text-align:right">€/m²</th></tr></thead>
        <tbody>
        ${ranked.map((l, i) => `<tr>
          <td><b>${i === 0 ? "🏆 " : ""}${l.name}</b><div class="muted" style="font-size:.8em">${l.region}</div></td>
          <td style="text-align:center"><b class="${l.total >= 85 ? "pos" : l.total >= 70 ? "" : "muted"}">${l.total}</b></td>
          ${a.criteria.map((c) => `<td style="text-align:center" class="${scoreColor(l.scores[c.key])}">${dots(l.scores[c.key])}</td>`).join("")}
          <td style="text-align:right;white-space:nowrap">${l.price_m2}</td>
        </tr>`).join("")}
        </tbody>
      </table>
      </div>
    </div>

    <div class="grid cols-2 mt">
      ${ranked.map((l) => `<div class="card" ${l.verdict.startsWith("★") ? 'style="border-left:4px solid #3ecf8e"' : ""}>
        <h3 style="margin-top:0">${l.name} <span class="muted" style="font-weight:normal;font-size:.7em">${l.region}</span></h3>
        <div style="font-size:.92em"><b>🌊 Morze:</b> ${l.water}</div>
        ${l.house ? `<div class="mt" style="font-size:.92em"><b>🏡 Dom+działka:</b> ${l.house}</div>` : ""}
        ${l.solar ? `<div class="mt" style="font-size:.92em"><b>☀️ Słońce/PV:</b> ${l.solar}</div>` : ""}
        <div class="mt" style="font-size:.92em"><b>📅 Wynajem:</b> ${l.rental}</div>
        <div class="mt" style="font-size:.92em"><b>💶 Wejście:</b> ${l.entry}</div>
        <div class="mt" style="font-size:.9em;padding:6px 10px;background:#00000022;border-radius:6px">
          <b>${l.verdict}</b></div>
      </div>`).join("")}
    </div>

    ${a.house_vs_apartment ? `<div class="card mt" style="border-left:4px solid #3ecf8e">
      <h3 style="margin-top:0">🏡 Dom z działką vs mieszkanie</h3>
      <div style="font-size:1.0em"><b>${a.house_vs_apartment.headline}</b></div>
      <ul style="padding-left:18px">${a.house_vs_apartment.points.map((p) => `<li class="mt" style="font-size:.92em">${p}</li>`).join("")}</ul>
    </div>` : ""}

    ${a.energy_pv ? `<div class="card mt" style="border-left:4px solid #ffd166">
      <h3 style="margin-top:0">☀️ Fotowoltaika, bateria, wallbox — energetyczna niezależność</h3>
      <div style="font-size:1.0em"><b>${a.energy_pv.headline}</b></div>
      <ul style="padding-left:18px">${a.energy_pv.points.map((p) => `<li class="mt" style="font-size:.92em">${p}</li>`).join("")}</ul>
    </div>` : ""}

    ${a.budget_realism ? `<div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">💶 Czy 400 000 € to realny budżet?</h3>
      <div style="font-size:1.02em"><b>${a.budget_realism.headline}</b></div>
      <ul style="padding-left:18px">${a.budget_realism.points.map((p) => `<li class="mt" style="font-size:.92em">${p}</li>`).join("")}</ul>
      <div class="mt" style="font-size:.9em;padding:8px 12px;background:#00000022;border-radius:6px">
        ⚠️ ${a.budget_realism.cash_warning}</div>
    </div>` : ""}

    <div class="card mt" style="border-left:4px solid #ffd166">
      <h3 style="margin-top:0">✅ Rekomendacja: ${a.recommendation.pick}</h3>
      <ul style="padding-left:18px">${a.recommendation.why.map((w) => `<li class="mt">${w}</li>`).join("")}</ul>
      <div class="mt muted"><b>Alternatywa:</b> ${a.recommendation.runner_up}</div>
    </div>

    <div class="grid cols-2 mt">
      <div class="card">
        <h3>💶 Finansowanie — plan dla ${fmt.eur ? fmt.eur(a.budget_eur) : "€" + fmt.grouped(a.budget_eur)}</h3>
        <table>${Object.entries({
          "Cena": a.financing.plan_400k.cena,
          "Wkład 50%": a.financing.plan_400k.wklad_50pct,
          "Kredyt EUR": a.financing.plan_400k.kredyt_eur,
          "Rata": a.financing.plan_400k.rata_ok,
          "Koszty dodatkowe": a.financing.plan_400k.koszty_dod,
        }).map(([k, v]) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`).join("")}</table>
        <div class="muted mt" style="font-size:.82em">${a.financing.note}</div>
        ${a.financing.cash_vs_equity_capacity ? `<div class="mt" style="font-size:.86em;padding:8px 12px;background:#00000022;border-radius:6px">
          <b>💡 Zdolność kredytowa a 50% cash:</b> ${a.financing.cash_vs_equity_capacity}</div>` : ""}
      </div>
      <div class="card">
        <h3>🧭 Kolejne kroki</h3>
        <ol style="padding-left:18px">${a.next_steps.map((s) => `<li class="mt" style="font-size:.92em">${s}</li>`).join("")}</ol>
      </div>
    </div>

    <div class="card mt muted" style="font-size:.8em">
      Analiza z researchu rynkowego (ceny, yieldy, warunki kredytu, mariny) — snapshot, nie liczy się automatycznie.
      Odświeżenie: poproś Claude „odśwież analizę Włoch".
      Źródła: ${a.sources.map((u, i) => `<a href="${u}" target="_blank">[${i + 1}]</a>`).join(" ")}
    </div>`;

  // ---- kalkulator zakupu ----
  const FIELDS = [
    ["price", "Cena domu (€)", 400000], ["down", "Wkład (%)", 50],
    ["rate", "Oprocent. EUR (%)", 3.4], ["years", "Okres (lata)", 20],
    ["rentGross", "Najem brutto (€/rok)", 8000], ["rentTax", "Podatek najmu (%)", 21],
    ["he", "HomeExchange (€/rok)", 2500], ["energy", "Oszczędn. PV (€/rok)", 1500],
    ["costs", "Koszty roczne (€)", 6000], ["pv", "Instalacja PV+bateria (€)", 20000],
    ["trans", "Koszty transakcyjne (%)", 11], ["mgmt", "Zarządzanie najmem (%)", 15],
  ];
  // country presets — koszty transakcyjne, podatek najmu, oprocentowanie, wkład, koszty utrzymania
  const PRESETS = {
    italy: { trans: 11, rentTax: 21, rate: 3.4, down: 50, costs: 6000 },
    spain: { trans: 11, rentTax: 19, rate: 3.1, down: 35, costs: 5000 },
  };
  const saved = JSON.parse(localStorage.getItem("italyCalc") || "{}");
  const savedCountry = localStorage.getItem("italyCalcCountry") || "italy";
  document.getElementById("icCountry").value = savedCountry;
  const inputsEl = document.getElementById("icInputs");
  inputsEl.innerHTML = FIELDS.map(([k, label, def]) =>
    `<label class="muted" style="font-size:.82em">${label}<br>
      <input data-num data-ic="${k}" value="${fmt.grouped(saved[k] != null ? saved[k] : def)}" style="width:100%"></label>`).join("");

  document.getElementById("icCountry").addEventListener("change", (e) => {
    const p = PRESETS[e.target.value] || PRESETS.italy;
    localStorage.setItem("italyCalcCountry", e.target.value);
    Object.entries(p).forEach(([k, v]) => {
      const inp = inputsEl.querySelector(`[data-ic="${k}"]`);
      if (inp) inp.value = fmt.grouped(v);
    });
    compute();
  });

  const goalTarget = italyGoal ? italyGoal.target_amount : 0;
  const pln = (e) => fmt.pln(Math.round(e * eurpln));

  function compute() {
    const v = {};
    FIELDS.forEach(([k]) => { v[k] = parseNum(inputsEl.querySelector(`[data-ic="${k}"]`)) || 0; });
    localStorage.setItem("italyCalc", JSON.stringify(v));
    const loan = v.price * (1 - v.down / 100);
    const r = v.rate / 100 / 12, n = v.years * 12;
    const rata = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
    const transaction = v.price * v.trans / 100;
    const cashStart = v.price * v.down / 100 + transaction + v.pv;
    const mgmtCost = v.rentGross * v.mgmt / 100;
    const rentNet = v.rentGross * (1 - v.rentTax / 100) - mgmtCost;
    const annualIn = rentNet + v.he + v.energy;
    const annualOut = rata * 12 + v.costs;
    const net = annualIn - annualOut;
    const yieldBrutto = v.price ? v.rentGross / v.price * 100 : 0;
    const yieldNetto = v.price ? rentNet / v.price * 100 : 0;
    const cashStartPln = Math.round(cashStart * eurpln);

    const line = (k, val, cls) => `<tr><td>${k}</td><td style="text-align:right" class="${cls || ""}"><b>${val}</b></td></tr>`;
    document.getElementById("icOut").innerHTML = `
      <div class="grid cols-2">
        <div class="card" style="margin:0">
          <h4 style="margin:0 0 6px">Kredyt i gotówka na start</h4>
          <table>
            ${line("Kredyt EUR", "€" + fmt.grouped(Math.round(loan)) + " · " + pln(loan))}
            ${line("Rata miesięczna", "€" + fmt.grouped(Math.round(rata)) + " · " + pln(rata))}
            ${line("Koszty transakcyjne", "€" + fmt.grouped(Math.round(transaction)))}
            ${line("Gotówka na start (wkład+koszty+PV)", "€" + fmt.grouped(Math.round(cashStart)) + " · " + fmt.pln(cashStartPln), "neg")}
          </table>
          <div class="muted mt" style="font-size:.82em">Cel wkładu w app: ${fmt.pln(goalTarget)} (pokrywa sam wkład 50%).
            Realnie na start potrzeba ${fmt.pln(cashStartPln)} — różnica ${fmt.pln(cashStartPln - goalTarget)} to koszty transakcyjne + PV.</div>
        </div>
        <div class="card" style="margin:0">
          <h4 style="margin:0 0 6px">Bilans roczny (po wszystkich przychodach)</h4>
          <table>
            ${line("Najem netto (po podatku i zarządzaniu)", "€" + fmt.grouped(Math.round(rentNet)), "pos")}
            ${line("+ HomeExchange (uniknięte noclegi)", "€" + fmt.grouped(Math.round(v.he)), "pos")}
            ${line("+ Oszczędność energii (PV)", "€" + fmt.grouped(Math.round(v.energy)), "pos")}
            ${line("− Rata roczna", "€" + fmt.grouped(Math.round(rata * 12)), "neg")}
            ${line("− Koszty utrzymania", "€" + fmt.grouped(Math.round(v.costs)), "neg")}
            ${line(net >= 0 ? "= Dom ZARABIA rocznie" : "= Dom KOSZTUJE rocznie",
              "€" + fmt.grouped(Math.abs(Math.round(net))) + " · " + pln(Math.abs(net)), net >= 0 ? "pos" : "neg")}
          </table>
          <div class="muted mt" style="font-size:.82em">
            ${net >= 0 ? "Dom spina się na plus — sam się utrzymuje." :
              "Realny koszt posiadania: " + pln(Math.abs(net) / 12) + "/mies. (po najmie, HE i PV)."}
            Yield brutto ${fmt.num(yieldBrutto, 1)}% · netto ${fmt.num(yieldNetto, 1)}%.
          </div>
        </div>
      </div>
      <div class="muted mt" style="font-size:.82em">${document.getElementById("icCountry").value === "spain"
        ? "🇪🇸 Andaluzja: podatek najmu 19% (UE, z odliczeniami), wkład 35% (LTV do 65%), oprocent. ~3,1%, tańsze utrzymanie (~16% niż Włochy). ITP 7% zawarty w kosztach transakcyjnych."
        : "🇮🇹 Włochy: podatek najmu 21% (cedolare), wkład 50% (LTV 50–60%), oprocent. ~3,4%, podatek od zakupu ~9% w kosztach transakcyjnych."}</div>`;
  }
  inputsEl.querySelectorAll("[data-ic]").forEach((i) => i.addEventListener("input", compute));
  compute();
}

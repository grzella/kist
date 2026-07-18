async function renderForecasts(el) {
  el.innerHTML = '<div class="empty">Liczenie scenariuszy…</div>';
  const [debtsData, rsu, cfg, sum, fire] = await Promise.all([
    api.get("/api/debts"), api.get("/api/rsu"),
    api.get("/api/settings"), api.get("/api/dashboard/summary"),
    api.get("/api/fire-projection").catch(() => null)]);

  const loan = debtsData.debts.find((d) => d.balance > 0);
  const tarch = debtsData.debts.filter((d) => d.balance > 0)[1];
  const vestPln = rsu.next_vest_value_pln || 0;

  async function overpay(debt, amount) {
    if (!debt || amount >= debt.balance) return null;
    return api.post("/api/forecast/mortgage", {
      balance: debt.balance,
      monthly_payment: debt.minimum_payment,
      months_left: debt.months_left || debt.schedule.months,
      overpayment: amount,
    });
  }

  const [bonusLodz, vestLodz, bothLodz] = await Promise.all([
    overpay(loan, 20000), overpay(loan, vestPln), overpay(loan, 20000 + vestPln)]);

  const aneksSavYr = tarch ? tarch.balance * (tarch.effective_rate - 1.0) / 100 : 0;
  const loanFreed = loan ? loan.monthly_cost_total : 0;

  const scenarioCard = (title, rows, note) => `
    <div class="card">
      <h3>${title}</h3>
      <table>${rows.map(([k, v, cls]) => `<tr><td>${k}</td><td class="${cls || ""}"><b>${v}</b></td></tr>`).join("")}</table>
      ${note ? `<div class="muted mt">${note}</div>` : ""}
    </div>`;

  const ym = (m) => {
    const mm = Math.round(m);
    const y = Math.floor(mm / 12), rest = mm % 12;
    return y ? `${y} ${y === 1 ? "rok" : y < 5 ? "lata" : "lat"}${rest ? ` ${rest} mies.` : ""}` : `${rest} mies.`;
  };
  const op = (r) => r ? [
    ["Pozostanie do spłaty", `${ym(r.months_left_after)} (zamiast ${ym(r.months_left_now)})`, "pos"],
    ["Odsetki zaoszczędzone", fmt.pln(r.interest_saved), "pos"],
    ["Skrócenie", ym(r.months_saved)],
  ] : [["—", "nadpłata pokrywa całe saldo — kredyt spłacony 🎉", "pos"]];

  el.innerHTML = `
    <h2>Prognozy — Twoje scenariusze</h2>
    <div class="muted" style="margin-bottom:12px">Liczone na żywych danych: salda kredytów,
      kurs akcji RSU, tempo oszczędzania. Zgodne ze strategią: spłata kredytu + refinansowanie równolegle.</div>
    <div class="grid cols-2">
      ${scenarioCard("Wrzesień: bonus ~80 000 zł → nadpłata kredytu", op(bonusLodz),
        loan ? `Saldo kredytu: ${fmt.pln(loan.balance)} · rata ${fmt.pln(loan.minimum_payment)}` : "")}
      ${scenarioCard(`Sierpień: vest ${rsu.shares_next_vest} akcji (≈${fmt.pln(vestPln)}) → nadpłata kredytu`, op(vestLodz),
        "Sprzedaż przy veście — Belka tylko od zysku po veście (≈0 przy sprzedaży od razu)")}
      ${scenarioCard("Vest + bonus razem (≈" + fmt.pln(20000 + vestPln) + ") → kredyt", op(bothLodz),
        bothLodz ? "" : "Ta kombinacja zamyka ponad połowę salda — z nadwyżkami kredyt znika ~I kw. 2027")}
      ${scenarioCard(`Aneks ${tarch ? tarch.name : "kredytu"}: ${tarch ? fmt.pct(tarch.effective_rate, 2) : "?"} → ~5,9%`, [
        ["Oszczędność rocznie", fmt.pln(aneksSavYr), "pos"],
        ["Do końca stałej stopy (~18 mies.)", fmt.pln(aneksSavYr * 1.5), "pos"],
        ["Zaangażowany kapitał", "0 zł"],
      ], "Playbook ING: realne oferty → zaświadczenie → dział utrzymania klienta")}
      ${scenarioCard("Po spłacie kredytu — co się uwalnia", [
        ["Rata + ubezpieczenia", fmt.pln(loanFreed) + "/mies.", "pos"],
        ["Najem (zostaje jako czysty dochód)", fmt.pln(0) + "/mies.", "pos"],
        ["Nieruchomość nieobciążona", "tak — profil pod kredyt włoski"],
      ], "Od tego momentu całość nadwyżek buduje wkład na cel")}
    </div>

    ${fire ? `<div class="card mt" style="border-left:4px solid #3ecf8e">
      <h3 style="margin-top:0">🏁 Droga do work-optional (3 mln płynnego portfela)</h3>
      <div class="muted" style="font-size:.88em;margin-bottom:8px">
        Płynny portfel dziś ${fmt.pln(fire.start)} → cel ${fmt.pln(fire.target)}. Wpłata: ${fire.assumptions.contrib_note} zł/mies.
        Trzy scenariusze zwrotu + linia celu. Kiedy linia przecina cel = jesteś work-optional.</div>
      <div class="grid cols-4">
        <div class="card kpi"><div class="label">Ostrożny (4%)</div><div class="value">${(fire.crossover["ostrożny (4%)"] || "—").slice(0, 7)}</div></div>
        <div class="card kpi"><div class="label">Bazowy (6,5%)</div><div class="value pos">${(fire.crossover["bazowy (6,5%)"] || "—").slice(0, 7)}</div></div>
        <div class="card kpi"><div class="label">Optymistyczny (9%)</div><div class="value">${(fire.crossover["optymistyczny (9%)"] || "—").slice(0, 7)}</div></div>
        <div class="card kpi"><div class="label">Realnie (po inflacji 3%)</div><div class="value">${(fire.real_crossover || "—").slice(0, 7)}</div><div class="sub">siła nabywcza</div></div>
      </div>
      <canvas id="fireChart" height="90" class="mt"></canvas>
      <div class="mt"><b>Kamienie milowe (scenariusz bazowy):</b>
        <table><tbody>
          <tr><td>Pierwszy milion płynny</td><td><b>${fire.milestones["1000000"] || "—"}</b></td></tr>
          <tr><td>2 mln</td><td><b>${fire.milestones["660000"] || "—"}</b></td></tr>
          <tr><td>3 mln — work-optional 🏁</td><td class="pos"><b>${fire.milestones["target"] || "—"}</b></td></tr>
        </tbody></table></div>
      <div class="muted mt" style="font-size:.82em">To zastępuje Monte Carlo czytelnymi liniami. Najedź myszką na wykres, żeby zobaczyć wartość w danym miesiącu. „Realnie" liczy zwrot po inflacji (~3,5% realnie) — data w dzisiejszej sile nabywczej.</div>
    </div>

    <div class="grid cols-2 mt">
      ${fire.property ? `<div class="card" style="border-left:4px solid #e0a458">
        <h3 style="margin-top:0">Wkład na cel (dom)</h3>
        <table>
          <tr><td>Cel wkładu (50%)</td><td><b>${fmt.pln(fire.property.target)}</b></td></tr>
          <tr><td>Uzbierane dziś</td><td>${fmt.pln(fire.property.start)}</td></tr>
          <tr><td>Wkład gotowy (start po spłacie kredytu)</td><td class="pos"><b>${fire.property.crossover || "—"}</b></td></tr>
        </table>
        <canvas id="propertyChart" height="70" class="mt"></canvas>
        <div class="muted mt" style="font-size:.82em">${fire.property.note}</div>
      </div>` : ""}

      ${fire.tracking ? `<div class="card" style="border-left:4px solid #4c8dff">
        <h3 style="margin-top:0">📡 Postęp vs plan (uczę się co miesiąc)</h3>
        ${fire.tracking.status === "ok" ? `
          <div style="font-size:1.05em"><b class="${fire.tracking.cum_delta >= 0 ? "pos" : "neg"}">${fire.tracking.verdict}</b>
            — łącznie ${fire.tracking.cum_delta >= 0 ? "+" : ""}${fmt.pln(fire.tracking.cum_delta)} vs plan</div>
          <div class="muted" style="font-size:.85em;margin:6px 0">Płynny portfel: ${fmt.pln(fire.tracking.latest_liquid)} · śledzę ${fire.tracking.months_tracked} mies.</div>
          <table><thead><tr><th>Mies.</th><th style="text-align:right">Realny wzrost</th><th style="text-align:right">Plan</th><th style="text-align:right">Δ</th></tr></thead>
          <tbody>${fire.tracking.rows.map((r) => `<tr><td>${r.month}</td>
            <td style="text-align:right">${fmt.pln(r.actual_growth)}</td>
            <td style="text-align:right" class="muted">${fmt.pln(r.expected_growth)}</td>
            <td style="text-align:right" class="${r.delta >= 0 ? "pos" : "neg"}">${r.delta >= 0 ? "+" : ""}${fmt.pln(r.delta)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="muted">${fire.tracking.status === "zbieram dane" ? `Zbieram dane — pierwszy snapshot ${fire.tracking.first || "dziś"}. Za miesiąc pojawi się pierwsze porównanie realnego tempa z planem.` : "Brak danych."}</div>
          <div class="muted mt" style="font-size:.85em">Co miesiąc zapisuję stan płynnego portfela i porównuję z oczekiwanym tempem (6,5% + wpłaty). Zobaczysz, czy idziesz szybciej czy wolniej niż plan.</div>`}
      </div>` : ""}
    </div>` : ""}

    <div class="card mt">
      <h3>Kalkulator nadpłaty — dowolny wariant</h3>
      <div class="row">
        <select id="mDebt">${debtsData.debts.map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}</select>
        <input data-num id="mOver" placeholder="kwota nadpłaty">
        <button class="primary" id="mRun">Policz</button>
      </div>
      <div id="mOut" class="mt"></div>
    </div>`;

  document.getElementById("mRun").addEventListener("click", async () => {
    const debt = debtsData.debts.find((d) => d.id === document.getElementById("mDebt").value);
    const amount = parseNum(document.getElementById("mOver"));
    if (!debt || isNaN(amount)) { alert("Podaj kwotę"); return; }
    const r = await overpay(debt, amount);
    document.getElementById("mOut").innerHTML = r
      ? `<table>${op(r).map(([k, v, c]) => `<tr><td>${k}</td><td class="${c || ""}"><b>${v}</b></td></tr>`).join("")}</table>`
      : '<span class="pos"><b>Nadpłata pokrywa całe saldo — kredyt spłacony 🎉</b></span>';
  });

  if (fire && document.getElementById("fireChart")) {
    const names = Object.keys(fire.series);
    const colors = { 0: CHART_COLORS[3], 1: CHART_COLORS[0], 2: CHART_COLORS[1] };
    trackChart(new Chart(document.getElementById("fireChart"), {
      type: "line",
      data: {
        labels: fire.labels,
        datasets: [
          ...names.map((n, i) => ({
            label: n, data: fire.series[n], borderColor: colors[i],
            backgroundColor: "transparent", borderWidth: i === 1 ? 3 : 2, pointRadius: 0, tension: 0.2,
          })),
          { label: "cel 3 mln", data: fire.labels.map(() => fire.target),
            borderColor: "#888", borderDash: [6, 4], pointRadius: 0, borderWidth: 1 },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: { tooltip: { callbacks: {
          title: (items) => items[0].label,
          label: (ctx) => `${ctx.dataset.label}: ${fmt.pln(ctx.parsed.y)}`,
        } } },
        scales: { y: { ticks: { callback: (v) => (v / 1000000).toFixed(1) + " mln" } } },
      },
    }));
  }
  if (fire && fire.property && document.getElementById("propertyChart")) {
    const yrs = fire.property.series.map((_, i) => `${new Date().getFullYear() + i}`);
    trackChart(new Chart(document.getElementById("propertyChart"), {
      type: "line",
      data: {
        labels: yrs,
        datasets: [
          { label: "Wkład uzbierany", data: fire.property.series, borderColor: CHART_COLORS[4],
            backgroundColor: "transparent", borderWidth: 3, pointRadius: 2, tension: 0.2 },
          { label: "cel wkładu", data: yrs.map(() => fire.property.target),
            borderColor: "#888", borderDash: [6, 4], pointRadius: 0, borderWidth: 1 },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmt.pln(ctx.parsed.y)}`,
        } } },
        scales: { y: { ticks: { callback: (v) => (v / 1000) + "k" } } },
      },
    }));
  }
}

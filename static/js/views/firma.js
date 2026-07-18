async function renderFirma(el) {
  const [b, mkt] = await Promise.all([
    api.get("/api/biz"),
    api.get("/api/biz/marketing").catch(() => ({ error: "brak danych" }))]);
  const cur = b.current;
  el.innerHTML = `
    <h2>Firma — </h2>
    <div class="grid cols-4">
      <div class="card kpi"><div class="label">Ten miesiąc: wynik</div>
        <div class="value ${(cur.wynik ?? cur.przychody - cur.koszty) >= 0 ? "pos" : "neg"}">${fmt.pln((cur.przychody || 0) - (cur.koszty || 0))}</div>
        <div class="sub">przychody ${fmt.pln(cur.przychody || 0)} · koszty ${fmt.pln(cur.koszty || 0)}</div></div>
      <div class="card kpi"><div class="label">Zainwestowane od startu</div>
        <div class="value">${fmt.pln(b.total_cost)}</div></div>
      <div class="card kpi"><div class="label">Przychody od startu</div>
        <div class="value">${fmt.pln(b.total_revenue)}</div></div>
      <div class="card kpi"><div class="label">Wynik narastająco</div>
        <div class="value ${b.total_result >= 0 ? "pos" : "neg"}">${fmt.pln(b.total_result)}</div>
        <div class="sub">baza ~1 100 zł/mies. (inFakt+ZUS+Adobe) · cel: 1 zlecenie/mies. pokrywa bazę · launch+ads: sierpień</div></div>
    </div>
    <div class="card mt">
      <h3>Dodaj wpis</h3>
      <div class="row">
        <input type="date" id="bDate" value="${new Date().toISOString().slice(0, 10)}">
        <select id="bKind"><option>koszt</option><option>przychód</option></select>
        <select id="bCat">${b.categories.map((c) => `<option>${c}</option>`).join("")}</select>
        <input data-num id="bAmount" placeholder="kwota netto PLN">
        <input id="bDesc" placeholder="opis (np. Meta Ads lipiec, bateria 6S…)" style="flex:1">
        <button class="primary" id="bAdd">Dodaj</button>
      </div>
      <div class="muted mt">Kwoty netto (JDG z VAT — VAT odliczasz osobno w księgowości).
        Wydatki marketingowe oznaczaj kategorią „marketing" — z nich liczy się ROAS.</div>
    </div>
    <div class="grid cols-2 mt">
      <div class="card"><h3>Koszty vs przychody / mies.</h3><canvas id="bChart"></canvas></div>
      <div class="card"><h3>Wynik narastająco</h3><canvas id="bCum"></canvas></div>
    </div>
    ${!mkt.error ? `<div class="card mt" style="border-left:4px solid ${CHART_COLORS[4]}">
      <h3 style="margin-top:0">📣 Performance marketing (Meta) — analiza tygodniowa z agentów marketingowych</h3>
      <div class="row" style="gap:20px;flex-wrap:wrap">
        <span>Wydatki (ostatnie tygodnie): <b>€${fmt.num(mkt.recent_spend_eur)}</b></span>
        <span>Kliknięcia: <b>${mkt.recent_clicks}</b></span>
        <span class="muted">raport co poniedziałek ~07:00 (ads-analyst)</span>
      </div>
      ${mkt.weeks.length ? `<div class="mt">
        <b>Ostatni tydzień (${mkt.weeks[0].week}, spend €${mkt.weeks[0].spend_eur}):</b>
        <div class="muted">${mkt.weeks[0].summary || "—"}</div>
        ${mkt.weeks[0].recommendation ? `<div class="mt">💡 <b>Rekomendacja tygodnia:</b> ${mkt.weeks[0].recommendation}</div>` : ""}
      </div>` : ""}
      ${mkt.insights.length ? `<details class="mt"><summary style="cursor:pointer"><b>Insighty</b> (${mkt.insights.length}) — co działa</summary>
        <ul style="padding-left:18px">${mkt.insights.map((i) =>
          `<li class="mt"><span class="badge">${i.category}</span> ${i.insight} <span class="muted">(pewność ${Math.round(i.confidence * 100)}%)</span></li>`).join("")}</ul>
      </details>` : ""}
      ${mkt.hypotheses.length ? `<details class="mt"><summary style="cursor:pointer"><b>Aktywne hipotezy</b> (${mkt.hypotheses.length}) — do przetestowania</summary>
        <ul style="padding-left:18px">${mkt.hypotheses.map((h) =>
          `<li class="mt"><b>${h.title}</b><div class="muted">${h.predicted_outcome || ""}</div></li>`).join("")}</ul>
      </details>` : ""}
      <details class="mt"><summary class="muted" style="cursor:pointer">poprzednie tygodnie</summary>
        <table class="mt"><thead><tr><th>Tydzień</th><th>Spend</th><th>Podsumowanie</th></tr></thead>
        <tbody>${mkt.weeks.slice(1).map((w) => `<tr><td>${w.week}</td><td>€${w.spend_eur}</td>
          <td class="muted" style="font-size:.85em">${(w.summary || "—").slice(0, 180)}…</td></tr>`).join("")}</tbody></table>
      </details>
    </div>` : `<div class="card mt muted">📣 Performance marketing: ${mkt.error}</div>`}
    <div class="card mt"><h3>Miesiące (marketing → ROAS)</h3><div id="bMonths"></div></div>
    <div class="card mt"><h3>Wpisy</h3><div id="bTable"></div></div>`;

  const mtbl = document.getElementById("bMonths");
  if (!b.months.length) {
    mtbl.innerHTML = '<div class="empty">Brak danych — dodaj pierwszy wpis</div>';
  } else {
    mtbl.innerHTML = `<table><thead><tr><th>Miesiąc</th><th style="text-align:right">Koszty</th>
      <th style="text-align:right">w tym marketing</th><th style="text-align:right">Przychody</th>
      <th style="text-align:right">Wynik</th><th style="text-align:right">Narastająco</th><th>ROAS</th></tr></thead><tbody>` +
      [...b.months].reverse().map((m) => `<tr>
        <td>${m.month}</td>
        <td style="text-align:right" class="neg">${fmt.pln(m.koszty)}</td>
        <td style="text-align:right">${fmt.pln(m.marketing)}</td>
        <td style="text-align:right" class="pos">${fmt.pln(m.przychody)}</td>
        <td style="text-align:right" class="${m.wynik >= 0 ? "pos" : "neg"}">${fmt.pln(m.wynik)}</td>
        <td style="text-align:right">${fmt.pln(m.narastajaco)}</td>
        <td>${m.roas != null ? m.roas + "×" : "—"}</td>
      </tr>`).join("") + "</tbody></table>";
  }

  const tbl = document.getElementById("bTable");
  if (!b.entries.length) {
    tbl.innerHTML = '<div class="empty">Brak wpisów</div>';
  } else {
    tbl.innerHTML = `<table><thead><tr><th>Data</th><th>Typ</th><th>Kategoria</th><th>Opis</th>
      <th style="text-align:right">Kwota</th><th></th></tr></thead><tbody>` +
      b.entries.map((e) => `<tr>
        <td>${e.date}</td>
        <td><span class="badge">${e.kind}</span></td>
        <td>${e.category}</td>
        <td>${e.description || "—"}</td>
        <td style="text-align:right" class="${e.kind === "przychód" ? "pos" : "neg"}">${fmt.pln(e.amount)}</td>
        <td><button class="danger" data-bdel="${e.id}">✕</button></td>
      </tr>`).join("") + "</tbody></table>";
  }
  tbl.querySelectorAll("[data-bdel]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Usunąć wpis?")) return;
      await api.del("/api/biz/" + btn.dataset.bdel);
      route();
    }));

  document.getElementById("bAdd").addEventListener("click", async () => {
    const amount = parseNum(document.getElementById("bAmount"));
    if (!amount || isNaN(amount)) { alert("Podaj kwotę"); return; }
    await api.post("/api/biz", {
      date: document.getElementById("bDate").value,
      kind: document.getElementById("bKind").value,
      category: document.getElementById("bCat").value,
      amount,
      description: document.getElementById("bDesc").value,
    });
    route();
  });

  if (b.months.length) {
    trackChart(new Chart(document.getElementById("bChart"), {
      type: "bar",
      data: {
        labels: b.months.map((m) => m.month),
        datasets: [
          { label: "Koszty", data: b.months.map((m) => m.koszty), backgroundColor: "#ff6b6b" },
          { label: "Przychody", data: b.months.map((m) => m.przychody), backgroundColor: "#3ecf8e" },
        ],
      },
    }));
    trackChart(new Chart(document.getElementById("bCum"), {
      type: "line",
      data: {
        labels: b.months.map((m) => m.month),
        datasets: [{ label: "Wynik narastająco", data: b.months.map((m) => m.narastajaco),
          borderColor: CHART_COLORS[0], backgroundColor: "transparent", tension: 0.25 }],
      },
      options: { plugins: { legend: { display: false } } },
    }));
  }
}

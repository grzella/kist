const WEALTH_KINDS = {
  investment: "Inwestycja",
  cushion: "Poduszka",
  savings: "Oszczędności",
  income: "Zarobki (mies.)",
};

async function renderWealth(el) {
  const s = await api.get("/api/wealth/summary");
  const t = s.totals || {};
  el.innerHTML = `
    <h2>Majątek</h2>
    <div class="grid cols-4">
      <div class="card kpi"><div class="label">Inwestycje</div>
        <div class="value">${fmt.pln(t.investment || 0)}</div>
        <div class="sub">stocki, PPE, pension acct…</div></div>
      <div class="card kpi"><div class="label">Poduszka bezpieczeństwa</div>
        <div class="value">${fmt.pln(t.cushion || 0)}</div></div>
      <div class="card kpi"><div class="label">Oszczędności</div>
        <div class="value">${fmt.pln(t.savings || 0)}</div></div>
      <div class="card kpi"><div class="label">Majątek netto</div>
        <div class="value">${fmt.pln((t.investment || 0) + (t.cushion || 0) + (t.savings || 0) - (s.debt_total || 0))}</div>
        <div class="sub">aktywa ${fmt.pln((t.investment || 0) + (t.cushion || 0) + (t.savings || 0))}
          − kredyty ${fmt.pln(s.debt_total || 0)} · zarobki mies.: ${fmt.pln(t.income || 0)}</div></div>
    </div>
    <div class="card mt">
      <h3>Dodaj pozycję</h3>
      <div class="row">
        <input id="wName" placeholder="nazwa (np. pension acct Łukasz)" style="flex:1">
        <select id="wKind">${Object.entries(WEALTH_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <select id="wOwner"><option>ja</option><option>żona</option><option selected>wspólne</option></select>
        <input data-num id="wValue" placeholder="wartość PLN">
        <select id="wDebt"><option value="">bez kredytu</option>
          ${s.debts.map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}</select>
        <button class="primary" id="wAdd">Dodaj</button>
      </div>
    </div>
    <div class="card mt"><h3>Pozycje</h3><div id="wTable"></div></div>
    <div class="card mt"><h3>Trend łączny</h3><canvas id="wChart" height="90"></canvas></div>`;

  const tbl = document.getElementById("wTable");
  if (!s.items.length) {
    tbl.innerHTML = '<div class="empty">Brak pozycji — dodaj pierwszą powyżej</div>';
  } else {
    tbl.innerHTML = `<table><thead><tr>
      <th>Nazwa</th><th>Typ</th><th>Kto</th><th style="text-align:right">Wartość</th>
      <th>Kredyt</th><th style="text-align:right">Equity</th><th>Aktualizacja</th><th></th><th></th>
    </tr></thead><tbody>` + s.items.map((i) => `<tr>
      <td>${i.name}</td>
      <td><span class="badge">${WEALTH_KINDS[i.kind] || i.kind}</span></td>
      <td>${i.owner}</td>
      <td style="text-align:right">${fmt.pln(i.latest_value)}</td>
      <td><select data-link="${i.id}">
        <option value="">—</option>
        ${s.debts.map((d) => `<option value="${d.id}" ${i.linked_debt_id === d.id ? "selected" : ""}>${d.name}</option>`).join("")}
      </select></td>
      <td style="text-align:right" class="${i.equity != null ? (i.equity >= 0 ? "pos" : "neg") : ""}">${i.equity != null ? fmt.pln(i.equity) : "—"}</td>
      <td class="muted">${i.latest_date || "—"}</td>
      <td><button data-upd="${i.id}">Aktualizuj</button></td>
      <td><button class="danger" data-del="${i.id}">✕</button></td>
    </tr>`).join("") + "</tbody></table>";
  }

  tbl.querySelectorAll("[data-upd]").forEach((b) =>
    b.addEventListener("click", async () => {
      const v = prompt("Nowa wartość (PLN):");
      if (v === null || v === "" || isNaN(parseNum(v))) return;
      await api.post(`/api/wealth/items/${b.dataset.upd}/values`, { value: parseNum(v) });
      route();
    }));
  tbl.querySelectorAll("[data-link]").forEach((sel) =>
    sel.addEventListener("change", async () => {
      await api.put("/api/wealth/items/" + sel.dataset.link,
        { linked_debt_id: sel.value || null });
      route();
    }));
  tbl.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Usunąć pozycję wraz z historią?")) return;
      await api.del("/api/wealth/items/" + b.dataset.del);
      route();
    }));

  document.getElementById("wAdd").addEventListener("click", async () => {
    const name = document.getElementById("wName").value.trim();
    const value = parseNum(document.getElementById("wValue"));
    if (!name) { alert("Podaj nazwę"); return; }
    await api.post("/api/wealth/items", {
      name,
      kind: document.getElementById("wKind").value,
      owner: document.getElementById("wOwner").value,
      value: isNaN(value) ? undefined : value,
      linked_debt_id: document.getElementById("wDebt").value || null,
    });
    route();
  });

  if (s.trend.length) {
    trackChart(new Chart(document.getElementById("wChart"), {
      type: "line",
      data: {
        labels: s.trend.map((p) => p.month),
        datasets: [{
          label: "Majątek łącznie",
          data: s.trend.map((p) => p.total),
          borderColor: CHART_COLORS[1],
          backgroundColor: "transparent",
          tension: 0.25,
        }],
      },
      options: { plugins: { legend: { display: false } } },
    }));
  }
}

async function renderRecs(el) {
  const [rec, xtb, acts] = await Promise.all([
    api.get("/api/recommendation"),
    api.get("/api/recommendation/xtb"),
    api.get("/api/actions")]);

  const engineItems = [...rec.items, ...(xtb.items || []).map((i) => ({ ...i, area: "brokerage: " + i.area }))];

  const byStatus = { "w trakcie": [], backlog: [], zrobione: [], odrzucone: [] };
  acts.actions.forEach((a) => (byStatus[a.status] || byStatus.backlog).push(a));

  const actionCard = (a) => `
    <div class="acard" data-act="${a.id}">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:6px">
        <b style="font-size:.92em">${a.title}</b>
        <button class="danger" data-adel="${a.id}" title="usuń">✕</button>
      </div>
      <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">
        ${a.area ? `<span class="badge">${a.area}</span>` : ""}
        <select data-ast="${a.id}" style="font-size:.85em">
          ${["backlog", "w trakcie", "zrobione", "odrzucone"].map((s) =>
            `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      ${a.expected_impact ? `<div class="muted" style="margin-top:6px;font-size:.85em">Cel: <b>${a.expected_impact}</b></div>` : ""}
      ${a.detail ? `<details style="margin-top:4px"><summary class="muted" style="font-size:.85em">szczegóły / instrukcja</summary>
        <pre style="white-space:pre-wrap;font-family:inherit;margin:6px 0 0;font-size:.85em">${a.detail}</pre></details>` : ""}
      ${a.status === "zrobione" ? `<div style="margin-top:6px">
        <div class="row" style="gap:4px">
          <input data-num data-aimp="${a.id}" placeholder="realny PLN/rok" value="${fmt.grouped(a.actual_impact_pln)}" style="width:120px;font-size:.85em">
          <button data-asave="${a.id}" style="font-size:.85em">Zapisz</button>
          ${a.done_at ? `<span class="muted" style="font-size:.8em">✓ ${a.done_at.slice(0, 10)}</span>` : ""}
        </div>
        <input data-anote="${a.id}" placeholder="co dało / wniosek" value="${a.actual_note || ""}" style="width:100%;margin-top:4px;font-size:.85em">
      </div>` : ""}
    </div>`;

  const column = (title, list) => list.length ? `
    <div class="acol">
      <h4 style="margin:0 0 8px">${title} <span class="muted">(${list.length})</span></h4>
      ${list.map(actionCard).join("")}
    </div>` : "";

  el.innerHTML = `
    <h2>Rekomendacje — plan działań</h2>
    <div class="card" style="padding:10px 16px">
      <div class="row" style="gap:20px;flex-wrap:wrap">
        <span>🔥 W trakcie: <b>${byStatus["w trakcie"].length}</b></span>
        <span>📋 Backlog: <b>${byStatus.backlog.length}</b></span>
        <span>✅ Zrobione: <b>${acts.done_count}</b></span>
        <span>💰 Zmierzony efekt: <b class="pos">${fmt.pln(acts.total_actual_impact)}/rok</b></span>
      </div>
    </div>

    <div class="card mt">
      <h3>Silnik rekomendacji (na żywo)</h3>
      <div class="muted" style="margin-bottom:8px">Przeliczane przy każdym otwarciu zakładki
        z bieżących danych (salda, kursy, portfel).</div>
      <table>
        <thead><tr><th style="width:140px">Kategoria</th><th>Rekomendacja</th><th style="width:110px"></th></tr></thead>
        <tbody>
        ${engineItems.map((r, i) => `<tr>
          <td><span class="badge">${r.area}</span></td>
          <td style="font-size:.92em">${r.text.length > 160
            ? `${r.text.slice(0, 160)}… <details style="display:inline"><summary class="muted" style="display:inline;cursor:pointer">więcej</summary><div class="mt">${r.text}</div></details>`
            : r.text}</td>
          <td><button data-eadd="${i}">→ backlog</button></td>
        </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="card mt">
      <h3>Dodaj akcję ręcznie</h3>
      <div class="row">
        <input id="aTitle" placeholder="tytuł akcji" style="flex:1">
        <input id="aArea" placeholder="obszar" style="width:130px">
        <input id="aExp" placeholder="oczekiwany efekt (np. 16k/rok)" style="width:200px">
        <button class="primary" id="aAdd">Dodaj</button>
      </div>
      <textarea id="aDetail" placeholder="szczegóły / instrukcja / treść maila…" rows="3" class="mt" style="width:100%"></textarea>
    </div>

    <div class="acols mt">
      ${column("🔥 W trakcie", byStatus["w trakcie"])}
      ${column("📋 Backlog", byStatus.backlog)}
      ${column("✅ Zrobione — wnioski", byStatus.zrobione)}
      ${byStatus.odrzucone.length ? column("🚫 Odrzucone", byStatus.odrzucone) : ""}
    </div>`;

  el.querySelectorAll("[data-eadd]").forEach((b) =>
    b.addEventListener("click", async () => {
      const r = engineItems[+b.dataset.eadd];
      await api.post("/api/actions", { title: r.text.slice(0, 80), area: r.area, detail: r.text });
      route();
    }));
  document.getElementById("aAdd").addEventListener("click", async () => {
    const title = document.getElementById("aTitle").value.trim();
    if (!title) { alert("Podaj tytuł"); return; }
    await api.post("/api/actions", {
      title, area: document.getElementById("aArea").value,
      expected_impact: document.getElementById("aExp").value,
      detail: document.getElementById("aDetail").value,
    });
    route();
  });
  el.querySelectorAll("[data-ast]").forEach((sel) =>
    sel.addEventListener("change", async () => {
      await api.put("/api/actions/" + sel.dataset.ast, { status: sel.value });
      route();
    }));
  el.querySelectorAll("[data-asave]").forEach((b) =>
    b.addEventListener("click", async () => {
      const id = b.dataset.asave;
      await api.put("/api/actions/" + id, {
        actual_impact_pln: parseNum(el.querySelector(`[data-aimp="${id}"]`)) || null,
        actual_note: el.querySelector(`[data-anote="${id}"]`).value,
      });
      route();
    }));
  el.querySelectorAll("[data-adel]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Usunąć akcję?")) return;
      await api.del("/api/actions/" + b.dataset.adel);
      route();
    }));
}

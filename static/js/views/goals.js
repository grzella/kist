async function renderGoals(el) {
  const [goals, cfg] = await Promise.all([
    api.get("/api/goals"), api.get("/api/settings")]);
  el.innerHTML = `
    <h2>Cele</h2>
    <div class="card">
      <h3>Tempo oszczędzania (domyślne dla celów bez własnego)</h3>
      <div class="row">
        <input data-num id="gSavings" placeholder="mies. oszczędności PLN"
          value="${fmt.grouped(cfg.monthly_savings)}" style="width:220px">
        <button class="primary" id="gSaveCfg">Zapisz</button>
        <span class="muted">Używane też w widoku Oferty do liczenia wpływu na cel.</span>
      </div>
    </div>
    <div class="card mt">
      <h3>Nowy cel</h3>
      <div class="row">
        <input id="gName" placeholder="nazwa (np. mieszkanie we Włoszech)" style="flex:1">
        <input data-num id="gTarget" placeholder="kwota docelowa">
        <input data-num id="gCurrent" placeholder="już odłożone" value="0">
        <input data-num id="gMonthly" placeholder="mies. wpłata (opcja)">
        <button class="primary" id="gAdd">Dodaj cel</button>
      </div>
    </div>
    <div id="gList" class="mt"></div>`;

  const list = document.getElementById("gList");
  if (!goals.length) {
    list.innerHTML = '<div class="empty">Brak celów — dodaj pierwszy powyżej</div>';
  } else {
    list.innerHTML = goals.map((g) => {
      const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
      const p = g.projection || {};
      const eta = p.months == null
        ? "ustaw tempo oszczędzania, aby policzyć czas do celu"
        : p.months === 0 ? "cel osiągnięty 🎉"
        : `${fmt.num(p.months, 1)} mies. → ~${p.eta} (tempo ${fmt.pln(p.pace)}/mies.)`
          + (p.eta_band ? ` · zakres: ${fmt.num(p.eta_band.months_fast, 0)}–${fmt.num(p.eta_band.months_slow, 0)} mies. przy tempie ±${p.eta_band.wobble_pct}%` : "");
      return `<div class="card mt">
        <div class="row" style="justify-content:space-between">
          <h3 style="margin:0">${g.name}</h3>
          <span class="badge">${g.status}</span>
        </div>
        <div class="row mt">
          <b>${fmt.pln(g.current_amount)}</b><span class="muted">z ${fmt.pln(g.target_amount)} (${fmt.pct(pct)})</span>
        </div>
        <div style="background:#2c3040;border-radius:6px;height:10px;margin:8px 0">
          <div style="background:${CHART_COLORS[1]};width:${pct}%;height:10px;border-radius:6px"></div>
        </div>
        <div class="muted">${eta}</div>
        ${/wło|property|garda/i.test(g.name) ? `<div class="mt">
          <a href="#property" style="text-decoration:none;display:inline-block;padding:6px 12px;
            border:1px solid ${CHART_COLORS[1]};border-radius:6px;color:${CHART_COLORS[1]};font-size:.9em">
            🇮🇹 Analiza lokalizacji — gdzie kupić →</a></div>` : ""}
        <div class="row mt">
          <input data-num data-gcur="${g.id}" placeholder="nowy stan odłożonych" style="width:200px">
          <button data-gupd="${g.id}">Aktualizuj stan</button>
          <input data-num data-gmon-in="${g.id}" placeholder="mies. wpłata" value="${fmt.grouped(g.monthly_contribution)}" style="width:150px">
          <button data-gmon="${g.id}">Zapisz tempo</button>
          <button class="danger" data-gdel="${g.id}">Usuń</button>
        </div>
      </div>`;
    }).join("");
  }

  document.getElementById("gSaveCfg").addEventListener("click", async () => {
    await api.put("/api/settings", { monthly_savings: parseNum(document.getElementById("gSavings")) || "" });
    route();
  });
  document.getElementById("gAdd").addEventListener("click", async () => {
    const name = document.getElementById("gName").value.trim();
    const target = parseNum(document.getElementById("gTarget"));
    if (!name || !target) { alert("Podaj nazwę i kwotę docelową"); return; }
    const monthly = parseNum(document.getElementById("gMonthly"));
    await api.post("/api/goals", {
      name, target_amount: target,
      current_amount: parseNum(document.getElementById("gCurrent")) || 0,
      monthly_contribution: isNaN(monthly) ? undefined : monthly,
    });
    route();
  });
  list.querySelectorAll("[data-gupd]").forEach((b) =>
    b.addEventListener("click", async () => {
      const v = parseNum(list.querySelector(`[data-gcur="${b.dataset.gupd}"]`));
      if (isNaN(v)) { alert("Podaj kwotę"); return; }
      await api.put("/api/goals/" + b.dataset.gupd, { current_amount: v });
      route();
    }));
  list.querySelectorAll("[data-gmon]").forEach((b) =>
    b.addEventListener("click", async () => {
      const raw = list.querySelector(`[data-gmon-in="${b.dataset.gmon}"]`).value;
      await api.put("/api/goals/" + b.dataset.gmon,
        { monthly_contribution: raw === "" ? null : parseNum(raw) });
      route();
    }));
  list.querySelectorAll("[data-gdel]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Usunąć cel?")) return;
      await api.del("/api/goals/" + b.dataset.gdel);
      route();
    }));
}

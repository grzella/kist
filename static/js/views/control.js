async function renderControl(el) {
  const d = await api.get("/api/health");
  const s = d.summary;
  const badge = (st) => {
    const m = { ok: ["✅", "pos"], warn: ["⚠️", ""], error: ["🛑", "neg"], info: ["ℹ️", "muted"] };
    const [ic, cls] = m[st] || ["·", "muted"];
    return `<span class="badge ${cls}">${ic} ${st}</span>`;
  };
  el.innerHTML = `
    <h2>🛠️ Control Center</h2>
    <div class="row" style="gap:8px;margin-bottom:12px">
      <a href="#control" style="text-decoration:none;padding:5px 12px;border-radius:6px;background:${CHART_COLORS[0]};color:#fff">🛠️ Automatyzacje &amp; health</a>
      <a href="#reminders" style="text-decoration:none;padding:5px 12px;border-radius:6px;border:1px solid #4a4f66;color:#e8e8ee">🔔 Przypomnienia</a>
    </div>
    <div class="muted" style="margin-bottom:12px">Wszystko, co ma się dziać automatycznie: częstotliwość, ostatni update (data+godzina) i status.
      Sprawdzono: ${d.checked_at}.</div>

    <div class="grid cols-4">
      <div class="card kpi"><div class="label">Zadania OK</div><div class="value pos">${s.ok}</div><div class="sub">z ${s.total}</div></div>
      <div class="card kpi"><div class="label">Ostrzeżenia</div><div class="value ${s.warn ? "" : "muted"}">${s.warn}</div><div class="sub">nieświeże / offline</div></div>
      <div class="card kpi"><div class="label">Błędy</div><div class="value ${s.error ? "neg" : "muted"}">${s.error}</div><div class="sub">wymagają akcji</div></div>
      <div class="card kpi"><div class="label">Odśwież</div>
        <div class="value"><button class="primary" id="hRefresh" style="font-size:.5em;padding:8px 14px">Sprawdź teraz</button></div></div>
    </div>

    <div class="card mt" style="border-left:4px solid #ffd166">
      <h3 style="margin-top:0">🔬 Tryb demo</h3>
      <div class="row" style="align-items:center;gap:12px">
        <button class="${demoOn() ? "danger" : "primary"}" id="demoToggle">${demoOn() ? "Wyłącz tryb demo" : "Włącz tryb demo"}</button>
        <span class="muted" style="font-size:.88em">Maskuje wszystkie kwoty finansowe wzorem 0-1 (np. „010 101 zł") — do screenshotów/pokazywania bez ujawniania liczb.
          Status: <b class="${demoOn() ? "neg" : "pos"}">${demoOn() ? "WŁĄCZONY" : "wyłączony"}</b>. Można też przez URL <code>?demo</code>.</span>
      </div>
    </div>

    <div class="card mt">
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Zadanie</th><th>Częstotliwość</th><th>Ostatni update</th><th>Status</th><th>Szczegóły</th></tr></thead>
        <tbody>${d.tasks.map((t) => `<tr>
          <td><b>${t.name}</b></td>
          <td class="muted" style="font-size:.88em">${t.freq}</td>
          <td style="white-space:nowrap">${t.last}</td>
          <td>${badge(t.status)}</td>
          <td class="muted" style="font-size:.88em">${t.detail}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>

    <div class="card mt muted" style="font-size:.85em">
      <b>Jak to działa:</b> kursy i marketing pobiera n8n do Supabase (publiczne dane); predykcje RSU i barometr
      utrzymuje Claude/aplikacja lokalnie; backup danych szyfrowany na Google Drive. „Audyt danych wrażliwych"
      sprawdza, czy do gita nie trafiło nic z <code>private/ .finance/ doc-raw/ *.env</code> — powinien być zawsze ✅.
      Pomysły do dobudowania: alert e-mail/Telegram przy błędzie, auto-test spójności danych po każdym imporcie,
      monitoring czy Google Drive zamontowany.
    </div>`;

  document.getElementById("hRefresh").addEventListener("click", () => route());
  document.getElementById("demoToggle").addEventListener("click", () => toggleDemo(!demoOn()));
}

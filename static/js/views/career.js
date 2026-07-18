async function renderCareer(el) {
  const a = await api.get("/api/analysis/career").catch(() => ({}));
  if (!a.headline) {
    el.innerHTML = '<div class="card"><h2>Kariera</h2><div class="muted">Brak analizy. Poproś Claude: „odśwież analizę kariery".</div></div>';
    return;
  }
  el.innerHTML = `
    <div class="muted" style="margin-bottom:4px"><a href="#offers" style="text-decoration:none">← Kariera (oferty i rynek)</a></div>
    <h2>🧭 Kariera — rozwój do Director / Head of Engineering</h2>
    <div class="card" style="border-left:4px solid #3ecf8e">
      <div style="font-size:1.05em"><b>${a.headline}</b></div>
      <div class="muted mt" style="font-size:.82em">Stan na ${a.as_of}.</div>
    </div>

    <div class="card mt">
      <h3>Gdzie jesteś na drabinie comp (Polska, 2026)</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Poziom / rola</th><th style="text-align:right">Wynagrodzenie/rok</th></tr></thead>
        <tbody>${a.comp_levels.map((c) => `<tr style="${c.you ? "background:rgba(62,207,142,0.12)" : ""}">
          <td>${c.you ? "⭐ " : ""}<b>${c.role}</b></td>
          <td style="text-align:right" class="${c.you ? "pos" : ""}"><b>${c.comp}</b></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="muted mt" style="font-size:.85em">Jesteś powyżej polskich tytułów Director/Head of Eng — bo płaci Cię US-scale comp, nie tytuł.</div>
    </div>

    <div class="card mt">
      <h3>Skąd realnie WIĘCEJ pieniędzy — 3 ścieżki</h3>
      <div class="grid cols-3">
        ${a.money_paths.map((p) => `<div class="card" style="margin:0;border-left:3px solid ${p.tag === "A" ? "#3ecf8e" : p.tag === "B" ? "#4c8dff" : "#ffd166"}">
          <h4 style="margin:0 0 4px">${p.tag}. ${p.title}</h4>
          <div class="pos" style="font-size:.85em;margin-bottom:6px">${p.verdict}</div>
          <div style="font-size:.9em">${p.text}</div>
        </div>`).join("")}
      </div>
    </div>

    <div class="card mt" style="border-left:4px solid #e0a458">
      <h3 style="margin-top:0">🎯 Head of Engineering — czy celować?</h3>
      <div style="font-size:.95em">${a.head_of_eng}</div>
    </div>

    <div class="card mt">
      <h3>🤖 AI — zabiera pracę czy nie?</h3>
      <ul style="padding-left:18px">${a.ai_impact.map((x) => `<li class="mt" style="font-size:.92em">${x}</li>`).join("")}</ul>
    </div>

    <div class="card mt">
      <h3>📚 Czego się szkolić i po co</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Kompetencja</th><th>Po co</th></tr></thead>
        <tbody>${a.skills.map((s) => `<tr><td><b>${s.skill}</b></td><td class="muted" style="font-size:.9em">${s.why}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="muted mt" style="font-size:.85em">${a.skills_note}</div>
    </div>

    ${a.trainings ? `<div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">🎓 Konkretne szkolenia — pod budżet ${a.trainings.budget}</h3>
      <div class="muted" style="font-size:.88em;margin-bottom:10px">${a.trainings.strategy}</div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Program</th><th>Gdzie</th><th style="text-align:right">Koszt</th><th>Priorytet</th><th>Po co / jak sprzedać szefowi</th></tr></thead>
        <tbody>${a.trainings.items.map((t) => `<tr>
          <td><b>${t.url ? `<a href="${t.url}" target="_blank">${t.name} ↗</a>` : t.name}</b></td>
          <td class="muted" style="font-size:.88em">${t.provider}<br><span style="font-size:.92em">${t.format}</span></td>
          <td style="text-align:right;white-space:nowrap">${t.cost}</td>
          <td><span class="badge ${/wysoki/.test(t.priority) ? "pos" : ""}">${t.priority}</span></td>
          <td style="font-size:.88em">${t.why}
            ${t.boss_pitch ? `<div class="mt" style="font-size:.9em;padding:4px 8px;background:rgba(62,207,142,0.1);border-radius:5px">🗣️ <b>Szefowi:</b> <i>${t.boss_pitch}</i></div>` : ""}
            <div class="muted mt" style="font-size:.92em">🔗 ${t.linkedin}</div></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="mt" style="font-size:.92em;padding:8px 12px;background:#00000022;border-radius:6px">
        <b>💡 Plan na ten rok:</b> ${a.trainings.recommended_year}</div>

      ${a.trainings.conferences ? `<h4 class="mt">🎤 Konferencje — lokalnie (Warszawa)</h4>
      <div class="muted" style="font-size:.85em;margin-bottom:6px">${a.trainings.conferences_note}</div>
      <table><tbody>${a.trainings.conferences.map((c) => `<tr>
        <td><b>${c.url ? `<a href="${c.url}" target="_blank">${c.name} ↗</a>` : c.name}</b><div class="muted" style="font-size:.82em">${c.when}</div></td>
        <td style="font-size:.88em">${c.why}</td>
      </tr>`).join("")}</tbody></table>` : ""}
    </div>` : ""}

    <div class="card mt">
      <h3>🛣️ Ścieżka długofalowa</h3>
      ${a.roadmap.map((r) => `<div class="mt" style="display:flex;gap:12px">
        <div style="min-width:110px"><span class="badge">${r.period}</span></div>
        <div><b>${r.title}</b><div class="muted" style="font-size:.9em">${r.text}</div></div>
      </div>`).join("")}
    </div>

    <div class="card mt" style="border-left:4px solid #a78bfa">
      <h3 style="margin-top:0">Dwie filozofie — do świadomego wyboru</h3>
      <div class="grid cols-2">
        <div class="card" style="margin:0"><h4 style="margin:0 0 4px">🚀 ${a.philosophies.max.title}</h4><div style="font-size:.9em">${a.philosophies.max.text}</div></div>
        <div class="card" style="margin:0"><h4 style="margin:0 0 4px">🌊 ${a.philosophies.coast.title}</h4><div style="font-size:.9em">${a.philosophies.coast.text}</div></div>
      </div>
      <div class="mt" style="font-size:.92em;padding:8px 12px;background:#00000022;border-radius:6px"><b>${a.philosophies.note}</b></div>
    </div>

    <div class="card mt" style="border-left:4px solid #3ecf8e">
      <h3 style="margin-top:0">✅ Następne kroki</h3>
      <ol style="padding-left:18px">${a.next_steps.map((s) => `<li class="mt" style="font-size:.92em">${s}</li>`).join("")}</ol>
    </div>

    <div class="card mt muted" style="font-size:.8em">Analiza z researchu rynkowego — snapshot. Odświeżenie: „odśwież analizę kariery".
      Źródła: ${a.sources.map((u, i) => `<a href="${u}" target="_blank">[${i + 1}]</a>`).join(" ")}</div>`;
}

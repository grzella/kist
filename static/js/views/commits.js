async function renderCommits(el) {
  const [gh, c] = await Promise.all([
    api.get("/api/github-activity").catch(() => null),
    api.get("/api/analysis/contributions").catch(() => ({}))]);

  const diffCls = (d) => /łatwe/.test(d) ? "pos" : /trudne/.test(d) ? "neg" : "";

  el.innerHTML = `
    <div class="muted" style="margin-bottom:4px"><a href="#offers" style="text-decoration:none">← Kariera</a></div>
    <h2>🧑‍💻 Commitowanie — aktywność koderska i open-source</h2>

    ${gh ? `<div class="card" style="border-left:4px solid #3ecf8e">
      <div class="muted" style="font-size:.85em;margin-bottom:8px">Twoje commity z lokalnych repo (${gh.repos}) za ${gh.days} dni.
        Cel: aktywność koderska codziennie — buduje profil AI-native i „koduję z AI". Status też w Control → Automatyzacje.</div>
      <div class="grid cols-4">
        <div class="card kpi"><div class="label">Dziś</div><div class="value ${gh.today > 0 ? "pos" : ""}">${gh.today}</div><div class="sub">commitów</div></div>
        <div class="card kpi"><div class="label">Seria (streak)</div><div class="value ${gh.streak >= 3 ? "pos" : ""}">${gh.streak} 🔥</div><div class="sub">dni z rzędu · rekord ${gh.best_streak}</div></div>
        <div class="card kpi"><div class="label">Ten tydzień</div><div class="value">${gh.week}</div><div class="sub">commitów</div></div>
        <div class="card kpi"><div class="label">Aktywne dni</div><div class="value">${gh.active_pct}%</div><div class="sub">${gh.active_days}/${gh.days} dni · ${gh.total} commitów</div></div>
      </div>
      <canvas id="ghChart" height="60" class="mt"></canvas>
      <div class="muted mt" style="font-size:.82em">${gh.today > 0 ? "✅ Dziś już commitowałeś — seria żyje." : "⚠️ Dziś jeszcze 0 commitów — mały commit podtrzyma serię."}
        Śr. ${gh.avg_per_active} commitów/aktywny dzień. Nawet drobny commit dziennie utrzymuje streak i zieloną kratkę na GitHub.</div>
    </div>` : ""}

    ${c && c.goal ? `
    <div class="card mt" style="border-left:4px solid #4c8dff">
      <h3 style="margin-top:0">🎯 Gdzie kontrybuować (open-source działalności)</h3>
      <div style="font-size:1.0em"><b>${c.goal}</b></div>
      <div class="muted mt" style="font-size:.85em">${c.method}</div>
      <div style="overflow-x:auto" class="mt"><table>
        <thead><tr><th>Repo</th><th>Aktywność</th><th>Język</th><th>Trudność</th><th>Po co / pierwszy PR</th></tr></thead>
        <tbody>${c.repos.map((r) => `<tr>
          <td><b><a href="${r.url}" target="_blank">${r.name} ↗</a></b></td>
          <td class="${/bardzo/.test(r.activity) ? "pos" : ""}" style="font-size:.85em">${r.activity}</td>
          <td class="muted" style="font-size:.85em">${r.lang}</td>
          <td><span class="badge ${diffCls(r.difficulty)}">${r.difficulty}</span></td>
          <td style="font-size:.88em">${r.why}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>

    <div class="grid cols-2 mt">
      <div class="card">
        <h3>🏆 Badge do zdobycia</h3>
        <table><tbody>${c.badges.map((b) => `<tr>
          <td><b>${b.name}</b><div class="muted" style="font-size:.82em">${b.how}</div></td>
          <td style="text-align:right"><span class="badge ${/instant|łatwe/.test(b.status) ? "pos" : ""}">${b.status}</span></td>
        </tr>`).join("")}</tbody></table>
        <div class="muted mt" style="font-size:.82em">Masz już: Pull Shark, Pair Extraordinaire, Quickdraw, YOLO.</div>
      </div>
      <div class="card">
        <h3>✅ Playbook (pierwszy PR)</h3>
        <ol style="padding-left:18px">${c.playbook.map((p) => `<li class="mt" style="font-size:.9em">${p}</li>`).join("")}</ol>
      </div>
    </div>` : `<div class="card mt muted">Brak researchu kontrybucji — poproś Claude „odśwież research kontrybucji".</div>`}`;

  if (gh && document.getElementById("ghChart")) {
    const last = gh.series.slice(-60);
    trackChart(new Chart(document.getElementById("ghChart"), {
      type: "bar",
      data: {
        labels: last.map((d) => d.date.slice(5)),
        datasets: [{ label: "commity/dzień", data: last.map((d) => d.count),
          backgroundColor: last.map((d) => d.count > 0 ? "#3ecf8e" : "#2c3040") }],
      },
      options: {
        plugins: { legend: { display: false },
          tooltip: { callbacks: { title: (i) => i[0].label, label: (x) => `${x.parsed.y} commitów` } } },
        scales: { x: { ticks: { maxTicksLimit: 12 } }, y: { ticks: { stepSize: 2 } } },
      },
    }));
  }
}

async function renderCashflow(el) {
  const d = await api.get("/api/cashflow");
  if (d.error) { el.innerHTML = `<div class="card">Błąd: ${d.error}</div>`; return; }
  const a = d.assumptions;
  const rows = d.rows;
  const last = rows[rows.length - 1];
  const at12 = rows[Math.min(11, rows.length - 1)];
  const anyBelow = rows.some((r) => r.below_buffer);

  el.innerHTML = `
    <h2>💧 Oś płynności — cash-flow w czasie</h2>
    <div class="muted" style="margin-bottom:12px">Nadwyżka bazowa + skokowe vesty (z RSU) i bonus wrześniowy.
      Nadwyżka ponad bufor bezpieczeństwa jest zmiatana na nadpłatę kredytu, aż do spłaty — potem saldo płynne rośnie pod wkład na cel.</div>

    <div class="grid cols-4">
      <div class="card kpi"><div class="label">kredyt spłacona</div>
        <div class="value pos">${d.loan_paid_month || "—"}</div>
        <div class="sub">start ${fmt.pln(d.loan_start)} · po spłacie surplus +${fmt.pln(d.loan_freed_monthly)}/mies.</div></div>
      <div class="card kpi"><div class="label">Saldo płynne za 12 mies.</div>
        <div class="value">${fmt.pln(at12.liquid)}</div>
        <div class="sub">${at12.month}</div></div>
      <div class="card kpi"><div class="label">Saldo płynne za ${rows.length} mies.</div>
        <div class="value">${fmt.pln(last.liquid)}</div>
        <div class="sub">${last.month} · pod wkład na cel</div></div>
      <div class="card kpi"><div class="label">Bufor bezpieczeństwa</div>
        <div class="value ${anyBelow ? "neg" : ""}">${fmt.pln(d.buffer)}</div>
        <div class="sub">${anyBelow ? "⚠️ saldo schodzi poniżej w którymś mies." : "saldo nigdy nie schodzi poniżej ✓"}</div></div>
    </div>

    <div class="card mt">
      <h3>Założenia (edytowalne)</h3>
      <div class="row" style="flex-wrap:wrap;gap:12px">
        <label class="muted">Nadwyżka bazowa/mies.<br><input data-num id="cfSurplus" value="${fmt.grouped(a.cf_monthly_surplus)}" style="width:140px"></label>
        <label class="muted">Bufor bezpieczeństwa<br><input data-num id="cfBuffer" value="${fmt.grouped(a.cf_safety_buffer)}" style="width:140px"></label>
        <label class="muted">Saldo płynne startowe<br><input data-num id="cfStart" value="${fmt.grouped(a.cf_liquid_start)}" style="width:140px"></label>
        <label class="muted">Bonus netto (wrzesień)<br><input data-num id="cfBonus" value="${fmt.grouped(a.annual_bonus_net)}" style="width:140px"></label>
        <button class="primary" id="cfSave" style="align-self:flex-end">Zapisz i przelicz</button>
      </div>
      <div class="muted mt" style="font-size:.85em">Vest liczony automatycznie z zakładki RSU (${a.vest_value_pln ? fmt.pln(a.vest_value_pln) + "/vest, miesiące " + a.vest_months.join(", ") : "brak danych RSU"}).</div>
    </div>

    <div class="card mt">
      <h3>Saldo płynne i saldo kredytu w czasie</h3>
      <canvas id="cfChart" height="110"></canvas>
    </div>

    <div class="card mt">
      <h3>Miesiąc po miesiącu</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Miesiąc</th><th style="text-align:right">Wpływy</th>
          <th style="text-align:right">Nadpłata kredyt</th><th style="text-align:right">Saldo płynne</th>
          <th style="text-align:right">Saldo kredyt</th></tr></thead>
        <tbody>${rows.map((r) => `<tr class="${r.below_buffer ? "cf-warn" : ""}">
          <td>${r.month} ${r.is_vest ? '<span class="badge">vest</span>' : ""}${r.is_bonus ? '<span class="badge">bonus</span>' : ""}</td>
          <td style="text-align:right" title="${r.inflow_parts}">${fmt.pln(r.inflow)}</td>
          <td style="text-align:right" class="${r.overpay_loan > 0 ? "pos" : "muted"}">${r.overpay_loan > 0 ? fmt.pln(r.overpay_loan) : "—"}</td>
          <td style="text-align:right" class="${r.below_buffer ? "neg" : ""}"><b>${fmt.pln(r.liquid)}</b></td>
          <td style="text-align:right" class="${r.loan_balance === 0 ? "pos" : "muted"}">${r.loan_balance === 0 ? "spłacona 🎉" : fmt.pln(r.loan_balance)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>`;

  trackChart(new Chart(document.getElementById("cfChart"), {
    type: "line",
    data: {
      labels: rows.map((r) => r.month),
      datasets: [
        { label: "Saldo płynne", data: rows.map((r) => r.liquid),
          borderColor: CHART_COLORS[0], backgroundColor: "transparent", borderWidth: 3, tension: 0.2, pointRadius: 2 },
        { label: "Saldo kredytu", data: rows.map((r) => r.loan_balance),
          borderColor: CHART_COLORS[3], backgroundColor: "transparent", tension: 0.2, pointRadius: 0 },
        { label: "Bufor", data: rows.map(() => d.buffer),
          borderColor: "#888", borderDash: [4, 4], backgroundColor: "transparent", pointRadius: 0, borderWidth: 1 },
      ],
    },
    options: { scales: { y: { ticks: { callback: (v) => (v / 1000) + "k" } } } },
  }));

  document.getElementById("cfSave").addEventListener("click", async () => {
    await api.put("/api/settings", {
      cf_monthly_surplus: parseNum(document.getElementById("cfSurplus")),
      cf_safety_buffer: parseNum(document.getElementById("cfBuffer")),
      cf_liquid_start: parseNum(document.getElementById("cfStart")),
      annual_bonus_net: parseNum(document.getElementById("cfBonus")),
    });
    route();
  });
}

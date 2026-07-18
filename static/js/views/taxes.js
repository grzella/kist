async function renderTaxes(el) {
  const d = await api.get("/api/taxes");
  el.innerHTML = `
    <h2>🧾 Podatki — przegląd i kalendarz</h2>
    <div class="muted" style="margin-bottom:12px">Podatki, którymi zarządzasz sam (najem, działalności) + informacyjnie te potrącane automatycznie.
      Kwoty roczne szacunkowe.</div>

    <div class="grid cols-3">
      <div class="card kpi"><div class="label">Podatki „Twoje" / rok (szac.)</div>
        <div class="value">${fmt.pln(d.self_managed_annual)}</div>
        <div class="sub">najem + ZUS działalności + PIT działalności</div></div>
      <div class="card kpi"><div class="label">Najbliższa płatność</div>
        <div class="value" style="font-size:1.3em">${d.calendar[0] ? d.calendar[0].date : "—"}</div>
        <div class="sub">${d.calendar[0] ? d.calendar[0].what : ""}${d.calendar[0] && d.calendar[0].amount ? " · ~" + fmt.pln(d.calendar[0].amount) : ""}</div></div>
      <div class="card kpi"><div class="label">Rozliczenie roczne</div>
        <div class="value" style="font-size:1.3em">${d.calendar[1] ? d.calendar[1].date : "—"}</div>
        <div class="sub">${d.calendar[1] ? d.calendar[1].what : ""}</div></div>
    </div>

    <div class="card mt">
      <h3>Źródła podatku</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Źródło</th><th>Stawka</th><th style="text-align:right">Podstawa/rok</th>
          <th style="text-align:right">Podatek/rok</th><th>Kadencja</th><th>Kto</th></tr></thead>
        <tbody>${d.items.map((i) => `<tr>
          <td><b>${i.source}</b>${i.note ? `<div class="muted" style="font-size:.8em">${i.note}</div>` : ""}</td>
          <td>${i.rate}</td>
          <td style="text-align:right">${i.base != null ? fmt.pln(i.base) : "—"}</td>
          <td style="text-align:right">${i.tax != null ? "<b>" + fmt.pln(i.tax) + "</b>" : '<span class="muted">potrącane</span>'}</td>
          <td style="font-size:.88em">${i.cadence}</td>
          <td><span class="badge">${i.managed}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>

    <div class="card mt" style="border-left:4px solid #3ecf8e">
      <h3 style="margin-top:0">💡 Optymalizacje podatkowe</h3>
      <ul style="padding-left:18px">${d.optimizations.map((o) => `<li class="mt" style="font-size:.92em">${o}</li>`).join("")}</ul>
    </div>

    <div class="card mt">
      <h3>Założenia (edytowalne)</h3>
      <div class="row" style="flex-wrap:wrap;gap:12px">
        <label class="muted">Najem/mies. (PLN)<br><input data-num id="txRent" value="${fmt.grouped(d.assumptions.tax_rental_monthly)}" style="width:130px"></label>
        <label class="muted">Stawka ryczałtu (%)<br><input data-num id="txRate" value="${d.assumptions.tax_rental_rate}" style="width:110px"></label>
        <label class="muted">ZUS działalności/mies. (PLN)<br><input data-num id="txZus" value="${fmt.grouped(d.assumptions.tax_zus_monthly)}" style="width:130px"></label>
        <button class="primary" id="txSave" style="align-self:flex-end">Zapisz</button>
      </div>
    </div>`;

  document.getElementById("txSave").addEventListener("click", async () => {
    await api.put("/api/settings", {
      tax_rental_monthly: parseNum(document.getElementById("txRent")),
      tax_rental_rate: parseNum(document.getElementById("txRate")),
      tax_zus_monthly: parseNum(document.getElementById("txZus")),
    });
    route();
  });
}

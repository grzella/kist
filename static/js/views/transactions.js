async function renderTransactions(el) {
  const month = new Date().toISOString().slice(0, 7);
  el.innerHTML = `
    <h2>Transakcje</h2>
    <div class="card">
      <div class="row">
        <input type="month" id="txMonth" value="${month}">
        <select id="txCat"><option value="">wszystkie kategorie</option></select>
        <button class="primary" id="txReload">Filtruj</button>
      </div>
      <div class="row mt">
        <input type="date" id="fDate" value="${new Date().toISOString().slice(0, 10)}">
        <select id="fType">
          <option value="expense">wydatek</option><option value="income">przychód</option>
          <option value="transfer">transfer</option><option value="investment">inwestycja</option>
          <option value="debt_payment">rata</option>
        </select>
        <input data-num id="fAmount" placeholder="kwota">
        <input id="fCategory" placeholder="kategoria" list="catList"><datalist id="catList"></datalist>
        <input id="fDesc" placeholder="opis" style="flex:1">
        <button class="primary" id="txAdd">Dodaj</button>
      </div>
    </div>
    <div class="card mt"><div id="txTable"></div></div>`;

  async function loadCats() {
    const cats = await api.get("/api/categories");
    document.getElementById("txCat").innerHTML =
      '<option value="">wszystkie kategorie</option>' +
      cats.map((c) => `<option>${c}</option>`).join("");
    document.getElementById("catList").innerHTML = cats.map((c) => `<option>${c}</option>`).join("");
  }

  async function loadTable() {
    const m = document.getElementById("txMonth").value;
    const c = document.getElementById("txCat").value;
    const q = new URLSearchParams();
    if (m) q.set("month", m);
    if (c) q.set("category", c);
    const txs = await api.get("/api/transactions?" + q);
    const tbl = document.getElementById("txTable");
    if (!txs.length) { tbl.innerHTML = '<div class="empty">Brak transakcji w tym widoku</div>'; return; }
    tbl.innerHTML = `<table><thead><tr>
      <th>Data</th><th>Typ</th><th>Kategoria</th><th>Opis</th><th style="text-align:right">Kwota</th><th></th>
    </tr></thead><tbody>` + txs.map((t) => `<tr>
      <td>${t.date}</td>
      <td><span class="badge">${t.type}</span></td>
      <td>${t.category || "—"}</td>
      <td>${t.description || t.payee || "—"}</td>
      <td style="text-align:right" class="${t.type === "income" ? "pos" : t.type === "expense" ? "neg" : ""}">${fmt.pln(Math.abs(t.amount))}</td>
      <td><button class="danger" data-del="${t.id}">✕</button></td>
    </tr>`).join("") + "</tbody></table>";
    tbl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Usunąć transakcję?")) return;
        await api.del("/api/transactions/" + b.dataset.del);
        loadTable();
      }));
  }

  document.getElementById("txReload").addEventListener("click", loadTable);
  document.getElementById("txAdd").addEventListener("click", async () => {
    const amount = parseNum(document.getElementById("fAmount"));
    if (!amount || isNaN(amount)) { alert("Podaj kwotę"); return; }
    const type = document.getElementById("fType").value;
    await api.post("/api/transactions", {
      date: document.getElementById("fDate").value,
      type,
      amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
      category: document.getElementById("fCategory").value || "other",
      description: document.getElementById("fDesc").value,
    });
    document.getElementById("fAmount").value = "";
    document.getElementById("fDesc").value = "";
    await loadCats();
    loadTable();
  });

  await loadCats();
  await loadTable();
}

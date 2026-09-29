const CFG = window.APP_CONFIG || {};
const $ = id => document.getElementById(id);
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");

// ---- Tabs ----
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab,.panel").forEach(e => e.classList.remove("active"));
  t.classList.add("active");
  $(t.dataset.tab).classList.add("active");
}));

// ---- Core maths ----
function calcEMI(p, annualRate, years) {
  const r = annualRate / 12 / 100, n = years * 12;
  if (r === 0) return p / n;
  const f = Math.pow(1 + r, n);
  return (p * r * f) / (f - 1);
}
function maxLoanFromEMI(emi, annualRate, years) {
  const r = annualRate / 12 / 100, n = years * 12;
  if (r === 0) return emi * n;
  const f = Math.pow(1 + r, n);
  return (emi * (f - 1)) / (r * f);
}

// ---- Claude ----
async function askClaude(prompt) {
  const body = {
    model: CFG.CLAUDE_MODEL || "claude-sonnet-4-6",
    max_tokens: 700,
    system: "You are a concise, practical Indian personal-finance assistant. Use plain language, short bullet points, and amounts in INR. Do not promise loan approval.",
    messages: [{ role: "user", content: prompt }]
  };
  const headers = { "Content-Type": "application/json" };
  let url = CFG.CLAUDE_PROXY_URL;
  if (!url) {
    if (!CFG.CLAUDE_API_KEY) throw new Error("Add your Claude API key or proxy URL in config.js.");
    url = "https://api.anthropic.com/v1/messages";
    Object.assign(headers, {
      "x-api-key": CFG.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    });
  }
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Claude request failed (" + res.status + ").");
  const data = await res.json();
  return data.content.filter(c => c.type === "text").map(c => c.text).join("\n");
}

// ---- Google Sheets ----
function saveToSheet(record) {
  if (!CFG.SHEETS_WEBAPP_URL) return;
  fetch(CFG.SHEETS_WEBAPP_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ timestamp: new Date().toISOString(), ...record })
  }).catch(() => {});
}

function busy(btn, on, label) { btn.disabled = on; btn.textContent = on ? "Working…" : label; }

// ---- Loan eligibility ----
$("l-go").addEventListener("click", async e => {
  const btn = e.target, out = $("l-out");
  const v = id => parseFloat($(id).value);
  const income = v("l-income"), emis = v("l-emis") || 0, score = v("l-score"),
        amount = v("l-amount"), years = v("l-years"), rate = v("l-rate");
  if ([income, score, amount, years, rate].some(isNaN)) { out.innerHTML = '<p class="err">Fill in income, score, amount, tenure and rate.</p>'; return; }

  const newEMI = calcEMI(amount, rate, years);
  const foir = ((emis + newEMI) / income) * 100;
  const headroom = Math.max(0, income * 0.5 - emis);
  const maxLoan = maxLoanFromEMI(headroom, rate, years);
  const scoreOK = score >= 650, foirOK = foir <= 50;
  const status = scoreOK && foirOK ? ["Likely eligible", "ok"] : scoreOK || foirOK ? ["Borderline", "warn"] : ["Unlikely right now", "bad"];

  out.innerHTML = `<div class="card"><div class="big ${status[1]}">${status[0]}</div>
    <div class="stats">
      <div><span>New EMI</span>${inr(newEMI)}</div>
      <div><span>EMI-to-income</span>${foir.toFixed(1)}% (limit 50%)</div>
      <div><span>Credit score</span>${score} (min 650)</div>
      <div><span>Estimated max loan</span>${inr(maxLoan)}</div>
    </div></div><div class="card ai" id="l-ai">Getting AI analysis…</div>`;

  saveToSheet({ type: "loan", name: $("l-name").value, email: $("l-email").value, income, existingEMIs: emis, score, amount, years, rate, emi: Math.round(newEMI), foir: +foir.toFixed(1), result: status[0] });

  busy(btn, true, "Check eligibility");
  try {
    $("l-ai").textContent = await askClaude(`Applicant: monthly income ${inr(income)}, existing EMIs ${inr(emis)}, credit score ${score}. Wants ${inr(amount)} for ${years} years at ${rate}%. New EMI ${inr(newEMI)}, EMI-to-income ${foir.toFixed(1)}%, estimated max loan ${inr(maxLoan)}. Result: ${status[0]}. Explain the result in 3 bullets and give 3 specific steps to improve approval chances.`);
  } catch (err) { $("l-ai").innerHTML = `<span class="err">${err.message}</span>`; }
  busy(btn, false, "Check eligibility");
});

// ---- Credit score analyzer ----
$("c-go").addEventListener("click", async e => {
  const btn = e.target, out = $("c-out");
  const v = id => parseFloat($(id).value);
  const score = v("c-score"), util = v("c-util"), miss = v("c-miss") || 0, age = v("c-age"), enq = v("c-enq") || 0;
  if ([score, util, age].some(isNaN)) { out.innerHTML = '<p class="err">Fill in score, utilization and history length.</p>'; return; }

  const band = score >= 750 ? ["Excellent", "ok"] : score >= 700 ? ["Good", "ok"] : score >= 650 ? ["Fair", "warn"] : ["Needs work", "bad"];
  const factors = [
    [util <= 30 ? "ok" : "bad", `Utilization ${util}% ${util <= 30 ? "is healthy" : "is high; aim for under 30%"}`],
    [miss === 0 ? "ok" : "bad", miss === 0 ? "No missed payments" : `${miss} missed payment(s) are hurting your score`],
    [age >= 3 ? "ok" : "warn", `Credit history of ${age} yr ${age >= 3 ? "is solid" : "is short; keep old accounts open"}`],
    [enq <= 2 ? "ok" : "warn", `${enq} recent enquiries ${enq <= 2 ? "is fine" : "is many; pause new applications"}`]
  ];
  out.innerHTML = `<div class="card"><div class="big ${band[1]}">${band[0]} · ${score}</div>
    ${factors.map(f => `<p class="${f[0]}">• ${f[1]}</p>`).join("")}</div><div class="card ai" id="c-ai">Getting AI advice…</div>`;
  saveToSheet({ type: "credit", score, utilization: util, missed: miss, historyYears: age, enquiries: enq, band: band[0] });

  busy(btn, true, "Analyze score");
  try {
    $("c-ai").textContent = await askClaude(`Credit profile: score ${score}, utilization ${util}%, ${miss} missed payments, ${age} years history, ${enq} recent enquiries. Give a prioritized 4-step plan to improve the score, with realistic timelines.`);
  } catch (err) { $("c-ai").innerHTML = `<span class="err">${err.message}</span>`; }
  busy(btn, false, "Analyze score");
});

// ---- EMI calculator ----
$("e-go").addEventListener("click", () => {
  const p = parseFloat($("e-p").value), r = parseFloat($("e-r").value), y = parseFloat($("e-y").value);
  if ([p, r, y].some(isNaN) || p <= 0 || y <= 0) { $("e-out").innerHTML = '<p class="err">Enter a valid amount, rate and tenure.</p>'; return; }
  const emi = calcEMI(p, r, y), total = emi * y * 12;
  $("e-out").innerHTML = `<div class="card"><div class="big ok">${inr(emi)} / month</div>
    <div class="stats"><div><span>Principal</span>${inr(p)}</div><div><span>Total interest</span>${inr(total - p)}</div><div><span>Total payable</span>${inr(total)}</div></div></div>`;
  saveToSheet({ type: "emi", amount: p, rate: r, years: y, emi: Math.round(emi) });
});

// ---- AI tips ----
$("t-go").addEventListener("click", async e => {
  const q = $("t-q").value.trim(), out = $("t-out");
  if (!q) { out.innerHTML = '<p class="err">Type a question first.</p>'; return; }
  out.innerHTML = '<div class="card ai" id="t-ai">Thinking…</div>';
  busy(e.target, true, "Get tips");
  try {
    $("t-ai").textContent = await askClaude(q);
    saveToSheet({ type: "tips", question: q });
  } catch (err) { $("t-ai").innerHTML = `<span class="err">${err.message}</span>`; }
  busy(e.target, false, "Get tips");
});

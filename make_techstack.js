/**
 * Tech Stack slide — 4:3  960×720
 * Output: ~/Desktop/Tech_Stack_AI_Calorie_Tracker.pdf
 */
const puppeteer = require('puppeteer');
const path = require('path');
const os   = require('os');

const OUT = path.join(os.homedir(), 'Desktop', 'Tech_Stack_AI_Calorie_Tracker.pdf');

const HTML = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { width:960px; height:720px; font-family:-apple-system,'Segoe UI',sans-serif;
  background:#F0FDF4; overflow:hidden; }

/* subtle dot pattern */
.bg { position:absolute; inset:0;
  background-image:radial-gradient(circle, rgba(22,163,74,.12) 1px, transparent 1px);
  background-size:28px 28px; }
.glow1 { position:absolute; width:480px; height:380px; border-radius:50%;
  top:-120px; right:-60px;
  background:radial-gradient(ellipse, rgba(187,247,208,.55) 0%, transparent 70%); }
.glow2 { position:absolute; width:320px; height:260px; border-radius:50%;
  bottom:-60px; left:-40px;
  background:radial-gradient(ellipse, rgba(220,252,231,.6) 0%, transparent 70%); }

.root { position:relative; z-index:1; width:960px; height:720px;
  padding:28px 40px 20px; display:flex; flex-direction:column; gap:11px; }

/* ── Header ── */
.header { display:flex; align-items:center; justify-content:space-between; }
.title  { font-size:28px; font-weight:900; color:#14532D; }
.title em { color:#16A34A; font-style:normal; }
.phases { display:flex; align-items:center; gap:12px; }
.ph1 { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#15803D; }
.ph2 { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:#9CA3AF; }
.dot { width:8px; height:8px; border-radius:50%; }
.dot.green { background:#22C55E; box-shadow:0 0 5px rgba(34,197,94,.5); }
.dot.gray  { background:#D1D5DB; }

/* ── Divider ── */
.divider-row { display:flex; align-items:center; gap:10px; }
.div-lbl { font-size:9.5px; font-weight:700; letter-spacing:1.5px; white-space:nowrap; }
.div-lbl.active  { color:#16A34A; }
.div-lbl.planned { color:#9CA3AF; }
.div-line { flex:1; height:1px; }
.div-line.active  { background:linear-gradient(90deg,#86EFAC,transparent); }
.div-line.planned { background:linear-gradient(90deg,#D1D5DB,transparent); }

/* ── Grids ── */
.row1 { display:grid; grid-template-columns:1.15fr 1fr 1fr 0.8fr; gap:10px; }
.row2 { display:grid; grid-template-columns:1fr 1.2fr 1fr; gap:10px; }

/* ── Card ── */
.card { border-radius:12px; padding:13px 14px;
  display:flex; flex-direction:column; gap:7px; border:1px solid; }
.card.active  { background:#FFFFFF; border-color:#BBF7D0;
  box-shadow:0 2px 10px rgba(34,197,94,.1); }
.card.planned { background:#F9FAFB; border-color:#E5E7EB; }

.card-header { display:flex; align-items:center; gap:8px; }
.card-icon { font-size:18px; flex-shrink:0; }
.card-cat { font-size:9.5px; font-weight:700; letter-spacing:1px; }
.card.active  .card-cat { color:#16A34A; }
.card.planned .card-cat { color:#9CA3AF; }

.card-title { font-size:13.5px; font-weight:800; margin-top:-2px; }
.card.active  .card-title { color:#14532D; }
.card.planned .card-title { color:#9CA3AF; }

.items { display:flex; flex-direction:column; gap:4px; }
.item { display:flex; align-items:baseline; gap:7px; }
.item-name { font-size:11.5px; font-weight:700; }
.card.active  .item-name { color:#166534; }
.card.planned .item-name { color:#9CA3AF; }
.item-desc { font-size:10px; line-height:1.4; }
.card.active  .item-desc { color:#6B7280; }
.card.planned .item-desc { color:#D1D5DB; }

.sub-item { display:flex; align-items:baseline; gap:6px; padding-left:12px; }
.sub-item::before { content:'└'; font-size:9px; color:#D1D5DB; flex-shrink:0; }
.sub-item .item-desc { font-size:9.5px; }

/* ── Footer ── */
.footer { display:flex; align-items:center; justify-content:space-between; }
.git-row { display:flex; align-items:center; gap:8px;
  background:#FFFFFF; border:1px solid #BBF7D0;
  border-radius:9px; padding:7px 14px;
  box-shadow:0 1px 6px rgba(34,197,94,.1); }
.git-icon { font-size:15px; }
.git-name { font-size:11.5px; font-weight:700; color:#14532D; }
.git-desc { font-size:10px; color:#6B7280; }
.foot-chips { display:flex; gap:7px; }
.chip { font-size:9.5px; font-weight:600; color:#6B7280;
  background:#FFFFFF; padding:3px 9px;
  border-radius:10px; border:1px solid #E5E7EB; }
</style>
</head><body>
<div class="bg"></div>
<div class="glow1"></div><div class="glow2"></div>

<div class="root">

  <!-- Header -->
  <div class="header">
    <div class="title">Tech <em>Stack</em></div>
    <div class="phases">
      <div class="ph1"><div class="dot green"></div> Phase 1 — Current MVP</div>
      <div style="color:#D1D5DB;font-size:14px">|</div>
      <div class="ph2"><div class="dot gray"></div> Phase 2 — Planned</div>
    </div>
  </div>

  <!-- Phase 1 divider -->
  <div class="divider-row">
    <span class="div-lbl active">PHASE 1 · IMPLEMENTED</span>
    <div class="div-line active"></div>
  </div>

  <!-- Row 1 -->
  <div class="row1">

    <div class="card active">
      <div class="card-header"><span class="card-icon">📱</span><span class="card-cat">FRONTEND</span></div>
      <div class="card-title">React Native</div>
      <div class="items">
        <div class="item"><span class="item-name">React Native</span><span class="item-desc">iOS / Android UI framework</span></div>
        <div class="item"><span class="item-name">Expo SDK 54</span><span class="item-desc">Dev toolchain &amp; build</span></div>
        <div class="item"><span class="item-name">Expo Router</span><span class="item-desc">File-based page routing</span></div>
      </div>
    </div>

    <div class="card active">
      <div class="card-header"><span class="card-icon">🤗</span><span class="card-cat">AI SERVICE</span></div>
      <div class="card-title">Hugging Face</div>
      <div class="items">
        <div class="item"><span class="item-name">Inference API</span><span class="item-desc">Food image recognition</span></div>
        <div class="sub-item"><span class="item-desc">nateraw/food · 101 food classes</span></div>
      </div>
    </div>

    <div class="card active">
      <div class="card-header"><span class="card-icon">🥦</span><span class="card-cat">EXTERNAL DATA</span></div>
      <div class="card-title">USDA FoodData</div>
      <div class="items">
        <div class="item"><span class="item-name">FoodData Central</span><span class="item-desc">Official nutrition database</span></div>
        <div class="sub-item"><span class="item-desc">Calories · Protein · Fat · Carbs</span></div>
      </div>
    </div>

    <div class="card active">
      <div class="card-header"><span class="card-icon">🧮</span><span class="card-cat">LOGIC</span></div>
      <div class="card-title">BMR / TDEE</div>
      <div class="items">
        <div class="item"><span class="item-name">Mifflin-St Jeor</span><span class="item-desc">BMR formula</span></div>
        <div class="item"><span class="item-name">React Context</span><span class="item-desc">Global language state</span></div>
      </div>
    </div>

  </div>

  <!-- Phase 2 divider -->
  <div class="divider-row">
    <span class="div-lbl planned">PHASE 2 · PLANNED</span>
    <div class="div-line planned"></div>
  </div>

  <!-- Row 2 -->
  <div class="row2">

    <div class="card planned">
      <div class="card-header"><span class="card-icon" style="opacity:.4">⚙️</span><span class="card-cat">BACKEND</span></div>
      <div class="card-title">Node.js + Express</div>
      <div class="items">
        <div class="item"><span class="item-name">Node.js</span><span class="item-desc">JavaScript runtime</span></div>
        <div class="item"><span class="item-name">Express</span><span class="item-desc">Lightweight REST API</span></div>
      </div>
    </div>

    <div class="card planned">
      <div class="card-header"><span class="card-icon" style="opacity:.4">🗄️</span><span class="card-cat">DATABASE</span></div>
      <div class="card-title">MongoDB Atlas</div>
      <div class="items">
        <div class="item"><span class="item-name">Cloud NoSQL</span><span class="item-desc">User data · food logs · history</span></div>
        <div class="sub-item"><span class="item-desc">users · food_logs · meals</span></div>
      </div>
    </div>

    <div class="card planned">
      <div class="card-header"><span class="card-icon" style="opacity:.4">🔐</span><span class="card-cat">AUTHENTICATION</span></div>
      <div class="card-title">Firebase Auth</div>
      <div class="items">
        <div class="item"><span class="item-name">Google Sign-In</span><span class="item-desc">OAuth 2.0</span></div>
        <div class="item"><span class="item-name">Email / Password</span><span class="item-desc">Account system</span></div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="git-row">
      <span class="git-icon">🐙</span>
      <div>
        <div class="git-name">GitHub &nbsp;<span style="font-size:10px;font-weight:400;color:#6B7280">Version Control &amp; Deployment</span></div>
        <div class="git-desc">github.com/Taian-an/calorie-app &nbsp;·&nbsp; gh-pages branch → Web Deploy</div>
      </div>
    </div>
    <div class="foot-chips">
      <div class="chip">JavaScript ES2022</div>
      <div class="chip">No backend (Phase 1)</div>
      <div class="chip">100% client-side</div>
      <div class="chip">Chen Taian · 6632052</div>
    </div>
  </div>

</div>
</body></html>`;

(async () => {
  console.log('Generating Tech Stack slide...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(HTML, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.pdf({
    path: OUT,
    width:  '960px',
    height: '720px',
    printBackground: true,
    margin: { top:0, right:0, bottom:0, left:0 },
  });
  await browser.close();
  console.log(`✅  Saved → ${OUT}`);
})();

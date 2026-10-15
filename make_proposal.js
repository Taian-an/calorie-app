/**
 * SP Proposal — 4:3 Slide PDF Generator
 * 960 × 720 px per slide, 8 slides
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8082';
const OUT_PDF  = path.join(__dirname, 'SP_Proposal_AI_Calorie_Tracker.pdf');

const C = {
  darkGreen: '#14532D', midGreen: '#16A34A', accent: '#22C55E',
  light: '#F0FDF4', white: '#FFFFFF', gray: '#6B7280', border: '#E5E7EB',
  navy: '#0F172A',
};

// ── Slides ────────────────────────────────────────────────────────────────────

function slideCover() {
  return `<div class="slide cover-slide">
    <div class="cover-orb o1"></div><div class="cover-orb o2"></div>
    <div class="cover-inner">
      <div class="cover-tag">SENIOR PROJECT PROPOSAL · SP1 · 2025</div>
      <div style="font-size:56px;margin-bottom:10px">🥗</div>
      <h1 class="cover-h1">AI Calorie Tracker</h1>
      <p class="cover-sub">AI-Powered Food Recognition &amp; Personalised Nutrition Calculator</p>
      <div class="cover-bar"></div>
      <div class="cover-meta-row">
        <div class="cml">Chen Taian · 6632052</div>
        <div class="cmd">React Native · Expo SDK 54 · Hugging Face API · USDA FoodData Central</div>
      </div>
      <div class="cover-links">
        <div class="cl">🌐 taian-an.github.io/calorie-app</div>
        <div class="cl">📁 github.com/Taian-an/calorie-app</div>
      </div>
    </div>
  </div>`;
}

function slideProblem() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">PROBLEM STATEMENT</span>
      <h2>The Problem</h2>
    </div>
    <div class="slide-body">
      <div class="quote-box">
        "Every time I eat at the cafeteria, I have no idea how many calories I just consumed.
        Apps like MyFitnessPal require me to manually search every dish — I wanted something simpler:
        <strong>just take a photo.</strong>"
      </div>
      <div class="prob-grid">
        <div class="prob-card"><div class="pn">1</div><div>
          <div class="phead">Manual entry is slow &amp; inaccurate</div>
          <div class="pbod">Searching local dish names in English databases returns wrong or missing results.</div>
        </div></div>
        <div class="prob-card"><div class="pn">2</div><div>
          <div class="phead">Barcode scanners don't help</div>
          <div class="pbod">Cooked cafeteria meals and homemade food have no barcode to scan.</div>
        </div></div>
        <div class="prob-card"><div class="pn">3</div><div>
          <div class="phead">Generic goals ignore your body</div>
          <div class="pbod">A flat "2,000 kcal/day" doesn't account for age, height, weight or activity level.</div>
        </div></div>
        <div class="prob-card"><div class="pn">4</div><div>
          <div class="phead">No combined free solution</div>
          <div class="pbod">No free app offers AI photo recognition + personalised TDEE + macro planning together.</div>
        </div></div>
      </div>
    </div>
  </div>`;
}

function slideSolution() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">PROPOSED SOLUTION</span>
      <h2>How the App Solves It</h2>
    </div>
    <div class="slide-body">
      <div class="sol-row">
        <div class="sol-card">
          <div class="sol-icon">📸</div>
          <div class="sol-title">AI Food Recognition</div>
          <div class="sol-bod">Photo → Hugging Face <em>nateraw/food</em> model → USDA FoodData Central → calories &amp; macros in under 3 seconds.</div>
        </div>
        <div class="sol-card">
          <div class="sol-icon">🧮</div>
          <div class="sol-title">Personalised BMR / TDEE</div>
          <div class="sol-bod">Enter age, gender, height, weight, activity level → Mifflin-St Jeor equation gives your exact daily calorie target.</div>
        </div>
        <div class="sol-card">
          <div class="sol-icon">🥩</div>
          <div class="sol-title">Macro Planner</div>
          <div class="sol-bod"><strong>Muscle Gain · Fat Loss · Custom</strong> — split your TDEE into protein, carbohydrate and fat gram targets with progress bars.</div>
        </div>
      </div>
      <div class="flow-box">
        <div class="fb-col">
          <div class="fb-lbl">BMR / TDEE Flow</div>
          <div class="fb-steps">
            <div class="fs">User Input</div><span class="fa">→</span>
            <div class="fs">BMR<br/><small>Mifflin-St Jeor</small></div><span class="fa">→</span>
            <div class="fs">TDEE &amp; Macros</div>
          </div>
        </div>
        <div class="fb-div"></div>
        <div class="fb-col">
          <div class="fb-lbl">Food Recognition Flow</div>
          <div class="fb-steps">
            <div class="fs">Photo</div><span class="fa">→</span>
            <div class="fs">Hugging Face<br/><small>nateraw/food</small></div><span class="fa">→</span>
            <div class="fs">USDA Nutrition</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function slideUIUX(imgCalc, imgPlan, imgProfile) {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">UI / UX DESIGN</span>
      <h2>App Screens — Live Screenshots</h2>
    </div>
    <div class="slide-body uiux-body">
      <div class="screens-row">
        <div class="sw">
          <div class="pf"><img src="${imgCalc}" class="pi"/></div>
          <div class="sl">① BMR / TDEE Calculator</div>
          <div class="sd">Gender · Age · Height · Weight · Activity → calorie goal</div>
        </div>
        <div class="sw">
          <div class="pf"><img src="${imgPlan}" class="pi"/></div>
          <div class="sl">② Daily Macro Planner</div>
          <div class="sd">TDEE ring · BMR · Macro bars · Goal mode selector</div>
        </div>
        <div class="sw">
          <div class="pf"><img src="${imgProfile}" class="pi"/></div>
          <div class="sl">③ Profile &amp; Settings</div>
          <div class="sd">BMI · BMR · daily goal · body data · settings</div>
        </div>
      </div>
      <div class="feat-row">
        <div class="fc">🌍 7 Languages</div>
        <div class="fc">📷 AI Camera</div>
        <div class="fc">🎯 3 Goal Modes</div>
        <div class="fc">⚡ Instant Calculation</div>
        <div class="fc">📊 Macro Breakdown</div>
        <div class="fc">👤 Profile Page</div>
      </div>
    </div>
  </div>`;
}

function slideUseCases() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">USE CASES</span>
      <h2>Two Core User Scenarios</h2>
    </div>
    <div class="slide-body" style="display:flex;gap:20px;align-items:stretch">
      <div class="uc-card uc-blue">
        <div class="uc-num">01</div>
        <div class="uc-title">AI Food Logging</div>
        <div class="uc-sub">Camera → Recognition → Nutrition</div>
        <div class="uc-bod">A student at the cafeteria wants to know the nutrition of their meal without typing anything. They open the camera, point at the food, and tap shutter. The app identifies it via AI and instantly shows calories, protein, fat, and carbs.</div>
        <div class="uc-tags">
          <span class="ut">expo-camera</span><span class="ut">Hugging Face API</span><span class="ut">USDA FoodData</span>
        </div>
      </div>
      <div class="uc-card uc-green">
        <div class="uc-num">02</div>
        <div class="uc-title">Personalised Diet Planning</div>
        <div class="uc-sub">BMR → TDEE → Macro Targets</div>
        <div class="uc-bod">A gym-goer starting a muscle-gain programme needs their daily calorie and macro targets. They enter body data, select "Muscle Gain" mode, and receive protein, carb, and fat targets calculated from their actual TDEE.</div>
        <div class="uc-tags">
          <span class="ut">Mifflin-St Jeor</span><span class="ut">TDEE Calculation</span><span class="ut">Macro Planner</span>
        </div>
      </div>
    </div>
  </div>`;
}

function slideUC1() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">USE CASE 01</span>
      <h2>AI Food Logging — Step by Step</h2>
    </div>
    <div class="uc-split">
      <div class="uc-left">
        <div class="uc-meta"><strong>Actor:</strong> Student at cafeteria &nbsp;·&nbsp; <strong>Goal:</strong> Get nutrition without typing</div>
        <div class="steps">
          <div class="si"><div class="sn">1</div><div><div class="st">Open Camera Tab</div><div class="sb">Navigate to 📷 Camera. App requests camera permission on first launch.</div></div></div>
          <div class="si"><div class="sn">2</div><div><div class="st">Frame Food &amp; Tap Shutter</div><div class="sb">Point phone at meal → tap circular shutter button. Photo captured locally.</div></div></div>
          <div class="si"><div class="sn">3</div><div><div class="st">AI Recognition</div><div class="sb">Photo sent to <em>nateraw/food</em> via Hugging Face API → returns label + confidence, e.g. <code>"fried_rice — 94%"</code>.</div></div></div>
          <div class="si"><div class="sn">4</div><div><div class="st">Nutrition Lookup</div><div class="sb">Food label queried against USDA FoodData Central → Energy, Protein, Carbs, Fat per 100g.</div></div></div>
          <div class="si"><div class="sn">5</div><div><div class="st">Result Card Shown</div><div class="sb">Result card slides up with food name, confidence badge, 4 macro tiles. Total: ~2–3 seconds.</div></div></div>
        </div>
      </div>
      <div class="uc-right">
        <div class="uc-empty">Demo / Screenshot</div>
      </div>
    </div>
  </div>`;
}

function slideUC2() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">USE CASE 02</span>
      <h2>Personalised Diet Planning — Step by Step</h2>
    </div>
    <div class="uc-split">
      <div class="uc-left">
        <div class="uc-meta"><strong>Actor:</strong> Gym-goer (muscle-gain) &nbsp;·&nbsp; <strong>Goal:</strong> Get personalised macro targets</div>
        <div class="steps">
          <div class="si"><div class="sn">1</div><div><div class="st">Open Calculator Tab</div><div class="sb">Navigate to 🧮 Calculator tab → select gender (Male / Female).</div></div></div>
          <div class="si"><div class="sn">2</div><div><div class="st">Enter Body Data</div><div class="sb">Type age, height (cm), weight (kg). All three fields required before calculation.</div></div></div>
          <div class="si"><div class="sn">3</div><div><div class="st">Select Activity Level</div><div class="sb">Choose from 5 levels: Sedentary ×1.2 → Lightly Active ×1.375 → Moderate ×1.55 → Very Active ×1.725 → Athlete ×1.9.</div></div></div>
          <div class="si"><div class="sn">4</div><div><div class="st">View TDEE Result</div><div class="sb">Mifflin-St Jeor: BMR = 88.36 + 13.4×kg + 4.8×cm − 5.7×age. TDEE = BMR × factor. Shown in ring gauge.</div></div></div>
          <div class="si"><div class="sn">5</div><div><div class="st">Choose Goal Mode</div><div class="sb">Tap <strong>Muscle Gain</strong> → Protein 30% · Carbs 50% · Fat 20% — gram amounts &amp; kcal shown with progress bars.</div></div></div>
        </div>
      </div>
      <div class="uc-right">
        <div class="uc-empty">Demo / Screenshot</div>
      </div>
    </div>
  </div>`;
}

function slideRecap() {
  return `<div class="slide">
    <div class="slide-head">
      <span class="pill">RECAP</span>
      <h2>Summary</h2>
    </div>
    <div class="slide-body" style="display:flex;gap:18px">
      <div style="flex:1;display:flex;flex-direction:column;gap:12px">
        <div class="rc"><div class="ri">🎯</div><div><div class="rt">Problem</div><div class="rb">Manual food logging is slow &amp; inaccurate. Generic calorie goals ignore individual body data. No free app combines both.</div></div></div>
        <div class="rc"><div class="ri">💡</div><div><div class="rt">Solution</div><div class="rb">AI photo recognition (Hugging Face × USDA) + science-based personalised TDEE (Mifflin-St Jeor) in one cross-platform app.</div></div></div>
        <div class="rc"><div class="ri">✅</div><div><div class="rt">Technical Feasibility</div><div class="rb">Both APIs integrated &amp; tested. Web build live at <strong>taian-an.github.io/calorie-app</strong>. Public GitHub repo.</div></div></div>
        <div class="rc"><div class="ri">📱</div><div><div class="rt">UI/UX Design</div><div class="rb">4 screens: Calculator · Planner · Camera · Profile. Mobile-first, green design system, 7-language support.</div></div></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:0">
        <div class="rfb">
          <div class="rfbt">Addressing Reviewer Feedback</div>
          <div class="rr"><span class="rx">Previously:</span> Technical feasibility not demonstrated</div>
          <div class="rr"><span class="rok">Now:</span> Live demo + real API code + public GitHub repo</div>
          <div class="rr" style="margin-top:9px"><span class="rx">Previously:</span> No UI/UX design shown</div>
          <div class="rr"><span class="rok">Now:</span> Screenshots of all screens from the running build</div>
          <div class="rr" style="margin-top:9px"><span class="rx">Previously:</span> Slides mostly AI-generated</div>
          <div class="rr"><span class="rok">Now:</span> Personal motivation, real errors &amp; fixes, specific technical decisions</div>
        </div>
        <div class="recap-links">
          <div class="rl">🌐 taian-an.github.io/calorie-app</div>
          <div class="rl">📁 github.com/Taian-an/calorie-app</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── CSS (4:3, 960×720) ─────────────────────────────────────────────────────────
const CSS = `
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:-apple-system,'Segoe UI',sans-serif; background:#fff; }

.slide {
  width:960px; height:720px;
  padding:36px 48px 28px;
  page-break-after:always;
  display:flex; flex-direction:column;
  position:relative; overflow:hidden;
  background:#fff;
}

/* ── Cover ── */
.cover-slide { background:${C.darkGreen}; padding:44px 60px; justify-content:center; align-items:center; }
.cover-orb { position:absolute; border-radius:50%; }
.o1 { width:360px;height:360px;top:-100px;right:-80px;background:${C.midGreen};opacity:.28; }
.o2 { width:280px;height:280px;bottom:-80px;left:-60px;background:${C.midGreen};opacity:.2; }
.cover-inner { position:relative;z-index:1;text-align:center;color:#fff;width:100%; }
.cover-tag { font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.5);margin-bottom:12px; }
.cover-h1 { font-size:48px;font-weight:900;color:#fff;margin-bottom:8px;line-height:1.1; }
.cover-sub { font-size:15px;color:rgba(255,255,255,.75);margin-bottom:18px; }
.cover-bar { width:52px;height:3px;background:${C.accent};margin:0 auto 18px;border-radius:2px; }
.cover-meta-row { display:flex;justify-content:center;gap:28px;margin-bottom:12px; }
.cml { font-size:14px;font-weight:700;color:#fff; }
.cmd { font-size:12px;color:rgba(255,255,255,.65); }
.cover-links { display:flex;justify-content:center;gap:20px; }
.cl { font-size:12px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.1);
  padding:5px 12px;border-radius:20px; }

/* ── Header ── */
.slide-head { margin-bottom:16px; }
.pill { display:inline-block;background:${C.accent};color:#fff;font-size:10px;
  font-weight:700;letter-spacing:1.5px;padding:3px 9px;border-radius:20px;margin-bottom:6px; }
.slide-head h2 { font-size:24px;font-weight:900;color:${C.darkGreen}; }
.slide-body { flex:1;display:flex;flex-direction:column; }

/* ── Problem ── */
.quote-box { background:${C.light};border-left:4px solid ${C.accent};padding:11px 15px;
  border-radius:7px;font-size:12.5px;color:${C.darkGreen};line-height:1.65;font-style:italic;margin-bottom:14px; }
.prob-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1; }
.prob-card { display:flex;gap:10px;align-items:flex-start;background:#F9FAFB;
  border:1px solid ${C.border};border-radius:9px;padding:12px; }
.pn { width:24px;height:24px;border-radius:50%;background:${C.accent};color:#fff;
  font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.phead { font-size:12px;font-weight:700;color:${C.darkGreen};margin-bottom:3px; }
.pbod { font-size:11px;color:${C.gray};line-height:1.5; }

/* ── Solution ── */
.sol-row { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px; }
.sol-card { background:${C.light};border:1px solid #BBF7D0;border-radius:11px;padding:14px; }
.sol-icon { font-size:24px;margin-bottom:6px; }
.sol-title { font-size:13px;font-weight:700;color:${C.darkGreen};margin-bottom:5px; }
.sol-bod { font-size:11px;color:#374151;line-height:1.55; }
.flow-box { background:${C.navy};border-radius:9px;padding:12px 16px;display:flex;
  align-items:center;gap:12px; }
.fb-col { flex:1;display:flex;flex-direction:column;gap:7px; }
.fb-lbl { font-size:10px;font-weight:700;color:${C.accent};letter-spacing:.5px; }
.fb-steps { display:flex;align-items:center;gap:6px; }
.fs { background:#1E3A5F;color:#fff;padding:7px 10px;border-radius:7px;
  font-size:10.5px;font-weight:700;text-align:center;line-height:1.35; }
.fs small { display:block;font-weight:400;opacity:.75;font-size:9.5px; }
.fa { color:${C.accent};font-size:14px;font-weight:700; }
.fb-div { width:1px;background:rgba(255,255,255,.15);align-self:stretch; }

/* ── UI/UX ── */
.uiux-body { justify-content:space-between; }
.screens-row { display:flex;gap:20px;justify-content:center;margin-bottom:12px; }
.sw { display:flex;flex-direction:column;align-items:center; }
.pf { width:168px;height:340px;border-radius:22px;border:7px solid #1F2937;
  overflow:hidden;background:#000;box-shadow:0 8px 24px rgba(0,0,0,.22); }
.pi { width:100%;height:100%;object-fit:cover;object-position:top; }
.sl { font-size:11.5px;font-weight:700;color:${C.darkGreen};margin-top:8px;text-align:center; }
.sd { font-size:10px;color:${C.gray};text-align:center;line-height:1.4;margin-top:3px;max-width:170px; }
.feat-row { display:flex;flex-wrap:wrap;gap:7px; }
.fc { background:${C.light};border:1px solid ${C.accent};color:${C.darkGreen};
  font-size:10.5px;font-weight:600;padding:4px 10px;border-radius:18px; }

/* ── Use Cases overview ── */
.uc-card { flex:1;border-radius:14px;padding:22px;display:flex;flex-direction:column;gap:9px; }
.uc-blue { background:#EFF6FF;border:1px solid #BFDBFE; }
.uc-green { background:${C.light};border:1px solid #BBF7D0; }
.uc-num { font-size:44px;font-weight:900;opacity:.12;line-height:1;color:${C.darkGreen}; }
.uc-title { font-size:19px;font-weight:900;color:${C.darkGreen}; }
.uc-sub { font-size:11.5px;font-weight:600;color:${C.accent}; }
.uc-bod { font-size:12px;color:#374151;line-height:1.6;flex:1; }
.uc-tags { display:flex;flex-wrap:wrap;gap:5px; }
.ut { background:rgba(34,197,94,.15);color:${C.darkGreen};font-size:10px;
  font-weight:700;padding:3px 8px;border-radius:10px; }

/* ── UC detail ── */
.uc-split { display:flex;gap:0;flex:1; }
.uc-left { flex:1;padding-right:20px;border-right:2px dashed ${C.border};
  display:flex;flex-direction:column;gap:8px; }
.uc-right { width:260px;padding-left:20px;display:flex;align-items:center;justify-content:center; }
.uc-empty { color:#D1D5DB;font-size:12px;font-weight:600;border:2px dashed #E5E7EB;
  border-radius:10px;width:100%;height:100%;min-height:360px;
  display:flex;align-items:center;justify-content:center; }
.uc-meta { font-size:11px;color:${C.gray};margin-bottom:2px; }
.steps { display:flex;flex-direction:column;gap:8px; }
.si { display:flex;gap:10px;align-items:flex-start; }
.sn { width:24px;height:24px;border-radius:50%;background:${C.darkGreen};color:#fff;
  font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px; }
.st { font-size:12px;font-weight:700;color:${C.darkGreen};margin-bottom:2px; }
.sb { font-size:11px;color:#374151;line-height:1.5; }
code { background:#F1F5F9;padding:1px 4px;border-radius:3px;font-size:10px;font-family:monospace; }

/* ── Recap ── */
.rc { display:flex;gap:10px;align-items:flex-start;background:#F9FAFB;
  border:1px solid ${C.border};border-radius:10px;padding:11px; }
.ri { font-size:20px;flex-shrink:0; }
.rt { font-size:12px;font-weight:700;color:${C.darkGreen};margin-bottom:3px; }
.rb { font-size:11px;color:#374151;line-height:1.5; }
.rfb { background:${C.navy};border-radius:9px;padding:14px 16px;flex:1; }
.rfbt { font-size:11px;font-weight:700;color:#94A3B8;margin-bottom:9px;letter-spacing:.5px; }
.rr { font-size:11.5px;line-height:1.6; }
.rx { color:#FCA5A5;font-weight:700;margin-right:5px; }
.rok { color:#86EFAC;font-weight:700;margin-right:5px; }
.recap-links { display:flex;flex-direction:column;gap:7px;margin-top:10px; }
.rl { background:${C.light};border:1px solid ${C.accent};color:${C.darkGreen};
  font-size:11.5px;font-weight:600;padding:7px 12px;border-radius:7px; }

@media print { .slide { page-break-after:always; } }
`;

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new', protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Screenshots at mobile viewport
  const shotPage = await browser.newPage();
  await shotPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  async function capture(url) {
    await shotPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));
    const buf = await shotPage.screenshot({ type: 'jpeg', quality: 90 });
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }

  console.log('Screenshot: Calculator...');
  const imgCalc    = await capture(`${BASE_URL}/`);
  console.log('Screenshot: Plan...');
  const imgPlan    = await capture(`${BASE_URL}/plan?tdee=2141&bmr=1784`);
  console.log('Screenshot: Profile...');
  const imgProfile = await capture(`${BASE_URL}/profile`);
  await shotPage.close();

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>SP Proposal — AI Calorie Tracker</title>
<style>${CSS}</style>
</head><body>
${slideCover()}
${slideProblem()}
${slideSolution()}
${slideUIUX(imgCalc, imgPlan, imgProfile)}
${slideUseCases()}
${slideUC1()}
${slideUC2()}
${slideRecap()}
</body></html>`;

  const htmlPath = OUT_PDF.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`HTML saved: ${htmlPath}`);

  console.log('Rendering PDF (4:3)...');
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await pdfPage.pdf({
    path: OUT_PDF,
    width:  '960px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`\n✅  PDF (4:3) → ${OUT_PDF}`);
})();

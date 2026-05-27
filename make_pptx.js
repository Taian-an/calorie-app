const pptxgen = require("/Users/chentaian/.local/lib/node_modules/pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Senior Project";
pres.title = "Calorie Tracker AI App";

const C = {
  darkGreen:  "1B4332",
  midGreen:   "2D6A4F",
  accent:     "52B788",
  light:      "D8F3DC",
  white:      "FFFFFF",
  offWhite:   "F8FAF9",
  textDark:   "1A1A2E",
  textGray:   "4A5568",
  textLight:  "95D5B2",
};

// Slide height = 5.625"; safe bottom boundary = 5.4"
const BOTTOM = 5.4;
const LEFT   = 0.18;  // accent bar width

function accentBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.07, h: 5.625,
    fill: { color: C.accent }, line: { color: C.accent },
  });
}

function pill(slide, label) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: LEFT + 0.12, y: 0.18, w: 1.6, h: 0.3,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  slide.addText(label, {
    x: LEFT + 0.12, y: 0.18, w: 1.6, h: 0.3,
    fontSize: 9, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
}

function slideTitle(slide, text) {
  slide.addText(text, {
    x: LEFT + 0.12, y: 0.58, w: 9.5, h: 0.65,
    fontSize: 30, bold: true, color: C.darkGreen,
    fontFace: "Georgia", align: "left", valign: "middle", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════
// Slide 1 — Title
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.darkGreen };

  sl.addShape(pres.shapes.OVAL, {
    x: 7.2, y: -0.6, w: 3.8, h: 3.8,
    fill: { color: C.midGreen, transparency: 45 },
    line: { color: C.midGreen, transparency: 45 },
  });
  sl.addShape(pres.shapes.OVAL, {
    x: -1.0, y: 3.8, w: 3.0, h: 3.0,
    fill: { color: C.midGreen, transparency: 55 },
    line: { color: C.midGreen, transparency: 55 },
  });

  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.6, w: 0.07, h: 2.2,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  sl.addText("Calorie Tracker AI App", {
    x: 0.78, y: 1.55, w: 8.5, h: 1.3,
    fontSize: 40, bold: true, color: C.white,
    fontFace: "Georgia", align: "left", valign: "middle", margin: 0,
  });
  sl.addText("AI-Powered Food Recognition & Nutrition Calculator", {
    x: 0.78, y: 2.9, w: 7.8, h: 0.65,
    fontSize: 18, color: "A7D7B8",
    fontFace: "Calibri", align: "left", valign: "middle", margin: 0,
  });
  // Icon — bottom-right corner
  sl.addImage({
    path: "/Users/chentaian/Documents/my_claude_project/calorie-app/avatars/final_icon_nobg.png",
    x: 7.7, y: 3.4, w: 2.1, h: 2.1,
  });

  sl.addText("Senior Project Presentation  |  2025", {
    x: 0.78, y: 4.8, w: 6, h: 0.4,
    fontSize: 12, color: "7DB59A",
    fontFace: "Calibri", align: "left", valign: "middle", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════
// Slide 2 — Team Members
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.darkGreen };

  // Decorative circles
  sl.addShape(pres.shapes.OVAL, {
    x: 8.5, y: -1.2, w: 3.0, h: 3.0,
    fill: { color: C.midGreen, transparency: 50 },
    line: { color: C.midGreen, transparency: 50 },
  });
  sl.addShape(pres.shapes.OVAL, {
    x: -1.2, y: 4.0, w: 2.5, h: 2.5,
    fill: { color: C.midGreen, transparency: 55 },
    line: { color: C.midGreen, transparency: 55 },
  });

  // Title
  sl.addText("Team Members", {
    x: 0.5, y: 0.22, w: 9.0, h: 0.75,
    fontSize: 30, bold: true, color: C.white,
    fontFace: "Georgia", align: "center", valign: "middle", margin: 0,
  });

  // Accent underline strip
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 3.8, y: 1.02, w: 2.4, h: 0.06,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  const AVPATH = "/Users/chentaian/Documents/my_claude_project/calorie-app/avatars/";
  const members = [
    { file: "member_6632052_sq.jpg", id: "6632052" },
    { file: "member_6630083_sq.jpg", id: "6630083" },
    { file: "member_6630027_sq.jpg", id: "6630027" },
  ];

  const photoSize = 2.2;
  const gapX     = 1.13;
  const startX   = (10 - 3 * photoSize - 2 * gapX) / 2;  // 0.535
  const photoY   = 1.3;

  members.forEach((m, i) => {
    const x = startX + i * (photoSize + gapX);

    // Accent ring border behind photo
    sl.addShape(pres.shapes.OVAL, {
      x: x - 0.1, y: photoY - 0.1, w: photoSize + 0.2, h: photoSize + 0.2,
      fill: { color: C.accent }, line: { color: C.accent },
    });

    // Circular photo
    sl.addImage({
      path: AVPATH + m.file,
      x, y: photoY, w: photoSize, h: photoSize,
      rounding: true,
    });

    // Student ID badge
    sl.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.15, y: photoY + photoSize + 0.22,
      w: photoSize - 0.3, h: 0.52,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(m.id, {
      x: x + 0.15, y: photoY + photoSize + 0.22,
      w: photoSize - 0.3, h: 0.52,
      fontSize: 16, bold: true, color: C.white,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 3 — Problem Statement
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "BACKGROUND");
  slideTitle(sl, "Problem Statement");

  const problems = [
    { num: "1", text: "Tracking daily calories manually is tedious and error-prone" },
    { num: "2", text: "Existing apps require searching food databases by name — slow and inaccurate" },
    { num: "3", text: "No easy way to get nutrition info simply by taking a photo of food" },
    { num: "4", text: "No single app combines personalized BMR/TDEE calculation with AI food recognition" },
  ];

  problems.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = LEFT + 0.12 + col * 4.8;
    const y = 1.45 + row * 1.25;
    const w = 4.55;
    const h = 1.1;

    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h,
      fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
      shadow: { type: "outer", blur: 5, offset: 2, angle: 135, color: "000000", opacity: 0.07 },
    });
    // number badge fully inside the card
    sl.addShape(pres.shapes.OVAL, {
      x: x + 0.18, y: y + 0.28, w: 0.5, h: 0.5,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(p.num, {
      x: x + 0.18, y: y + 0.28, w: 0.5, h: 0.5,
      fontSize: 13, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    sl.addText(p.text, {
      x: x + 0.82, y: y + 0.08, w: 3.6, h: 0.94,
      fontSize: 12.5, color: C.textDark,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
  });

  // Target users banner — keep 0.3" above bottom
  const bannerY = BOTTOM - 0.85;
  sl.addShape(pres.shapes.RECTANGLE, {
    x: LEFT + 0.12, y: bannerY, w: 9.45, h: 0.8,
    fill: { color: C.light }, line: { color: C.accent, width: 1 },
  });
  sl.addText([
    { text: "Target Users: ", options: { bold: true, color: C.darkGreen } },
    { text: "Health-conscious individuals, students, athletes, and people on diet plans", options: { color: C.midGreen } },
  ], {
    x: LEFT + 0.28, y: bannerY, w: 9.1, h: 0.8,
    fontSize: 13, fontFace: "Calibri", align: "left", valign: "middle",
  });
}

// ══════════════════════════════════════════════════════════
// Slide 3 — Existing Solutions
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "LANDSCAPE");
  slideTitle(sl, "Existing Solutions");

  const rows = [
    [
      { text: "Approach",                          opts: { bold: true, color: C.white, fill: { color: C.midGreen }, align: "center" } },
      { text: "Pros",                              opts: { bold: true, color: C.white, fill: { color: C.midGreen }, align: "center" } },
      { text: "Cons",                              opts: { bold: true, color: C.white, fill: { color: C.midGreen }, align: "center" } },
    ],
    [
      { text: "Manual calorie apps (e.g. MyFitnessPal)", opts: { bold: true,  color: C.textDark, fill: { color: C.white },   align: "left" } },
      { text: "Large food database",               opts: { color: C.midGreen,  fill: { color: "EAF7EE" }, align: "left" } },
      { text: "Tedious manual search; time-consuming", opts: { color: "9B2335", fill: { color: "FDECEA" }, align: "left" } },
    ],
    [
      { text: "Barcode scanners",                  opts: { bold: true,  color: C.textDark, fill: { color: C.offWhite }, align: "left" } },
      { text: "Fast for packaged food",            opts: { color: C.midGreen,  fill: { color: "EAF7EE" }, align: "left" } },
      { text: "Doesn't work for cooked or homemade meals", opts: { color: "9B2335", fill: { color: "FDECEA" }, align: "left" } },
    ],
    [
      { text: "Generic diet calculators",          opts: { bold: true,  color: C.textDark, fill: { color: C.white },   align: "left" } },
      { text: "Simple to use",                     opts: { color: C.midGreen,  fill: { color: "EAF7EE" }, align: "left" } },
      { text: "No food recognition; static data only", opts: { color: "9B2335", fill: { color: "FDECEA" }, align: "left" } },
    ],
  ];

  const tableData = rows.map(row =>
    row.map(cell => ({ text: cell.text, options: { ...cell.opts } }))
  );

  sl.addTable(tableData, {
    x: LEFT + 0.12, y: 1.42, w: 9.45, h: 2.75,
    colW: [2.9, 2.5, 4.05],
    border: { pt: 1, color: "D1E8D9" },
    fontSize: 13,
    fontFace: "Calibri",
  });

  const bannerY = BOTTOM - 0.85;
  sl.addShape(pres.shapes.RECTANGLE, {
    x: LEFT + 0.12, y: bannerY, w: 9.45, h: 0.8,
    fill: { color: C.darkGreen }, line: { color: C.darkGreen },
  });
  sl.addText("Conclusion: No existing solution combines AI photo recognition + personalized TDEE calculation in one tool", {
    x: LEFT + 0.25, y: bannerY, w: 9.2, h: 0.8,
    fontSize: 13, bold: true, color: C.white,
    fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// ══════════════════════════════════════════════════════════
// Slide 4 — Our Solution
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "SOLUTION");
  slideTitle(sl, "Our Solution");

  sl.addText("Calorie Tracker AI App", {
    x: LEFT + 0.12, y: 1.28, w: 9.4, h: 0.4,
    fontSize: 16, color: C.accent, bold: true,
    fontFace: "Calibri", align: "left", valign: "middle", margin: 0,
  });

  const features = [
    { num: "01", head: "Photo → AI Recognition", body: "Take a photo of any food; AI identifies it automatically" },
    { num: "02", head: "Hugging Face Model",      body: "Uses the 'nateraw/food' model for accurate food classification" },
    { num: "03", head: "Real Nutrition Data",      body: "Fetches calories & macros from the USDA FoodData Central API" },
    { num: "04", head: "Personalized BMR & TDEE", body: "Calculated using the Mifflin-St Jeor Equation with activity multipliers" },
    { num: "05", head: "Instant Macro Breakdown", body: "Displays Protein / Fat / Carbohydrate targets on the same screen" },
  ];

  features.forEach((f, i) => {
    const y = 1.72 + i * 0.74;
    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 0.12, y, w: 9.45, h: 0.62,
      fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
    });
    // badge fully inside card
    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 0.12, y, w: 0.72, h: 0.62,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(f.num, {
      x: LEFT + 0.12, y, w: 0.72, h: 0.62,
      fontSize: 13, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    sl.addText([
      { text: f.head + "   ", options: { bold: true, color: C.darkGreen } },
      { text: f.body, options: { color: C.textGray } },
    ], {
      x: LEFT + 0.96, y, w: 8.7, h: 0.62,
      fontSize: 13, fontFace: "Calibri", align: "left", valign: "middle",
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 5 — Value Proposition
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "VALUE");
  slideTitle(sl, "Value Proposition");

  const values = [
    { num: "1", head: "Instant Food Recognition",    body: "Just take a photo — no manual database search needed" },
    { num: "2", head: "Personalized Nutrition Goals", body: "BMR & TDEE calculated from your personal body data" },
    { num: "3", head: "Science-Based Accuracy",       body: "Uses the Mifflin-St Jeor Equation, trusted by nutrition science" },
    { num: "4", head: "Real Nutrition Data",          body: "Powered by USDA FoodData Central — not estimates or guesswork" },
  ];

  const cardH = 1.7;
  const cardW = 4.55;

  values.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = LEFT + 0.12 + col * 4.8;
    const y = 1.42 + row * (cardH + 0.22);

    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
      shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.07 },
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 0.07,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    // number circle — solid accent fill, consistent style
    sl.addShape(pres.shapes.OVAL, {
      x: x + 0.18, y: y + 0.22, w: 0.52, h: 0.52,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(v.num, {
      x: x + 0.18, y: y + 0.22, w: 0.52, h: 0.52,
      fontSize: 14, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    sl.addText(v.head, {
      x: x + 0.82, y: y + 0.18, w: 3.6, h: 0.55,
      fontSize: 14, bold: true, color: C.darkGreen,
      fontFace: "Georgia", align: "left", valign: "middle",
    });
    sl.addText(v.body, {
      x: x + 0.18, y: y + 0.82, w: 4.2, h: 0.78,
      fontSize: 13, color: C.textGray,
      fontFace: "Calibri", align: "left", valign: "top",
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 6 — Use Cases
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "USE CASES");
  slideTitle(sl, "Use Cases");

  const cases = [
    {
      title: "Daily Diet Tracking",
      color: C.accent,
      bullets: [
        "User takes a photo of their meal",
        "App identifies food and returns calorie + macro breakdown instantly",
      ],
    },
    {
      title: "Personalized TDEE Planning",
      color: C.midGreen,
      bullets: [
        "Input: age, gender, height, weight, activity level",
        "Output: BMR, TDEE, and macro targets (Protein 30% / Fat 25% / Carbs 45%)",
      ],
    },
    {
      title: "Fitness & Weight Management",
      color: C.darkGreen,
      bullets: [
        "Athletes and dieters monitor intake vs. daily energy needs",
        "Helps users stay consistently within their calorie goals",
      ],
    },
  ];

  const cardH = 3.15;
  const cardW = 2.95;

  cases.forEach((c, i) => {
    const x = LEFT + 0.12 + i * (cardW + 0.2);
    const y = 1.42;

    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
      shadow: { type: "outer", blur: 5, offset: 2, angle: 135, color: "000000", opacity: 0.07 },
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 0.52,
      fill: { color: c.color }, line: { color: c.color },
    });
    sl.addText(`Use Case ${i + 1}`, {
      x, y, w: cardW, h: 0.52,
      fontSize: 11, bold: true, color: C.white,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
    });
    sl.addText(c.title, {
      x: x + 0.14, y: y + 0.6, w: cardW - 0.28, h: 0.7,
      fontSize: 14, bold: true, color: C.darkGreen,
      fontFace: "Georgia", align: "left", valign: "top",
    });
    sl.addText(c.bullets.map((b, bi) => ({
      text: b,
      options: { bullet: true, breakLine: bi < c.bullets.length - 1 },
    })), {
      x: x + 0.14, y: y + 1.38, w: cardW - 0.28, h: 1.9,
      fontSize: 12.5, color: C.textGray,
      fontFace: "Calibri", align: "left", valign: "top",
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 7 — Tech Stack
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "TECHNOLOGY");
  slideTitle(sl, "Tech Stack");

  // Column headers
  const hdrY = 1.38;
  const cols = [
    { x: LEFT + 0.12, w: 1.8,  label: "Layer" },
    { x: LEFT + 2.08, w: 3.5,  label: "Technology" },
    { x: LEFT + 5.72, w: 3.95, label: "Details" },
  ];
  cols.forEach(col => {
    sl.addShape(pres.shapes.RECTANGLE, {
      x: col.x, y: hdrY, w: col.w, h: 0.4,
      fill: { color: C.midGreen }, line: { color: C.midGreen },
    });
    sl.addText(col.label, {
      x: col.x, y: hdrY, w: col.w, h: 0.4,
      fontSize: 12, bold: true, color: C.white,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
    });
  });

  const stack = [
    { layer: "Frontend",        tech: "React Native + Expo",                 detail: "Cross-platform iOS & Android mobile app" },
    { layer: "AI Recognition",  tech: "Hugging Face API",                    detail: "Food classification using the nateraw/food model" },
    { layer: "Nutrition Data",  tech: "USDA FoodData Central API",           detail: "Real-world nutritional database — calories, macros" },
    { layer: "Calculation",     tech: "Mifflin-St Jeor Equation",            detail: "Science-based BMR with activity-level multipliers" },
    { layer: "Navigation",      tech: "Expo Router",                         detail: "File-based screen routing for the app" },
    { layer: "Camera",          tech: "expo-camera plugin",                  detail: "Native camera capture on iOS & Android" },
    { layer: "HTTP Client",     tech: "Axios",                               detail: "API requests to Hugging Face and USDA" },
  ];

  const rowH = 0.51;
  stack.forEach((s, i) => {
    const y = hdrY + 0.4 + i * rowH;
    const bg = i % 2 === 0 ? C.white : C.offWhite;

    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 0.12, y, w: 1.8, h: rowH,
      fill: { color: bg }, line: { color: "D1E8D9", width: 1 },
    });
    sl.addText(s.layer, {
      x: LEFT + 0.18, y, w: 1.68, h: rowH,
      fontSize: 11, bold: true, color: C.accent,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 2.08, y, w: 3.5, h: rowH,
      fill: { color: bg }, line: { color: "D1E8D9", width: 1 },
    });
    sl.addText(s.tech, {
      x: LEFT + 2.14, y, w: 3.38, h: rowH,
      fontSize: 13, bold: true, color: C.darkGreen,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 5.72, y, w: 3.95, h: rowH,
      fill: { color: bg }, line: { color: "D1E8D9", width: 1 },
    });
    sl.addText(s.detail, {
      x: LEFT + 5.78, y, w: 3.83, h: rowH,
      fontSize: 12.5, color: C.textDark,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 8 — System Architecture (single column, 7 steps)
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "ARCHITECTURE");
  slideTitle(sl, "System Architecture");

  const steps = [
    "User inputs personal data (age, gender, height, weight, activity level)",
    "App calculates BMR using the Mifflin-St Jeor formula",
    "BMR × Activity Factor = TDEE  →  daily macro targets generated",
    "User takes a photo of food via the built-in camera",
    "Image sent to Hugging Face API  →  food label returned (e.g. 'fried rice')",
    "Food label queried against the USDA FoodData Central API",
    "Nutrition data (calories, protein, fat, carbs) displayed to the user",
  ];

  const rowH = 0.54;
  const startY = 1.42;

  steps.forEach((text, i) => {
    const y = startY + i * (rowH + 0.06);

    sl.addShape(pres.shapes.RECTANGLE, {
      x: LEFT + 0.12, y, w: 9.45, h: rowH,
      fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
    });
    sl.addShape(pres.shapes.OVAL, {
      x: LEFT + 0.18, y: y + 0.06, w: 0.42, h: 0.42,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(String(i + 1), {
      x: LEFT + 0.18, y: y + 0.06, w: 0.42, h: 0.42,
      fontSize: 12, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    sl.addText(text, {
      x: LEFT + 0.76, y, w: 8.7, h: rowH,
      fontSize: 13, color: C.textDark,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
  });
}

// ══════════════════════════════════════════════════════════
// Slide 9 — Architecture Diagram (Flowchart)
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: "0D1B2A" }; // dark navy

  // ── Title ──
  sl.addText("SYSTEM ARCHITECTURE", {
    x: 0.3, y: 0.12, w: 9.4, h: 0.58,
    fontSize: 26, bold: true, color: "FFFFFF",
    fontFace: "Georgia", align: "center", valign: "middle",
    charSpacing: 5, margin: 0,
  });

  // ── Box helper ──
  const dbox = (x, y, w, h, label, sub, fill) => {
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h,
      fill: { color: fill },
      line: { color: "52B788", width: 1.5 },
    });
    if (sub) {
      sl.addText([
        { text: label, options: { bold: true, breakLine: true } },
        { text: sub,   options: { fontSize: 9.5, color: "95D5B2" } },
      ], {
        x, y, w, h,
        fontSize: 13, color: "FFFFFF",
        fontFace: "Calibri", align: "center", valign: "middle",
      });
    } else {
      sl.addText(label, {
        x, y, w, h,
        fontSize: 13, bold: true, color: "FFFFFF",
        fontFace: "Calibri", align: "center", valign: "middle",
      });
    }
  };

  // ── Line helper ──
  const ln = (x, y, w, h) => {
    sl.addShape(pres.shapes.LINE, {
      x, y, w, h,
      line: { color: "52B788", width: 1.5 },
    });
  };

  // ── Arrow ▼ helper ──
  const arw = (cx, y) => {
    sl.addText("▼", {
      x: cx - 0.15, y: y - 0.22, w: 0.3, h: 0.22,
      fontSize: 10, color: "52B788",
      align: "center", valign: "middle", margin: 0,
    });
  };

  // ── Layout ──
  //  G (top center): React Native/Expo App
  //  A B Bc (left col): User Input → BMR Calculator → TDEE & Macros
  //  D E F  (right col): Camera → Hugging Face → USDA FoodData
  //  H (bottom center): Results Screen

  const bW  = 2.6;   // box width
  const bH  = 0.68;  // box height
  const lX  = 0.52;  // left col x
  const rX  = 6.88;  // right col x

  // Centers
  const lCx = lX + bW / 2;  // 1.82
  const rCx = rX + bW / 2;  // 8.18

  // Top box G
  const gX = 3.2; const gW = 3.6; const gY = 0.88;
  const gCx = gX + gW / 2;  // 5.0
  dbox(gX, gY, gW, bH, "React Native / Expo App", "Expo Router  ·  expo-camera  ·  Axios", "2D6A4F");

  // Left column
  const aY = 1.85; dbox(lX, aY, bW, bH, "User Profile Screen", "age · gender · height · weight · activity", "1A3A5C");
  const bY = 2.80; dbox(lX, bY, bW, bH, "BMR Calculator",       "Mifflin-St Jeor Equation", "2D6A4F");
  const cY = 3.75; dbox(lX, cY, bW, bH, "TDEE & Macro Targets", "Protein 30% / Fat 25% / Carbs 45%", "1B4332");

  // Right column
  const dY = 1.85; dbox(rX, dY, bW, bH, "Camera Module",    "expo-camera plugin", "1A3A5C");
  const eY = 2.80; dbox(rX, eY, bW, bH, "Hugging Face API", "nateraw/food model", "0F3D3D");
  const fY = 3.75; dbox(rX, fY, bW, bH, "USDA FoodData API","nutrition database lookup", "0F3D3D");

  // Bottom box H
  const hX = 2.7; const hW = 4.6; const hY = 4.72;
  const hCx = hX + hW / 2;  // 5.0
  dbox(hX, hY, hW, bH, "Results Screen", "Calories · Protein · Fat · Carbohydrates", "52B788");

  // ── Connecting lines ──
  const gBy = gY + bH; // 1.56  — G bottom

  // G → horizontal fork at jY=1.75
  const jY = 1.75;
  ln(gCx, gBy, 0, jY - gBy);       // G down to junction (0.19")
  ln(lCx, jY,  rCx - lCx, 0);      // horizontal fork
  ln(lCx, jY,  0, aY - jY);        // left drop to A (0.10")
  ln(rCx, jY,  0, dY - jY);        // right drop to D

  // A→B, B→C (left)
  ln(lCx, aY + bH, 0, bY - (aY + bH));  // 2.53→2.80 = 0.27"
  ln(lCx, bY + bH, 0, cY - (bY + bH));  // 3.48→3.75 = 0.27"

  // D→E, E→F (right)
  ln(rCx, dY + bH, 0, eY - (dY + bH));
  ln(rCx, eY + bH, 0, fY - (eY + bH));

  // C & F → H bottom merge at mY
  const cBy = cY + bH; // 4.43
  const mY  = hY - 0.18; // 4.54
  ln(lCx, cBy, 0, mY - cBy);        // left stem down
  ln(rCx, cBy, 0, mY - cBy);        // right stem down
  ln(lCx, mY,  rCx - lCx, 0);       // horizontal merge
  ln(hCx, mY,  0, hY - mY);         // center drop to H

  // ── Arrow indicators ──
  arw(lCx, aY);        // into A
  arw(rCx, dY);        // into D
  arw(lCx, bY);        // into B
  arw(rCx, eY);        // into E
  arw(lCx, cY);        // into C
  arw(rCx, fY);        // into F
  arw(hCx, hY);        // into H

  // ── Column labels ──
  sl.addText("BMR / TDEE Flow", {
    x: lX, y: 1.65, w: bW, h: 0.2,
    fontSize: 9, color: "52B788", bold: true,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
  });
  sl.addText("Food Recognition Flow", {
    x: rX, y: 1.65, w: bW, h: 0.2,
    fontSize: 9, color: "52B788", bold: true,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════
// Slide 10 — Limitations & Future Improvements
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.offWhite };

  accentBar(sl);
  pill(sl, "ROADMAP");
  slideTitle(sl, "Limitations & Future Improvements");

  const colY = 1.42;
  const colH = 3.65;
  const colW = 4.45;

  // Limitations column
  sl.addShape(pres.shapes.RECTANGLE, {
    x: LEFT + 0.12, y: colY, w: colW, h: colH,
    fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: LEFT + 0.12, y: colY, w: colW, h: 0.48,
    fill: { color: C.midGreen }, line: { color: C.midGreen },
  });
  sl.addText("Current Limitations", {
    x: LEFT + 0.12, y: colY, w: colW, h: 0.48,
    fontSize: 14, bold: true, color: C.white,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
  });
  sl.addText([
    { text: "Food recognition accuracy depends on image quality", options: { bullet: true, breakLine: true } },
    { text: "Portion size detection is not included in the MVP", options: { bullet: true, breakLine: true } },
    { text: "Nutrition data is estimated, not clinically precise", options: { bullet: true } },
  ], {
    x: LEFT + 0.28, y: colY + 0.55, w: colW - 0.35, h: colH - 0.65,
    fontSize: 13, color: C.textDark,
    fontFace: "Calibri", align: "left", valign: "top",
  });

  // Future Improvements column
  const col2X = LEFT + 0.12 + colW + 0.2;
  const col2W = 9.45 - colW - 0.2;

  sl.addShape(pres.shapes.RECTANGLE, {
    x: col2X, y: colY, w: col2W, h: colH,
    fill: { color: C.white }, line: { color: "D1E8D9", width: 1 },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: col2X, y: colY, w: col2W, h: 0.48,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  sl.addText("Future Improvements", {
    x: col2X, y: colY, w: col2W, h: 0.48,
    fontSize: 14, bold: true, color: C.white,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
  });
  sl.addText([
    { text: "Portion size estimation via computer vision", options: { bullet: true, breakLine: true } },
    { text: "Barcode scanning for packaged food", options: { bullet: true, breakLine: true } },
    { text: "Meal history tracking & weekly reports", options: { bullet: true, breakLine: true } },
    { text: "AI-based personalized diet recommendations", options: { bullet: true, breakLine: true } },
    { text: "Integration with wearables (Apple Watch, Fitbit)", options: { bullet: true } },
  ], {
    x: col2X + 0.15, y: colY + 0.55, w: col2W - 0.25, h: colH - 0.65,
    fontSize: 13, color: C.textDark,
    fontFace: "Calibri", align: "left", valign: "top",
  });
}

// ══════════════════════════════════════════════════════════
// Slide 10 — Conclusion
// ══════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: C.darkGreen };

  sl.addShape(pres.shapes.OVAL, {
    x: 7.2, y: -0.5, w: 3.6, h: 3.6,
    fill: { color: C.midGreen, transparency: 50 },
    line: { color: C.midGreen, transparency: 50 },
  });
  sl.addShape(pres.shapes.OVAL, {
    x: -0.8, y: 3.6, w: 2.8, h: 2.8,
    fill: { color: C.midGreen, transparency: 60 },
    line: { color: C.midGreen, transparency: 60 },
  });

  sl.addText("Conclusion", {
    x: 0.55, y: 0.35, w: 6, h: 0.75,
    fontSize: 34, bold: true, color: C.white,
    fontFace: "Georgia", align: "left", valign: "middle", margin: 0,
  });

  const points = [
    { label: "Problem",  text: "Users cannot easily track food nutrition without tedious manual lookup" },
    { label: "Solution", text: "AI-powered photo recognition + personalized TDEE calculator in one app" },
    { label: "Value",    text: "Save time · Improve accuracy · Support a healthier lifestyle" },
  ];

  points.forEach((p, i) => {
    const y = 1.3 + i * 1.2;
    sl.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y, w: 9.0, h: 1.0,
      fill: { color: C.midGreen, transparency: 35 },
      line: { color: C.accent, width: 1 },
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y, w: 1.4, h: 1.0,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    sl.addText(p.label, {
      x: 0.55, y, w: 1.4, h: 1.0,
      fontSize: 13, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    sl.addText(p.text, {
      x: 2.1, y, w: 7.3, h: 1.0,
      fontSize: 14, color: C.white,
      fontFace: "Calibri", align: "left", valign: "middle",
    });
  });

  sl.addText("Thank you for listening!", {
    x: 0.55, y: 4.95, w: 9.0, h: 0.45,
    fontSize: 16, bold: true, color: C.textLight,
    fontFace: "Georgia", align: "center", valign: "middle", margin: 0,
  });
}

pres.writeFile({ fileName: "/Users/chentaian/Documents/my_claude_project/calorie-app/Calorie_App_Presentation.pptx" })
  .then(() => console.log("Done: Calorie_App_Presentation.pptx"))
  .catch(e => { console.error(e); process.exit(1); });

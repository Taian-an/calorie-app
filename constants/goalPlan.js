/*
 * Goal plan: calorie and macro targets for a Goal, and whether a Goal plan may be created.
 *
 * SHARED FILE. The app (calorie-app/constants/goalPlan.js) and the server
 * (calorie-server/services/goalPlan.js) run this exact file, so the screen and the API
 * always agree. Edit it in the app repo, then copy it to the server repo;
 * calorie-server/test/goalPlan.sync.test.js fails while the two copies differ.
 * CommonJS with no imports so it runs unchanged in Node and in Metro.
 *
 * Model and its limits (see GLOSSARY "Goal plan", "Goal change"):
 * - 1 kg of body weight ≈ 7,700 kcal. This is a rough average; real change also depends on
 *   water, body composition and metabolic adaptation, so a target date or weight is an
 *   estimate, never a promise. The Adaptive adjustment corrects the Target from the real
 *   Weight trend every few weeks.
 * - The rate and calorie limits in GOAL_POLICY are conservative product defaults chosen by
 *   the engineering team, not medical rules. Review them with a qualified professional
 *   before relying on them, and change them here only.
 */

const GOAL_POLICY = Object.freeze({
  kcalPerKg: 7700,
  // Accepted input ranges (product limits, metric).
  limits: Object.freeze({
    weightKg: Object.freeze({ min: 30, max: 250 }),
    tdeeKcal: Object.freeze({ min: 800, max: 6000 }),
    timelineDays: Object.freeze({ min: 7, max: 1095 }), // one week to three years
  }),
  // Within this many kg of the current weight a Goal weight counts as "the same".
  maintainToleranceKg: 0.3,
  // Fastest accepted weekly change, as % of current body weight. A plan above warnFraction of
  // the maximum is allowed but flagged as aggressive.
  rate: Object.freeze({
    cut: Object.freeze({ maxWeeklyPercent: 1.0 }),
    bulk: Object.freeze({ maxWeeklyPercent: 0.25 }),
    warnFraction: 0.75,
  }),
  calories: Object.freeze({
    // Lowest daily Target the app will plan for, by sex. 'other' (not stated) uses the midpoint.
    minimumBySex: Object.freeze({ female: 1200, male: 1500, other: 1350 }),
    // Largest daily surplus approved without review when building muscle.
    maxSurplusKcal: 500,
  }),
  // Plans that change weight are not offered under this age; maintaining still is.
  minAgeForWeightChange: 18,
  // Fixed Goal change for older profiles that have no Goal weight or target date.
  legacyGoalChangeKcal: Object.freeze({ cut: -400, bulk: 300 }),
  // Grams of protein per kg of body weight, and fat as a share of calories with a floor per kg.
  macros: Object.freeze({
    cut: Object.freeze({ proteinPerKg: 2.0, fatShare: 0.25 }),
    bulk: Object.freeze({ proteinPerKg: 1.8, fatShare: 0.25 }),
    maintain: Object.freeze({ proteinPerKg: 1.6, fatShare: 0.30 }),
    maxProteinShare: 0.35,
    minFatPerKg: 0.6,
  }),
});

const GOAL_TYPES = ['cut', 'bulk', 'maintain'];

const STATUS = Object.freeze({
  VALID: 'valid',
  WARNING: 'warning',
  INVALID_INPUT: 'invalid_input',
  INSUFFICIENT_INFORMATION: 'insufficient_information',
  POLICY_RESTRICTED: 'policy_restricted',
  GOAL_TOO_AGGRESSIVE: 'goal_too_aggressive',
  CALORIE_LIMIT_EXCEEDED: 'calorie_limit_exceeded',
});

// Stable codes for the frontend and translations. Never rename one; add new ones instead.
const CODES = Object.freeze({
  GOAL_TYPE_INVALID: 'GOAL_TYPE_INVALID',
  WEIGHT_INVALID: 'WEIGHT_INVALID',
  WEIGHT_OUT_OF_RANGE: 'WEIGHT_OUT_OF_RANGE',
  TARGET_WEIGHT_INVALID: 'TARGET_WEIGHT_INVALID',
  TARGET_WEIGHT_OUT_OF_RANGE: 'TARGET_WEIGHT_OUT_OF_RANGE',
  TDEE_INVALID: 'TDEE_INVALID',
  TDEE_OUT_OF_RANGE: 'TDEE_OUT_OF_RANGE',
  TARGET_DATE_INVALID: 'TARGET_DATE_INVALID',
  TARGET_DATE_NOT_FUTURE: 'TARGET_DATE_NOT_FUTURE',
  TIMELINE_TOO_SHORT: 'TIMELINE_TOO_SHORT',
  TIMELINE_TOO_LONG: 'TIMELINE_TOO_LONG',
  CUT_TARGET_NOT_LOWER: 'CUT_TARGET_NOT_LOWER',
  BULK_TARGET_NOT_HIGHER: 'BULK_TARGET_NOT_HIGHER',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  AGE_BELOW_MINIMUM: 'AGE_BELOW_MINIMUM',
  RATE_TOO_FAST: 'RATE_TOO_FAST',
  CALORIES_BELOW_MINIMUM: 'CALORIES_BELOW_MINIMUM',
  SURPLUS_TOO_LARGE: 'SURPLUS_TOO_LARGE',
  // warnings
  RATE_AGGRESSIVE: 'RATE_AGGRESSIVE',
  MAINTAIN_TARGET_IGNORED: 'MAINTAIN_TARGET_IGNORED',
  // suggestion
  NO_FEASIBLE_TIMELINE: 'NO_FEASIBLE_TIMELINE',
});

/* ── Body and energy ─────────────────────────────────────────────── */

const ACTIVITY_FACTORS = Object.freeze({ sedentary: 1.2, lightly: 1.375, moderately: 1.55, very: 1.725, extra: 1.9 });

function activityFactor(activity) {
  return ACTIVITY_FACTORS[activity] || 1.2;
}

// Harris-Benedict. 'other' (not stated) takes the average of the male and female formulas.
function calcBmr(gender, weight, height, age) {
  const male = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  const female = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  if (gender === 'male') return male;
  if (gender === 'female') return female;
  return (male + female) / 2;
}

/* ── Dates (a Day is YYYY-MM-DD in the user's time zone) ───────────── */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayNumber(key) {
  const m = DATE_RE.exec(String(key));
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  // Reject 2026-02-30 and the like.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;
  return t / 86400000;
}

function isValidDateKey(key) {
  return Number.isFinite(dayNumber(key));
}

function daysBetween(fromKey, toKey) {
  return dayNumber(toKey) - dayNumber(fromKey);
}

function addDays(key, n) {
  return new Date((dayNumber(key) + n) * 86400000).toISOString().slice(0, 10);
}

/* ── Calculation ──────────────────────────────────────────────────── */

const isNum = v => typeof v === 'number' && Number.isFinite(v);

function calorieMinimum(sex, policy = GOAL_POLICY) {
  const table = policy.calories.minimumBySex;
  return table[sex] != null ? table[sex] : null;
}

// Numbers for a plan whose inputs are already known to be valid.
function calculateGoalNumbers({ goalType, currentWeightKg, targetWeightKg, days, tdee }, policy = GOAL_POLICY) {
  if (goalType === 'maintain') {
    return {
      weightChangeKg: 0, weeklyChangeKg: 0, weeklyRatePercent: 0,
      dailyAdjustmentKcal: 0, estimatedDailyCalories: tdee, days: null,
    };
  }
  const weightChangeKg = targetWeightKg - currentWeightKg;
  const weeklyChangeKg = (weightChangeKg * 7) / days;
  const weeklyRatePercent = (Math.abs(weeklyChangeKg) / currentWeightKg) * 100;
  const magnitude = (Math.abs(weightChangeKg) * policy.kcalPerKg) / days;
  const dailyAdjustmentKcal = goalType === 'cut' ? -magnitude : magnitude;
  return {
    weightChangeKg, weeklyChangeKg, weeklyRatePercent, dailyAdjustmentKcal,
    estimatedDailyCalories: calculateCalorieTarget({ tdee, dailyAdjustmentKcal }), days,
  };
}

// Target before any Adaptive adjustment: TDEE plus the signed Goal change.
function calculateCalorieTarget({ tdee, dailyAdjustmentKcal = 0 }) {
  return tdee + dailyAdjustmentKcal;
}

// Protein from body weight (capped as a share of calories), then fat (share of calories, never
// under a per-kg floor), then carbohydrates from what is left. Grams are rounded and carbs are
// derived from the rounded protein and fat, so the macros add up to the calories within a few kcal.
function calculateMacroTargets({ calories, weightKg, goalType }, policy = GOAL_POLICY) {
  if (!isNum(calories) || calories <= 0) return null;
  const rule = policy.macros[goalType] || policy.macros.maintain;
  const maxProtein = (calories * policy.macros.maxProteinShare) / 4;
  const protein = Math.round(isNum(weightKg) && weightKg > 0
    ? Math.min(rule.proteinPerKg * weightKg, maxProtein)
    : (calories * 0.20) / 4);
  const fatWanted = Math.max((calories * rule.fatShare) / 9, isNum(weightKg) ? policy.macros.minFatPerKg * weightKg : 0);
  const fat = Math.round(Math.max(0, Math.min(fatWanted, (calories - protein * 4) / 9)));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, fat, carbs, kcal: protein * 4 + carbs * 4 + fat * 9 };
}

/* ── Validation ───────────────────────────────────────────────────── */

const issue = (code, params) => (params ? { code, params } : { code });

function checkNumber(errors, value, range, invalidCode, rangeCode) {
  if (!isNum(value) || value <= 0) { errors.push(issue(invalidCode)); return false; }
  if (value < range.min || value > range.max) { errors.push(issue(rangeCode, { min: range.min, max: range.max })); return false; }
  return true;
}

/*
 * validateGoal(input) → GoalValidationResult
 *   input: { goalType, currentWeightKg, targetWeightKg, targetDate, todayKey, tdee, sex, age }
 *   result: {
 *     allowed, status, errors: [{ code, params? }], warnings: [{ code, params? }],
 *     estimate?: { days, weightChangeKg, weeklyChangeKg, weeklyRatePercent, dailyAdjustmentKcal,
 *                  estimatedDailyCalories, calorieMinimum },
 *     suggestion?: { days, targetDate, estimate }   // present only after it passed validation itself
 *   }
 * It never changes the inputs; a rejected plan stays rejected until the user changes it.
 */
function validateGoal(input, policy = GOAL_POLICY, { withSuggestion = true } = {}) {
  const { goalType, currentWeightKg, targetWeightKg, targetDate, todayKey, tdee, sex, age } = input || {};
  const errors = [];
  const warnings = [];
  const done = (status, extra) => ({
    allowed: status === STATUS.VALID || status === STATUS.WARNING, status, errors, warnings, ...extra,
  });

  // A. Input
  if (!GOAL_TYPES.includes(goalType)) errors.push(issue(CODES.GOAL_TYPE_INVALID));
  checkNumber(errors, currentWeightKg, policy.limits.weightKg, CODES.WEIGHT_INVALID, CODES.WEIGHT_OUT_OF_RANGE);
  checkNumber(errors, tdee, policy.limits.tdeeKcal, CODES.TDEE_INVALID, CODES.TDEE_OUT_OF_RANGE);

  const changing = goalType === 'cut' || goalType === 'bulk';
  let days = null;
  if (changing) {
    checkNumber(errors, targetWeightKg, policy.limits.weightKg, CODES.TARGET_WEIGHT_INVALID, CODES.TARGET_WEIGHT_OUT_OF_RANGE);
    if (!isValidDateKey(targetDate) || !isValidDateKey(todayKey)) {
      errors.push(issue(CODES.TARGET_DATE_INVALID));
    } else {
      days = daysBetween(todayKey, targetDate);
      if (days <= 0) errors.push(issue(CODES.TARGET_DATE_NOT_FUTURE));
      else if (days < policy.limits.timelineDays.min) errors.push(issue(CODES.TIMELINE_TOO_SHORT, { minDays: policy.limits.timelineDays.min }));
      else if (days > policy.limits.timelineDays.max) errors.push(issue(CODES.TIMELINE_TOO_LONG, { maxDays: policy.limits.timelineDays.max }));
    }
    if (isNum(currentWeightKg) && isNum(targetWeightKg)) {
      const diff = targetWeightKg - currentWeightKg;
      if (goalType === 'cut' && diff >= -policy.maintainToleranceKg) errors.push(issue(CODES.CUT_TARGET_NOT_LOWER));
      if (goalType === 'bulk' && diff <= policy.maintainToleranceKg) errors.push(issue(CODES.BULK_TARGET_NOT_HIGHER));
    }
  }
  if (errors.length) return done(STATUS.INVALID_INPUT);

  // Maintenance: no weight change, Target = TDEE. A different Goal weight is ignored, with a note.
  if (goalType === 'maintain') {
    if (isNum(targetWeightKg) && Math.abs(targetWeightKg - currentWeightKg) > policy.maintainToleranceKg) {
      warnings.push(issue(CODES.MAINTAIN_TARGET_IGNORED));
    }
    const minimum = calorieMinimum(sex, policy);
    return done(warnings.length ? STATUS.WARNING : STATUS.VALID, {
      estimate: { ...calculateGoalNumbers({ goalType, currentWeightKg, tdee }, policy), calorieMinimum: minimum },
    });
  }

  // B. Information needed to judge safety
  const minimum = calorieMinimum(sex, policy);
  if (minimum == null || !isNum(age)) {
    errors.push(issue(CODES.PROFILE_INCOMPLETE));
    return done(STATUS.INSUFFICIENT_INFORMATION);
  }
  if (age < policy.minAgeForWeightChange) {
    errors.push(issue(CODES.AGE_BELOW_MINIMUM, { minAge: policy.minAgeForWeightChange }));
    return done(STATUS.POLICY_RESTRICTED);
  }

  // C. Rate and calories
  const numbers = calculateGoalNumbers({ goalType, currentWeightKg, targetWeightKg, days, tdee }, policy);
  const estimate = { ...numbers, calorieMinimum: minimum };
  const maxPercent = policy.rate[goalType].maxWeeklyPercent;
  let status = STATUS.VALID;

  if (numbers.weeklyRatePercent > maxPercent + 1e-9) {
    errors.push(issue(CODES.RATE_TOO_FAST, { maxWeeklyPercent: maxPercent }));
    status = STATUS.GOAL_TOO_AGGRESSIVE;
  }
  if (goalType === 'cut' && numbers.estimatedDailyCalories < minimum) {
    errors.push(issue(CODES.CALORIES_BELOW_MINIMUM, { minimum }));
    if (status === STATUS.VALID) status = STATUS.CALORIE_LIMIT_EXCEEDED;
  }
  if (goalType === 'bulk' && numbers.dailyAdjustmentKcal > policy.calories.maxSurplusKcal + 1e-9) {
    errors.push(issue(CODES.SURPLUS_TOO_LARGE, { maxSurplus: policy.calories.maxSurplusKcal }));
    if (status === STATUS.VALID) status = STATUS.CALORIE_LIMIT_EXCEEDED;
  }
  if (status === STATUS.VALID && numbers.weeklyRatePercent > maxPercent * policy.rate.warnFraction) {
    warnings.push(issue(CODES.RATE_AGGRESSIVE, { maxWeeklyPercent: maxPercent }));
    status = STATUS.WARNING;
  }

  if (status === STATUS.VALID || status === STATUS.WARNING || !withSuggestion) return done(status, { estimate });

  // D. Suggest a longer timeline, but only one that passes validation itself.
  const suggestion = suggestFeasibleTimeline(input, policy);
  if (suggestion.ok) return done(status, { estimate, suggestion: { days: suggestion.days, targetDate: suggestion.targetDate, estimate: suggestion.estimate } });
  warnings.push(issue(CODES.NO_FEASIBLE_TIMELINE, { reason: suggestion.reason }));
  return done(status, { estimate });
}

/*
 * The shortest timeline that meets every limit for this goal:
 *   - weekly rate:  days ≥ |Δkg| × 7 / (maxWeeklyPercent% × current weight)
 *   - cutting:      days ≥ |Δkg| × 7700 / (TDEE − calorie minimum)
 *   - bulking:      days ≥ |Δkg| × 7700 / max surplus
 * The stricter one wins, it is checked again with validateGoal, and it is offered only if it passes.
 * → { ok: true, days, targetDate, estimate } | { ok: false, reason }
 */
function suggestFeasibleTimeline(input, policy = GOAL_POLICY) {
  const { goalType, currentWeightKg, targetWeightKg, todayKey, tdee, sex } = input || {};
  if (goalType !== 'cut' && goalType !== 'bulk') return { ok: false, reason: 'not_needed' };
  const minimum = calorieMinimum(sex, policy);
  if (!isNum(currentWeightKg) || !isNum(targetWeightKg) || !isNum(tdee) || minimum == null || !isValidDateKey(todayKey)) {
    return { ok: false, reason: 'insufficient_information' };
  }
  const deltaKg = Math.abs(targetWeightKg - currentWeightKg);
  const maxWeeklyKg = (policy.rate[goalType].maxWeeklyPercent / 100) * currentWeightKg;
  let days = Math.ceil((deltaKg * 7) / maxWeeklyKg);

  if (goalType === 'cut') {
    const room = tdee - minimum;
    if (room <= 0) return { ok: false, reason: 'tdee_below_minimum' };
    days = Math.max(days, Math.ceil((deltaKg * policy.kcalPerKg) / room));
  } else {
    days = Math.max(days, Math.ceil((deltaKg * policy.kcalPerKg) / policy.calories.maxSurplusKcal));
  }
  days = Math.max(days, policy.limits.timelineDays.min);

  // Rounding can leave the boundary a hair over a limit; step forward a few days at most.
  for (let extra = 0; extra < 7; extra++) {
    const d = days + extra;
    if (d > policy.limits.timelineDays.max) return { ok: false, reason: 'exceeds_max_timeline' };
    const targetDate = addDays(todayKey, d);
    const check = validateGoal({ ...input, targetDate }, policy, { withSuggestion: false });
    if (check.allowed) return { ok: true, days: d, targetDate, estimate: check.estimate };
    if (check.status !== STATUS.GOAL_TOO_AGGRESSIVE && check.status !== STATUS.CALORIE_LIMIT_EXCEEDED) {
      return { ok: false, reason: check.status };
    }
  }
  return { ok: false, reason: 'no_feasible_timeline' };
}

/* ── Daily Target for a saved profile ─────────────────────────────── */

// Turn a profile (kg, cm, profile field names) into validateGoal input.
function goalInputFromProfile(p, todayKey) {
  return {
    goalType: p.goal, currentWeightKg: p.weight, targetWeightKg: p.targetWeight,
    targetDate: p.goalDate, todayKey, tdee: p.tdee, sex: p.gender, age: p.age,
  };
}

/*
 * The daily Target for a saved profile:
 *   TDEE + Goal change + Adaptive adjustment.
 * planStatus:
 *   'ok'            the Goal plan passes validation; its Goal change is used as is.
 *   'needs_review'  the plan no longer passes (for example the weight moved since it was set,
 *                   or the Goal weight has been reached). The Goal change falls back to the
 *                   largest one the policy allows towards the Goal weight (0 once it is reached),
 *                   and the user is asked to review the plan. Calories are never cut further to
 *                   force the original date.
 *   'no_plan'       a cut or bulk without a Goal weight or target date (older profiles): a small
 *                   fixed change within the same limits.
 *   'maintain'      Target = TDEE.
 * An Adaptive adjustment never takes the Target below the calorie minimum.
 */
function resolveDailyTarget(p, todayKey, policy = GOAL_POLICY) {
  const tdee = p.tdee;
  const adjustment = isNum(p.targetAdjustment) ? p.targetAdjustment : 0;
  const minimum = calorieMinimum(p.gender, policy) ?? policy.calories.minimumBySex.other;
  const finish = (goalChange, planStatus, validation) => {
    const base = tdee + goalChange;
    // A negative Adaptive adjustment may lower the Target down to the minimum, not past it.
    // (If the base itself is under the minimum, as for a very small person maintaining, it stays.)
    const target = adjustment < 0 ? Math.max(base + adjustment, Math.min(base, minimum)) : base + adjustment;
    return { target, goalChange, planStatus, validation };
  };
  if (!isNum(tdee)) return { target: null, goalChange: 0, planStatus: 'no_plan', validation: null };
  if (p.goal !== 'cut' && p.goal !== 'bulk') return finish(0, 'maintain', null);

  const safeMax = () => {
    const ratePerDay = ((policy.rate[p.goal].maxWeeklyPercent / 100) * p.weight * policy.kcalPerKg) / 7;
    return p.goal === 'cut'
      ? Math.max(0, Math.min(ratePerDay, tdee - minimum))
      : Math.min(ratePerDay, policy.calories.maxSurplusKcal);
  };

  if (!isNum(p.targetWeight) || !p.goalDate) {
    const legacy = Math.abs(policy.legacyGoalChangeKcal[p.goal]);
    const change = Math.min(legacy, safeMax());
    return finish(p.goal === 'cut' ? -change : change, 'no_plan', null);
  }

  const validation = validateGoal(goalInputFromProfile(p, todayKey), policy, { withSuggestion: false });
  if (validation.allowed) return finish(validation.estimate.dailyAdjustmentKcal, 'ok', validation);

  const stillToGo = p.goal === 'cut' ? p.weight - p.targetWeight : p.targetWeight - p.weight;
  if (!(stillToGo > policy.maintainToleranceKg)) return finish(0, 'needs_review', validation);
  const days = isValidDateKey(p.goalDate) ? daysBetween(todayKey, p.goalDate) : 0;
  const wanted = days > 0 ? (stillToGo * policy.kcalPerKg) / days : Infinity;
  const change = Math.min(wanted, safeMax());
  return finish(p.goal === 'cut' ? -change : change, 'needs_review', validation);
}

module.exports = {
  GOAL_POLICY, GOAL_TYPES, STATUS, CODES, ACTIVITY_FACTORS,
  activityFactor, calcBmr,
  isValidDateKey, daysBetween, addDays,
  calorieMinimum, calculateGoalNumbers, calculateCalorieTarget, calculateMacroTargets,
  validateGoal, suggestFeasibleTimeline, goalInputFromProfile, resolveDailyTarget,
};

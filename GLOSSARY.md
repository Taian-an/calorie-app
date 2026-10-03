# Calorie Tracks

An AI calorie tracker: people log what they eat, AI estimates nutrition from a photo or a description, and an AI coach answers questions. This glossary is shared by the app and the back end.

## People

**Account**:
One person, identified by their email address. Signing in with Google or with a password under the same email reaches the same Account.
_Avoid_: User (in conversation), login

**Sign-in method**:
A way to reach an Account: Google or email and password. An Account can have more than one.

**Profile**:
The body details and Goal an Account holder provides (sex, age, height, weight, activity level, Goal), from which the Target is worked out. Not the Account as a whole.
_Avoid_: Account, settings

## Time

**Day**:
A calendar date in the user's own time zone, running from their local midnight to the next. Every per-day concept (the food diary, daily allowances, the coach's "today") uses this day.
_Avoid_: UTC date, server date

## Food logging

**AI Analysis**:
One request asking the AI to estimate a food's nutrition, from one or more photos, a text description, or both. Photo and text requests are the same thing and count the same.
_Avoid_: Scan (except as a button label for taking a photo), recognition, 辨識

**Item**:
One component the AI picks out within a single AI Analysis (for example the chicken, rice and greens in a bento). Items belong to the analysis result; they are not separate Entries.
_Avoid_: Component, sub-entry

**Entry**:
One food the user has logged on a Day, with its amount and nutrition. A whole bento analysed by AI is one Entry, not one per Item.
_Avoid_: Meal (for a single food), food record, log

**Meal**:
A slot within a Day that groups Entries: breakfast, lunch, dinner or snack. An Entry belongs to exactly one Meal and can be moved to another Meal of the same Day.
_Avoid_: Meal type (in conversation), 餐別

**Source**:
Where an Entry's nutrition came from: an AI Analysis, a barcode product from Open Food Facts, or the user's manual input.

## Coach

**Coach**:
The AI nutrition and fitness coach the user chats with. It knows the user's Profile, Target and today's Entries. Conversations are not kept.
_Avoid_: Chatbot, assistant

**Coach message**:
One message the user sends to the Coach. Each one that gets a reply uses one of the day's allowance; the Coach's replies do not.

## Goals

**Goal**:
The direction the user is working towards: lose fat, build muscle, or maintain weight.
_Avoid_: Target, 目標 (on its own)

**Target**:
The user's daily calorie goal in kcal, worked out from their Goal and body details and adjustable by hand. Each Day keeps the Target that applied on that Day, so changing it later does not rewrite past Days.
_Avoid_: Goal, calorie budget

## Plans and limits

**Plan**:
The tier a user is on: either **Free** or **Premium**. A user is on exactly one plan at a time.
_Avoid_: Membership, tier, 付費身分

**Free**:
The default plan. AI Analyses and coach messages are limited by a daily allowance.

**Premium**:
The paid plan. AI Analyses and coach messages are unlimited to the user, subject only to the fair-use cap. Described publicly as "unlimited (fair use)".

**Subscription**:
A recurring purchase made in the Android app through Google Play that gives a user Premium while it is active, wherever they sign in, including the web app. One of two ways to get Premium.
_Avoid_: Using "subscription" to mean Premium itself

**Grant**:
Premium given to a user by an admin without any purchase (for example the demo account or a friend's trial). An admin can grant or revoke it for any Account. A grant is not a subscription, and an admin cannot change a Subscription. A user is Premium while either one is active.
_Avoid_: Comp, manual subscription

**Daily allowance**:
How many AI Analyses (5) and coach messages (5) a Free user gets per day. Failed AI Analyses do not use it up.
_Avoid_: Quota, credits

**Fair-use cap**:
The anti-abuse ceiling on a Premium user's daily AI Analyses and coach messages (50 each). A safeguard, not a selling point.
_Avoid_: Premium limit, daily allowance (for Premium)

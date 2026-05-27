# 🥗 AI Calorie Tracker

A cross-platform mobile app built with **React Native + Expo** that uses AI to identify food and calculate nutrition.

![React Native](https://img.shields.io/badge/React_Native-0.71-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK_54-black?logo=expo)
![Hugging Face](https://img.shields.io/badge/Hugging_Face-nateraw%2Ffood-yellow?logo=huggingface)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧮 **BMR / TDEE Calculator** | Mifflin-St Jeor formula with 5 activity levels |
| 🥩 **Macro Planner** | Muscle gain / Fat loss / Custom ratio modes |
| 📸 **AI Food Recognition** | Photo → Hugging Face model → USDA nutrition data |
| 👤 **Profile Page** | BMI, body stats, daily calorie goal |
| 🌍 **7 Languages** | 繁中・English・Español・日本語・한국어・Tiếng Việt・ภาษาไทย |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Expo Go](https://expo.dev/go) app on your phone (iOS / Android)

### 1. Clone the repo
```bash
git clone https://github.com/Taian-an/calorie-app.git
cd calorie-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your Hugging Face token
Create a `.env.local` file in the project root:
```bash
EXPO_PUBLIC_HF_TOKEN=your_token_here
```
> Get a free token at 👉 https://huggingface.co/settings/tokens

### 4. Start the app
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo Router |
| Food AI | Hugging Face — `nateraw/food` model |
| Nutrition DB | USDA FoodData Central API |
| Language | JavaScript (ES2022) |

---

## 📁 Project Structure

```
calorie-app/
├── app/
│   ├── _layout.js          # Tab navigation + Language Provider
│   ├── index.js            # BMR / TDEE Calculator
│   ├── plan.js             # Macro planner with goal modes
│   ├── camera.js           # AI food recognition
│   ├── profile.js          # User profile & settings
│   ├── _translations.js    # 7-language strings
│   └── _LanguageContext.js # Global language state
├── avatars/                # Profile images
└── .env.local              # Your API tokens (not committed)
```

---

## ⚙️ How It Works

```
User inputs age / height / weight / activity
        ↓
BMR calculated via Mifflin-St Jeor Equation
        ↓
TDEE = BMR × Activity Factor
        ↓
Macro targets split by selected goal (Muscle / Cut / Custom)
        ↓
Take photo → Hugging Face classifies food
        ↓
USDA API returns calories, protein, carbs, fat
```

---

## ⚠️ Notes

- USDA `DEMO_KEY` has rate limits. Get a free key at: https://fdc.nal.usda.gov/api-key-signup.html
- Food recognition accuracy depends on photo quality and angle.
- Nutritional values are per 100g and are estimates only.

---

## 📄 License

MIT License — feel free to use and modify.

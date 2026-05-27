# 热量计算App

这是一个使用React Native和Expo构建的热量计算app。

## 功能

- 根据用户输入计算BMR和TDEE
- 显示每日宏营养素目标
- 拍照食物以识别并获取营养信息

## 设置

1. 安装依赖：`npm install`
2. 从https://huggingface.co/settings/tokens获取Hugging Face API令牌
3. 将`app/camera.js`中的'YOUR_HF_TOKEN'替换为您的令牌
4. 运行：`npx expo start`

## 使用的API

- Hugging Face用于食物识别（nateraw/food模型）
- USDA FoodData Central用于营养数据

# Fitness AI App (MVP)

## Overview

This is a mobile fitness application that helps users track their daily calorie intake and nutritional needs using AI-powered food recognition.

The app allows users to:

* Calculate BMR and TDEE
* Estimate daily macronutrient needs
* Analyze food by taking a photo

---

## Features

### 1. BMR & TDEE Calculation

* Uses Mifflin-St Jeor Equation
* Calculates:

  * Basal Metabolic Rate (BMR)
  * Total Daily Energy Expenditure (TDEE)

---

### 2. Macronutrient Calculation

Based on TDEE, the app calculates:

* Protein intake
* Fat intake
* Carbohydrates intake

Default ratio:

* Protein: 30%
* Fat: 25%
* Carbs: 45%

---

### 3. Food Recognition (AI)

* Users can take a photo or upload an image
* The app uses Google Vision API to detect food labels
* The detected food is mapped to:

  * Calories
  * Protein
  * Fat
  * Carbohydrates

---

## Tech Stack

* Frontend: Flutter
* Backend: Firebase (optional)
* AI Service: Google Cloud Vision API

---

## How It Works

1. User inputs personal data (age, weight, height, gender)
2. App calculates BMR and TDEE
3. User takes a photo of food
4. Image is sent to Vision API
5. API returns food label
6. App maps label to nutrition data
7. Results are displayed

---

## Limitations

* Food recognition may not be 100% accurate
* Nutrition data is estimated, not precise
* Portion size detection is not included in MVP

---

## Future Improvements

* Portion size estimation
* Barcode scanning
* Meal history tracking
* AI-based diet recommendations

---

## Disclaimer

This app provides estimated nutritional information and should not be considered medical or dietary advice.

注意：USDA DEMO_KEY有使用限制，请从https://fdc.nal.usda.gov/api-key-signup.html获取自己的API密钥以用于生产环境。
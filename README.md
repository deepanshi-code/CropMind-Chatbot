# CropMind - Smart Farming Assistant

Welcome to **CropMind**! This is a beginner-friendly smart farming application designed to help farmers keep track of their crops, check live farm measurements (like soil moisture and rain probability), and get helpful answers from an AI assistant.

---

## What does CropMind do?

CropMind is split into two parts:
1. **The Frontend (The Visual App)**: The website you open in your web browser. It displays the dashboard, crop cards, weather/moisture widgets, and the floating chat window.
2. **The Backend (The Engine)**: A background program that saves crop details to a local database (SQLite) so they aren't lost when you refresh or close the page, and securely handles talking to Google's Gemini AI.

---

## How is the project organized?

We have reorganized the files into a clean folder structure:
* **`/frontend`**: Contains the code for the website interface, designs, and pages.
* **`/backend`**: Contains the code that saves crop details and securely connects to the AI assistant.
* **`cropmind.db`**: A file automatically created inside the `/backend` folder to act as the database.

---

## How to Setup and Run (Step-by-Step)

Follow these simple steps to run the application on your computer:

### Step 1: Open two terminal (command line) windows
Because the website (Frontend) and the server (Backend) run separately, you need to open two terminals on your computer.

---

### Step 2: Start the Backend (The Engine)
In your **first terminal**:

1. Go into the backend directory:
   ```bash
   cd backend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   * Look at the file named `.env.example` in the backend folder.
   * Make a copy of it and name it `.env`.
   * Open this new `.env` file in any text editor and enter your Gemini API Key:
     ```ini
     PORT=5000
     GEMINI_API_KEY=your_actual_gemini_key_here
     ```
   *(Note: If you don't have a Gemini API key yet, you can leave it blank. The chat window will still open and display a friendly notice).*
4. Start the backend server:
   ```bash
   npm start
   ```
   You should see a message saying: **`Server running on port 5000`**.

---

### Step 3: Start the Frontend (The Visual App)
In your **second terminal**:

1. Go into the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Start the visual preview server:
   ```bash
   npm run dev
   ```
4. A website link will appear (usually `http://localhost:5173`). Ctrl+Click that link or copy-paste it into your web browser to open the app!

---

## Key Features

* **Crop Registry**: Add and delete crops directly from the **Dashboard** page. These crops persist in a database, meaning they won't disappear when you restart the app!
* **Farming Telemetry**: Mock gauges for soil moisture levels, rain probability, and wholesale wheat market pricing.
* **Theme Toggle**: Click the "Light" / "Dark" button in the navigation bar to instantly switch visual themes.
* **AI Chatbot Assistant**: Click the green **AI Assistant** bubble in the bottom right corner to ask any farming questions (recommendations, fertilizer info, disease identifiers, and more).

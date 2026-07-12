# CropMind - Smart Farming Assistant

Welcome to **CropMind**! This is a beginner-friendly smart farming application designed to help farmers keep track of their crops, check live farm measurements (like soil moisture and rain probability), and get helpful answers from an AI assistant.

---

## What does CropMind do?

CropMind is split into two parts:
1. **The Frontend (The Visual App)**: The website you open in your web browser. It displays the dashboard, crop cards, weather/moisture widgets, and the floating chat window.
2. **The Backend (The Engine)**: A background program that saves crop details and IoT telemetry logs to a MongoDB database so they aren't lost when you refresh or close the page, and securely handles talking to Google's Gemini AI.

---

## How is the project organized?

We have reorganized the files into a clean folder structure:
* **`/frontend`**: Contains the code for the website interface, designs, and pages.
* **`/backend`**: Contains the Node.js server, configuration files, and database connectors.
* **`/backend/models`**: Contains the Mongoose schemas defining our database entities (`Crop`, `TelemetryLog`, and `User`).

---

## Prerequisites

*   **Node.js**: Version 18.0.0 or higher is required.
*   **MongoDB**: An active local MongoDB instance (`mongodb://127.0.0.1:27017/cropmind`) OR a MongoDB Atlas cloud connection URI.
    *   *Note: If no local database is running, the backend will automatically fallback to In-Memory Mock Mode so the application runs out-of-the-box without crashes.*

---

## Database Choice & Architecture

### Why MongoDB?
MongoDB was chosen for the database layer because:
1.  **Flexible Schema:** Essential for storing diverse IoT telemetry logs and unstructured AI chat assistant inputs.
2.  **Mongoose Integration:** Allows defining strict validators for farming entities (Crops, Users) while maintaining scalability.
3.  **JSON Compatibility:** Perfect fit for React REST API communications.

### Database Schema Diagram

The database structure consists of three main collections with the following attributes:

![Database Schema Diagram](./W5_SchemaDiagram_TBI-26100746.png)

---

## Set up the Database

You can connect CropMind to either a local MongoDB installation or MongoDB Atlas (cloud database).

### Option 1: Using MongoDB Atlas (Cloud Database - Recommended)
1.  Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2.  Create a new free cluster (Shared M0 Tier).
3.  Under **Network Access**, whitelist your IP address or set it to `0.0.0.0/0` to allow access from anywhere.
4.  Under **Database Access**, create a database user with a password (e.g. username `farmer`, password `growcrops`).
5.  Click **Connect** -> **Drivers** to find your Connection String. It should look like:
    ```
    mongodb+srv://farmer:growcrops@cluster.mongodb.net/cropmind?retryWrites=true&w=majority
    ```
6.  Open `/backend/.env` and replace `MONGO_URI` with your connection string:
    ```ini
    MONGO_URI=mongodb+srv://farmer:growcrops@cluster.mongodb.net/cropmind?retryWrites=true&w=majority
    ```

### Option 2: Using Local MongoDB Community Server
1.  Download the installer from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2.  Install MongoDB on your computer, making sure "Install MongoDB as a Service" is checked.
3.  Start the service if it's not running.
4.  The application will automatically connect to `mongodb://127.0.0.1:27017/cropmind`.

*(Note: If no database is detected, the backend will display a database connection warning and gracefully activate its built-in in-memory mock fallback, allowing you to test the app without setting up MongoDB.)*

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

---

## API Specifications

The backend server runs on `http://localhost:5000` by default and exposes the following endpoints:

### 1. Crop Registry API

#### `GET /api/crops`
*   **Description:** Retrieves all crops from the MongoDB database (or the in-memory fallback), ordered by creation time descending.
*   **Response Status:** `200 OK`
*   **Response Body:**
    ```json
    [
      {
        "id": 1,
        "name": "Wheat",
        "season": "Rabi",
        "water": "Medium"
      }
    ]
    ```

#### `GET /api/crops/:id`
*   **Description:** Retrieves a single crop's details by ID.
*   **Response Status:** `200 OK` (with the crop object) or `404 Not Found` (if crop doesn't exist).

#### `POST /api/crops`
*   **Description:** Adds a new crop to the registry.
*   **Request Body:**
    ```json
    {
      "name": "Rice",
      "season": "Kharif",
      "water": "High"
    }
    ```
*   **Response Status:** `201 Created` with the new crop object, or `400 Bad Request` if fields are missing.

#### `PUT /api/crops/:id`
*   **Description:** Updates an existing crop's details.
*   **Request Body:**
    ```json
    {
      "name": "Barley",
      "season": "Rabi",
      "water": "Low"
    }
    ```
*   **Response Status:** `200 OK` with the updated crop object, or `404 Not Found`.

#### `DELETE /api/crops/:id`
*   **Description:** Deletes a crop from the registry.
*   **Response Status:** `204 No Content` on success, or `404 Not Found`.

#### `GET /api/crops/search/:name`
*   **Description:** Searches crops whose name matches the search parameter.
*   **Response Status:** `200 OK` with an array of matching crops.

---

### 2. AI Chat Assistant Proxy API

#### `POST /api/chat`
*   **Description:** Securely proxies prompts to Google's Gemini API, keeping the API key hidden from the client side.
*   **Request Body:**
    ```json
    {
      "message": "What is the recommended irrigation schedule for Rabi wheat?"
    }
    ```
*   **Response Status:** `200 OK` on success, `400 Bad Request` if message is missing, or `502 Bad Gateway` if the server fails to contact Gemini.
*   **Response Body:**
    ```json
    {
      "reply": "* Wheat requires 4-6 irrigations depending on soil type.\n* Key stages include Crown Root Initiation (CRI) and Flowering..."
    }
    ```

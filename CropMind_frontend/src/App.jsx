import axios from "axios";
import { useEffect } from "react";
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink
} from "react-router-dom";

const Home = () => (
  <>
    <section className="hero">
      <h1>CropMind</h1>
      <h2>AI Powered Farming Intelligence</h2>
      <p>Weather • Crop Health • Market Insights</p>

      <button>Get Started</button>
    </section>

    <div className="cards">
      <div className="card">
        <h3> Weather</h3>
        <p>7 day forecast</p>
      </div>

      <div className="card">
        <h3> Crop Health</h3>
        <p>AI powered insights</p>
      </div>

      <div className="card">
        <h3> Market Prices</h3>
        <p>Live market trends</p>
      </div>
    </div>
  </>
);

const Dashboard = ({ crops }) => (
  <div className="page">
    <h1>Smart Farming Dashboard</h1>

    <div className="cards">
      {crops.map((crop) => (
        <div className="card" key={crop.id}>
          <h2>{crop.name}</h2>
          <p>Season: {crop.season}</p>
          <p>Water Requirement: {crop.water}</p>
        </div>
      ))}

      <div className="card">
        <h2>Soil Moisture</h2>
        <p>72%</p>
      </div>

      <div className="card">
        <h2>Rain Probability</h2>
        <p>40%</p>
      </div>

      <div className="card">
        <h2>Wheat Price</h2>
        <p>₹2450 / Quintal</p>
      </div>
    </div>
  </div>
);
const Login = () => (
  <div className="page">
    <div className="login-container">
      <div
        className="card"
        style={{
          maxWidth: "450px",
          width: "100%"
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "30px"
          }}
        >
          Login
        </h1>

        <input
          placeholder="Email"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            boxSizing: "border-box"
          }}
        />

        <input
          placeholder="Password"
          type="password"
          style={{
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  boxSizing: "border-box"
}}
        />

        <button style={{ width: "100%" }}>
          Login
        </button>
      </div>
    </div>
  </div>
);

const About = () => (
  <div className="page">
    <div
      className="card"
      style={{
        maxWidth: "900px",
        margin: "auto"
      }}
    >
      <h1>About CropMind</h1>

      <p>
        CropMind is an AI-powered smart farming platform designed to help
        farmers make informed decisions using real-time insights and
        intelligent recommendations.
      </p>

      <h2>Features</h2>

      <ul>
        <li> Weather Forecasting</li>
        <li> Crop Health Monitoring</li>
        <li> Soil Moisture Tracking</li>
        <li> Market Price Analysis</li>
        <li> AI Recommendations</li>
      </ul>

      <h2>Our Vision</h2>

      <p>
        To bridge traditional agriculture with modern AI technology and
        empower farmers with smarter decisions.
      </p>
    </div>
  </div>
);

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
 

  console.log(import.meta.env.VITE_GEMINI_API_KEY);

const [messages, setMessages] = useState([
  {
    sender: "bot",
    text: "Hello! I'm CropMind AI. Ask me about crops, weather, irrigation or market prices."
  }
]);
const [crops, setCrops] = useState([]);

const [input, setInput] = useState("");
useEffect(() => {
  axios.get("http://localhost:5000/api/crops")
    .then((res) => {
      setCrops(res.data);
    })
    .catch((err) => {
      console.error(err);
    });
}, []);
const sendMessage = async () => {
  if (!input.trim()) return;

  const userText = input;

  setMessages(prev => [
    ...prev,
    {
      sender: "user",
      text: userText
    }
  ]);

  setInput("");

  try {
    const response = await axios.post(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  {
    contents: [
      {
        parts: [
          {
            text:  `You are CropMind AI, an AI farming assistant built for Indian farmers.

Your responsibilities:
- Crop recommendations
- Disease identification advice
- Irrigation guidance
- Fertilizer recommendations
- Market price guidance
- Weather based farming advice

Rules:
- Keep answers under 8 bullet points.
- Be concise and practical.
- Assume the user is from India unless specified otherwise.
- If location is missing for weather questions, ask for district and state.
- Mention expert consultation if required.
- Never mention that you are an AI language model.
- Focus only on agriculture and farming topics.



User Question: ${userText}`
          }
        ]
      }
    ]
  },
  {
    headers: {
      "x-goog-api-key": import.meta.env.VITE_GEMINI_API_KEY,
      "Content-Type": "application/json"
    }
  }
);

    const botReply =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response received.";

    setMessages(prev => [
      ...prev,
      {
        sender: "bot",
        text: botReply
      }
    ]);
  }
  catch (error) {
    console.error(error);

    setMessages(prev => [
      ...prev,
      {
        sender: "bot",
        text: "CropMind AI is currently unavailable."
      }
    ]);
  }
};

  return (
    <div className={darkMode ? "dark" : "light"}>
      <BrowserRouter>
        <nav>
          <h2>CropMind</h2>

          <div className="links">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "active-link" : ""
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? "active-link" : ""
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive ? "active-link" : ""
              }
            >
              About
            </NavLink>

            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? "active-link" : ""
              }
            >
              Login
            </NavLink>

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              style={{
                marginLeft: "20px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route
  path="/dashboard"
  element={<Dashboard crops={crops} />}
/>
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
        </Routes>

        <footer>
          CropMind © 2026
        </footer>
        <div
  className="chat-toggle"
  onClick={() => setChatOpen(!chatOpen)}
>
  AI Assistant
</div>

{chatOpen && (
  <div className="chat-window">
    <div className="chat-header">
      CropMind AI
    </div>

    <div className="chat-body">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={msg.sender === "bot" ? "bot-msg" : "user-msg"}
        >
          {msg.text}
        </div>
      ))}
    </div>

    <div className="chat-input">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about crops..."
      />

      <button onClick={sendMessage}>
  Send
</button>
    </div>
  </div>
)}
      </BrowserRouter>
    </div>
  );
}
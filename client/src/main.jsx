import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios' // Import axios if you are using it
import './index.css'
import App from './App.jsx'

// Set the Global API URL for your Render Backend
axios.defaults.baseURL = "https://ruraldoc-ai.onrender.com"; 
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
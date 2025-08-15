import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Room from "./pages/Room";
import Draw from "./pages/Draw";
import { SocketProvider } from "./context/socketContext";
import { useEffect, useState } from "react";


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  

  const handleAuth = ()=>{
    setIsAuthenticated(!!localStorage.getItem("token"));
  }

  return (
    <SocketProvider>
      <div className="App">
        <h1>DrawSync</h1>
        <Router>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login handleAuth={handleAuth}/>} />
            <Route
              path="/room"
              element={isAuthenticated ? <Room /> : <Navigate to="/login" />}
            />
            <Route path="/draw/:roomId" element={<Draw />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </div>
    </SocketProvider>
  );
}

export default App;

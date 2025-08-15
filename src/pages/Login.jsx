import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../context/socketContext";

const Login = ({ handleAuth, isAuthenticated }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const socket = useSocket();

  const setSocketTokenAndConnect = (token, onConnected) => {
    if (!socket) return;

    socket.auth = { token };
  
    // if (socket.connected) socket.disconnect(); // ensure new auth is used
    socket.once("connect", () => onConnected?.());
    socket.once("connect_error", (err) =>
      setError(err?.message || "Socket connection failed")
    );
    socket.connect();
  };

  // If already authed (token in storage or parent flag), redirect to /room and ensure socket is connected
  useEffect(() => {
    const token = localStorage.getItem("token");
    if ((token || isAuthenticated) && socket) {
      setSocketTokenAndConnect(token, () => navigate("/room", { replace: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("https://drawsync-backend-za78.onrender.com/api/login", formData);
      const token = res.data?.token;
      const email = res.data?.user?.email
      if (!token) throw new Error("No token returned from server");
      localStorage.setItem("token", token);
      localStorage.setItem("email",email)
      handleAuth?.(); // let parent know we are authed
      setSocketTokenAndConnect(token, () => navigate("/room", { replace: true }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-8 w/full max-w-md border border-gray-100">
        <h2 className="text-3xl font-semibold text-gray-800 text-center mb-6">Welcome Back 👋</h2>
        <p className="text-gray-500 text-center text-sm mb-6">Please log in to continue</p>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white py-3 rounded-xl font-medium shadow-md hover:opacity-90 transition duration-300 disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Don’t have an account?{" "}
          <Link to="/register" className="text-blue-500 font-semibold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

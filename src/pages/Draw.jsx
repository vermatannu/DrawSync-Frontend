import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/socketContext";

const CANVAS_W = 700;
const CANVAS_H = 500;

// rAF throttler: invokes fn at most once per frame
function rafThrottle(fn) {
  let ticking = false;
  return (...args) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      fn(...args);
      ticking = false;
    });
  };
}

// Stable color per user/email using a tiny hash -> HSL
function colorForUser(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const sat = 75;
  const light = 60;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function initials(nameOrEmail = "") {
  const base = nameOrEmail.split("@")[0];
  const parts = base
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const Draw = () => {
  const { roomId } = useParams();
  const socket = useSocket();

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isErasing, setIsErasing] = useState(false);

  // Current user (adjust to your auth). Using email for identity.
  const me = useMemo(() => {
    const email = localStorage.getItem("email") || "";
    const user = localStorage.getItem("username") || email.split("@")[0] || "Me";
    return { email, user };
  }, []);

  // Setup canvas (crisp on HiDPI)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "black";
    ctxRef.current = ctx;
  }, []);

  // When toggling draw/erase, start a fresh path so composite switches cleanly
  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) ctx.beginPath();
  }, [isErasing]);

  const setSocketTokenAndConnect = (token) => {
    if (!socket) return;
    if (socket.connected) return;
    socket.auth = { token };
    socket.connect();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && socket) setSocketTokenAndConnect(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Join room & listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("joinRoom", roomId);

    const handleLoadSession = (session) => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.save();
        (session.drawings || []).forEach((d) => {
          drawOnCanvas(d.x, d.y, d.isDrawing, d.isErasing);
        });
        ctx.restore();
      }

      const normalized = (session.chats || []).map((m) => ({
        _id: m._id || crypto.randomUUID(),
        user: m.user || m.name || "Unknown",
        email: m.email || "",
        text: m.text || "",
        timestamp: m.timestamp || m.time || new Date().toISOString(),
      }));
      setChat(normalized);
    };

    const handleDraw = (data) => {
      drawOnCanvas(data.x, data.y, data.isDrawing, data.isErasing);
    };

    const handleChat = (msg) => {
      const normalized = {
        _id: msg._id || crypto.randomUUID(),
        user: msg.user || "Unknown",
        email: msg.email || "",
        text: msg.text || "",
        timestamp: msg.timestamp || new Date().toISOString(),
      };
      setChat((prev) => [...prev, normalized]);
    };

    socket.on("loadSession", handleLoadSession);
    socket.on("draw", handleDraw);
    socket.on("chatMessage", handleChat);

    return () => {
      socket.off("loadSession", handleLoadSession);
      socket.off("draw", handleDraw);
      socket.off("chatMessage", handleChat);
    };
  }, [socket, roomId]);

  const drawOnCanvas = useCallback((x, y, isDrawing, erasing = false) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (erasing) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 16; // eraser size
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
    }

    if (isDrawing) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  // Convert client coords to canvas coords
  const getPos = (evt) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "clientX" in evt ? evt.clientX : evt.touches?.[0]?.clientX;
    const clientY = "clientY" in evt ? evt.clientY : evt.touches?.[0]?.clientY;
    return { x: (clientX ?? 0) - rect.left, y: (clientY ?? 0) - rect.top };
  };

  // Emit + local draw (throttled)
  const emitDrawThrottled = useRef(
    rafThrottle((payload) => {
      if (!socket) return;
      socket.emit("draw", payload);
      drawOnCanvas(payload.x, payload.y, payload.isDrawing, payload.isErasing);
    })
  ).current;

  // Pointer handlers — IMPORTANT: draw while moving in BOTH modes
  const handlePointerDown = (e) => {
    if (!roomId) return;
    isPointerDownRef.current = true;
    const { x, y } = getPos(e);
    lastPosRef.current = { x, y };
    // Start a new subpath (pen down)
    emitDrawThrottled({ roomId, x, y, isDrawing: false, isErasing });
  };

  const handlePointerMove = (e) => {
    if (!roomId || !isPointerDownRef.current) return;
    const { x, y } = getPos(e);
    lastPosRef.current = { x, y };
    // Keep drawing while moving (erase/draw)
    emitDrawThrottled({ roomId, x, y, isDrawing: true, isErasing });
  };

  const endStroke = () => {
    if (!roomId || !isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const { x, y } = lastPosRef.current;
    // Lift pen to end current subpath
    emitDrawThrottled({ roomId, x, y, isDrawing: false, isErasing });
  };

  // Send chat
  const sendMessage = () => {
    if (!socket || !message.trim() || !roomId) return;
    const payload = {
      roomId,
      text: message.trim(),
      user: me.user || "Me",
      email: me.email || "",
      timestamp: new Date().toISOString(),
    };
    socket.emit("chatMessage", payload);
    setMessage("");
  };

  // Auto-scroll
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  return (
    <div className="flex gap-4">
      {/* Left: Drawing */}
      <div className="relative bg-white shadow-xl rounded-2xl p-2 w-[65%] flex flex-col items-center">
  <div className="relative">
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="border-4 border-indigo-300 rounded-lg bg-white cursor-crosshair shadow-lg touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    />

    {/* Floating buttons */}
    <div className="absolute top-2 right-2 flex gap-2 bg-white/80 rounded-lg p-1 shadow-md">
      <button
        onClick={() => setIsErasing(false)}
        className={`px-3 py-1 rounded-md text-sm font-medium ${
          !isErasing
            ? "bg-indigo-600 text-white"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        ✏️ Draw
      </button>
      <button
        onClick={() => setIsErasing(true)}
        className={`px-3 py-1 rounded-md text-sm font-medium ${
          isErasing
            ? "bg-pink-500 text-white"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        🧽 Erase
      </button>
    </div>
  </div>
</div>

      {/* Right: Chat */}
      <aside className="flex flex-col bg-white shadow-xl rounded-2xl w-[35%] max-h-[520px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">In-call messages</h2>
          <p className="text-xs text-gray-500">Messages are visible to everyone in the room.</p>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50">
          {chat.map((m) => {
            const isMe =
              (!!me.email && m.email === me.email) ||
              (!!me.user && m.user === me.user && !m.email);

            const bubbleColor = colorForUser(m.email || m.user || "");
            const displayName = m.user || m.email || "Unknown";
            const time = formatTime(m.timestamp);

            return (
              <div
                key={m._id || `${m.timestamp}-${m.email}-${m.text}`}
                className={`mb-4 flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] flex flex-col ${
                    isMe ? "items-end text-right" : "items-start"
                  }`}
                >
                  {/* Avatar + Name header: avatar always on top with name to its right.
                      For my messages, header is right-aligned; for others, left-aligned. */}
                  <div
                    className={`flex items-center gap-2 mb-1 ${
                      isMe ? "self-end flex-row-reverse" : "self-start"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white select-none"
                      style={{ backgroundColor: bubbleColor }}
                      title={displayName}
                    >
                      {initials(displayName)}
                    </div>
                    {/* Name */}
                    <div className="text-xs font-semibold" style={{ color: bubbleColor }}>
                      {displayName}
                    </div>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow border ${
                      isMe
                        ? "bg-[#DCF8C6] border-[#cbe7b7] rounded-br-sm"
                        : "bg-white border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    <div className="text-[13px] text-gray-900 whitespace-pre-wrap break-words">
                      {m.text}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">{time}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a message to everyone"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Draw;

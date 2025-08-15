import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/socketContext"; // ✅ Import socket from context

const Draw = () => {
  const { roomId } = useParams();
  const socket = useSocket(); // ✅ Get socket from provider
  const canvasRef = useRef(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    if (!socket) return; 
    console.log(socket, "lllllllllll");
    

    socket.emit("joinRoom", roomId);

    
  socket.on("loadSession", (session) => {
    // Load drawings
    session.drawings.forEach(d =>
      drawOnCanvas(d.x, d.y, d.isDrawing, d.isErasing)
    );
    // Load chats
    setChat(session.chats);
  });

    socket.on("draw", (data) => {
      drawOnCanvas(data.x, data.y, data.isDrawing, data.isErasing);
    });

    socket.on("chatMessage", (msg) => {
      console.log(msg, "kkkkkkkkkk");
      
      setChat((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("loadSession");
      socket.off("draw");
      socket.off("chatMessage");
    };
  }, [socket?.connected, roomId]);

  const drawOnCanvas = (x, y, isDrawing, erasing = false) => {
    if(!roomId){
      return
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = erasing ? "white" : "black";
    

    if (erasing) {
    ctx.globalCompositeOperation = "destination-out"; 
  } else {
    ctx.globalCompositeOperation = "source-over"; 
    ctx.strokeStyle = "black";
  }

    if (isDrawing) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

const handleMouseMove = (e) => {
  if (!socket || !canvasRef.current) return;

  // left button pressed? (bit 0)
  const leftDown = (e.buttons & 1) === 1;
  if (!leftDown) return;

  const rect = canvasRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const isDrawing = leftDown && !isErasing; 

  socket.emit("draw", { roomId, x, y, isDrawing, isErasing });
  drawOnCanvas(x, y, isDrawing, isErasing);
};

  const sendMessage = () => {
    if (!socket) return;
    socket.emit("joinRoom", roomId);
    socket.emit("chatMessage", { roomId, text: message });
    setMessage("");
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Drawing Section */}
      <div className="flex flex-col items-center bg-white shadow-xl rounded-2xl p-4 w-[65%] border border-red">
        <h2 className="text-xl font-bold text-indigo-600 mb-3">
          ✏️ Collaborative Drawing
        </h2>
        <canvas
          ref={canvasRef}
          width={600}
          height={420}
          className="border-4 border-indigo-300 rounded-lg bg-white cursor-crosshair shadow-lg"
          onMouseMove={handleMouseMove}
        ></canvas>

        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setIsErasing(false)}
            className={`px-4 py-2 rounded-lg font-medium ${
              !isErasing
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            } transition`}
          >
            ✏️ Draw Mode
          </button>
          <button
            onClick={() => setIsErasing(true)}
            className={`px-4 py-2 rounded-lg font-medium ${
              isErasing
                ? "bg-pink-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            } transition`}
          >
            🧽 Erase Mode
          </button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex flex-col bg-white shadow-xl rounded-2xl p-4 w-[30%] h-[520px]">
        <h2 className="text-lg font-bold text-pink-600 mb-3">💬 Chat Room</h2>
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2 bg-pink-50">
          {chat.map((c, i) => (
            <p key={i} className="text-sm">
              <span className="font-semibold text-indigo-600">{c.user}:</span>{" "}
              <span className="text-gray-700">{c.text}</span>
            </p>
          ))}
        </div>

        <div className="flex mt-3 gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-400 outline-none"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Draw;

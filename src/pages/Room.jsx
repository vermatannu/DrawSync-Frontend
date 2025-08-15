import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; 
import { useSocket } from "../context/socketContext";



const Room = () => {
  const [room, setRoom] = useState("");
  const [joinedRoom, setJoinedRoom] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const navigate = useNavigate();
  const socket = useSocket();

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    if (room) {
      socket.emit("joinRoom", room);
      setJoinedRoom(room);
      navigate(`/draw/${room}`);
    }
  };

  const createRoom = () => {
    const uuid = uuidv4();
    setNewRoomId(uuid);
    socket.emit("createRoom", uuid);
    setJoinedRoom(uuid);
   
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 text-center">
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">Room Page</h2>
        <p className="text-gray-500 mb-6">Join an existing room or create a new one</p>

        {/* Join Existing Room */}
        <input
          type="text"
          placeholder="Enter room name or ID"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm"
        />
        <button
          onClick={joinRoom}
          className="w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white py-3 rounded-xl font-medium shadow-md hover:opacity-90 transition duration-300 mb-6"
        >
          Join Room
        </button>

        <div className="flex items-center my-4">
          <hr className="flex-1 border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Create New Room */}
        <button
          onClick={createRoom}
          className="w-full bg-gradient-to-r from-green-400 to-teal-400 text-white py-3 rounded-xl font-medium shadow-md hover:opacity-90 transition duration-300"
        >
          Create New Room
        </button>

        {/* Status */}
        {newRoomId && (
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-semibold">New Room Created:</span> {newRoomId}
          </p>
        )}

        {joinedRoom && (
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">You joined:</span> {joinedRoom}
          </p>
        )}
      </div>
    </div>
  );
};

export default Room;

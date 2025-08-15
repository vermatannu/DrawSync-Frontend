// context/socketContext.tsx
import { io } from "socket.io-client";
import React, { createContext, useContext, useMemo } from "react";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () =>
      io("https://drawsync-backend-za78.onrender.com", {
        autoConnect: true, 
        transports: ["websocket"], 
      }),
    []
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

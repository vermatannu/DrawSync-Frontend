// context/socketContext.tsx
import { io } from "socket.io-client";
import React, { createContext, useContext, useMemo } from "react";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () =>
      io("http://localhost:5000", {
        autoConnect: true, // IMPORTANT
        transports: ["websocket"], // optional: skip polling
      }),
    []
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

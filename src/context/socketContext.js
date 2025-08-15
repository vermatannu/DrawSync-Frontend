import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Function to connect with current token
    const connectSocket = () => {
      const token = localStorage.getItem("token");
      
      const newSocket = io("https://drawsync-backend-za78.onrender.com", {
       
        
       
        auth: { token }, // Send token in handshake
      });
      console.log(newSocket, "ooo");
      

      setSocket(newSocket);

     
      return newSocket;
    };

    // Connect initially
    let currentSocket = connectSocket();

    // Listen for token changes
   

   

    return () => {
      if (currentSocket) {
        currentSocket.disconnect();
      }
      
    };
  }, [localStorage.getItem("token")]); 

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

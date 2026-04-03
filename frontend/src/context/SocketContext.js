import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);
const defaultSocketUrl =
  typeof window !== "undefined"
    ? ["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : window.location.origin
    : "http://localhost:5000";

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return undefined;
    }

    const nextSocket = io(
      process.env.REACT_APP_SOCKET_URL || defaultSocketUrl,
      {
        auth: { token },
      }
    );

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

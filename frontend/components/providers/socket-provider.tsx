"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { ServiceRequest, NotificationDto } from "@/types";
import { useSession } from "next-auth/react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface SocketContextType {
  subscribe: <T>(event: string, callback: (data: T) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
  userRole?: string;
}

export const SocketProvider = ({ children, userRole }: SocketProviderProps) => {
  const listenersRef = useRef<{ [event: string]: ((data: never) => void)[] }>({});
  const { data: session } = useSession();

  const subscribe = <T,>(event: string, callback: (data: T) => void) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback as unknown as (data: never) => void);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(
        (cb) => cb !== (callback as unknown as (data: never) => void)
      );
    };
  };

  useEffect(() => {
    // Need valid session token to connect to STOMP
    const token = (session?.user as { accessToken?: string })?.accessToken;
    if (!userRole || !token) {
      return;
    }

    // Backend endpoint for SockJS is /ws
    // process.env.NEXT_PUBLIC_WS_URL should be "http://localhost:8080/ws"
    const brokerUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";

    const client = new Client({
      webSocketFactory: () => new SockJS(brokerUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function () {
        // console.log("STOMP: " + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("STOMP connected!");

      // 1. Subscribe to personal notifications
      client.subscribe("/user/queue/notifications", (message) => {
        try {
          const notification = JSON.parse(message.body) as NotificationDto;
          // Trigger the local listeners if any
          const eventListeners = listenersRef.current["new-notification"];
          if (eventListeners) {
            eventListeners.forEach((cb) => cb(notification as never));
          }
        } catch (err) {
          console.error("Failed to parse notification message", err);
        }
      });

      // 2. Subscribe to global service requests
      client.subscribe("/topic/service-requests", (message) => {
        try {
          const request = JSON.parse(message.body) as ServiceRequest;

          // Trigger listeners for the table update
          const eventListeners = listenersRef.current["new-repair-request"];
          if (eventListeners) {
            eventListeners.forEach((cb) => cb(request as never));
          }
        } catch (err) {
          console.error("Failed to parse ServiceRequest message", err);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };

    client.activate();

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [userRole, session]);

  return (
    <SocketContext.Provider value={{ subscribe }}>
      {children}
    </SocketContext.Provider>
  );
};

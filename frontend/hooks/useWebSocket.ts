import { useEffect, useState, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getSession } from 'next-auth/react';
import { NotificationDto } from '@/types';

export const useWebSocket = (onMessageReceived?: (notification: NotificationDto) => void) => {
    const [isConnected, setIsConnected] = useState(false);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const callbackRef = useRef(onMessageReceived);

    useEffect(() => {
        callbackRef.current = onMessageReceived;
    }, [onMessageReceived]);

    useEffect(() => {
        let client: Client | null = null;
        let isActive = true;

        const connect = async () => {
            const session = await getSession();
            const user = session?.user as { accessToken?: string } | undefined;
            const token = user?.accessToken;

            if (!token) {
                console.error('Cannot connect to WebSocket: No token found');
                return;
            }

            if (!isActive) return;

            const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';
            
            client = new Client({
                webSocketFactory: () => new SockJS(socketUrl),
                connectHeaders: {
                    Authorization: `Bearer ${token}`,
                },
                debug: (str) => {
                    // console.log(str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            client.onConnect = () => {
                if (!isActive) {
                    client?.deactivate();
                    return;
                }
                setIsConnected(true);
                setStompClient(client);
                
                client?.subscribe('/user/queue/notifications', (message: IMessage) => {
                    if (message.body) {
                        const notification: NotificationDto = JSON.parse(message.body);
                        if (callbackRef.current) {
                            callbackRef.current(notification);
                        }
                    }
                });
            };

            client.onStompError = (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            };

            client.activate();
        };

        connect();

        return () => {
            isActive = false;
            if (client) {
                client.deactivate();
            }
            setIsConnected(false);
            setStompClient(null);
        };
    }, []); // Empty dependency array means it connects only once

    return { isConnected, stompClient };
};

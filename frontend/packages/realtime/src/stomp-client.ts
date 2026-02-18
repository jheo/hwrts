import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

import { WS_CONNECT_EVENT, WS_DISCONNECT_EVENT } from './events.js';

export interface StompConfig {
  brokerURL: string;
  token?: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class StompClientManager {
  private client: Client | null = null;
  private readonly brokerURL: string;
  private readonly token: string | undefined;
  private currentReconnectDelay: number;
  private readonly maxReconnectDelay: number;
  private readonly initialReconnectDelay: number;

  constructor(config: StompConfig) {
    this.brokerURL = config.brokerURL;
    this.token = config.token;
    this.initialReconnectDelay = config.reconnectDelay ?? 5000;
    this.currentReconnectDelay = this.initialReconnectDelay;
    this.maxReconnectDelay = config.maxReconnectDelay ?? 30000;
  }

  connect(): void {
    const connectHeaders: Record<string, string> = {};
    if (this.token) {
      connectHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    this.client = new Client({
      brokerURL: this.brokerURL,
      connectHeaders,
      reconnectDelay: this.currentReconnectDelay,
      onConnect: () => {
        this.currentReconnectDelay = this.initialReconnectDelay;
        window.dispatchEvent(new Event(WS_CONNECT_EVENT));
      },
      onDisconnect: () => {
        window.dispatchEvent(new Event(WS_DISCONNECT_EVENT));
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'], frame.body);
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * 2,
          this.maxReconnectDelay,
        );
        if (this.client) {
          this.client.reconnectDelay = this.currentReconnectDelay;
        }
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      void this.client.deactivate();
      this.client = null;
    }
  }

  publish(destination: string, body: string): void {
    if (!this.client?.connected) {
      throw new Error('STOMP client is not connected');
    }
    this.client.publish({ destination, body });
  }

  subscribe(
    destination: string,
    callback: (message: IMessage) => void,
  ): { unsubscribe: () => void } {
    if (!this.client?.connected) {
      throw new Error('STOMP client is not connected');
    }
    const sub: StompSubscription = this.client.subscribe(destination, callback);
    return {
      unsubscribe: () => {
        sub.unsubscribe();
      },
    };
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

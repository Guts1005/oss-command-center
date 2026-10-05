import { Response } from 'express';

export interface SSEMessage {
  type: string;
  data: any;
}

class SSEManager {
  private clients: Map<string, Set<Response>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Registers a client SSE connection for a specific tenant user.
   */
  public addClient(userId: string, res: Response): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    // Initial connection acknowledgment event
    try {
      res.write(`event: connected\ndata: ${JSON.stringify({ userId, connectedAt: new Date().toISOString() })}\n\n`);
    } catch {
      // Ignored if client closed prematurely
    }

    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  /**
   * Removes a client connection on socket close or abort.
   */
  public removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Dispatches a structured event payload exclusively to a specific user's connected browsers.
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of Array.from(userClients)) {
      try {
        client.write(payload);
      } catch {
        userClients.delete(client);
      }
    }
  }

  /**
   * Broadcasts an event to all connected sessions across tenants.
   */
  public broadcast(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, userClients] of this.clients.entries()) {
      for (const client of Array.from(userClients)) {
        try {
          client.write(payload);
        } catch {
          userClients.delete(client);
        }
      }
    }
  }

  /**
   * Returns active connection count for diagnostics.
   */
  public getActiveCount(userId?: string): number {
    if (userId) {
      return this.clients.get(userId)?.size || 0;
    }
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Sends keep-alive heartbeat comments every 20 seconds to prevent proxy disconnects.
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const comment = `: heartbeat ${Date.now()}\n\n`;
      for (const userClients of this.clients.values()) {
        for (const client of Array.from(userClients)) {
          try {
            client.write(comment);
          } catch {
            userClients.delete(client);
          }
        }
      }
    }, 20000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }
}

export const sseManager = new SSEManager();

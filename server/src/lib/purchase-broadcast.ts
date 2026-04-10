import type { Response } from 'express';

export interface PurchaseBroadcastEvent {
  gameId: string;
  gameTitle: string;
  quantity: number;
  timestamp: string;
}

const clients = new Set<Response>();

export function registerPurchaseClient(response: Response): void {
  clients.add(response);
}

export function unregisterPurchaseClient(response: Response): void {
  clients.delete(response);
}

export function broadcastPurchase(event: PurchaseBroadcastEvent): void {
  const payload = `event: purchase\ndata: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}

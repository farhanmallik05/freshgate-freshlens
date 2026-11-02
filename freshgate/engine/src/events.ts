export interface SSEMessage {
  id: number;
  event: string;
  data: any;
  timestamp: string;
}

const ringBuffer: SSEMessage[] = [];
const RING_BUFFER_SIZE = 50;
let nextEventId = 1;

type SSEListener = (msg: SSEMessage) => void;
const listeners = new Set<SSEListener>();

export function emitSSEEvent(event: string, data: any): void {
  const msg: SSEMessage = {
    id: nextEventId++,
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  ringBuffer.push(msg);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.shift();
  }

  for (const listener of listeners) {
    try {
      listener(msg);
    } catch {
      // ignore
    }
  }
}

export function subscribeSSE(
  lastEventId: number | null,
  callback: (chunk: string) => void
): () => void {
  // Replay historical events from ring buffer if Last-Event-ID is provided
  if (lastEventId !== null && !isNaN(lastEventId)) {
    const replay = ringBuffer.filter((m) => m.id > lastEventId);
    for (const msg of replay) {
      callback(`id: ${msg.id}\nevent: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
    }
  }

  const listener: SSEListener = (msg) => {
    callback(`id: ${msg.id}\nevent: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
  };

  listeners.add(listener);

  // Heartbeat interval
  const timer = setInterval(() => {
    callback(`: heartbeat\n\n`);
  }, 15000);

  return () => {
    clearInterval(timer);
    listeners.delete(listener);
  };
}

export function getRecentEvents(): SSEMessage[] {
  return [...ringBuffer];
}

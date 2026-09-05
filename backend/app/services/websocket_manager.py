"""
ANTIGRAVITY — WebSocket Connection Manager
Broadcasts real-time events to all connected dashboard clients.
"""
import asyncio
import json
import logging
from typing import List

from fastapi import WebSocket

logger = logging.getLogger("antigravity.ws")


class WebSocketManager:
    """Manages WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict) -> None:
        """Broadcast an event to all connected clients."""
        message = json.dumps({"type": event_type, "data": data}, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: dict) -> None:
        """Send a message to a specific client."""
        message = json.dumps({"type": event_type, "data": data}, default=str)
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket)


# Global singleton
ws_manager = WebSocketManager()

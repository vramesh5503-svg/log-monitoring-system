"""
WebSocket connection manager — broadcasts real-time alerts to all
connected dashboard clients.

Each connected browser tab holds one WebSocket connection.
When DetectionEngine fires an alert it calls manager.broadcast(payload),
which fans out to every active client.
"""

import asyncio
import json
import logging
from typing import List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Thread-safe registry of active WebSocket connections.

    Note: All methods that interact with WebSocket objects must be awaited
    inside an async context (i.e. FastAPI async route handlers or
    asyncio.get_event_loop().create_task()).
    """

    def __init__(self):
        # All active connections
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(
            "WS client connected. Total connections: %d",
            len(self.active_connections),
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a closed or errored WebSocket connection."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(
            "WS client disconnected. Total connections: %d",
            len(self.active_connections),
        )

    async def broadcast(self, message: str) -> None:
        """
        Send *message* (JSON string) to every connected client.
        Silently drops broken connections instead of crashing.
        """
        dead: List[WebSocket] = []
        async with self._lock:
            connections_snapshot = list(self.active_connections)

        for ws in connections_snapshot:
            try:
                await ws.send_text(message)
            except Exception as exc:
                logger.warning("Failed to send WS message, dropping connection: %s", exc)
                dead.append(ws)

        # Clean up broken sockets
        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self.active_connections:
                        self.active_connections.remove(ws)

    async def send_personal(self, websocket: WebSocket, message: str) -> None:
        """Send a message to a single specific connection."""
        try:
            await websocket.send_text(message)
        except Exception as exc:
            logger.warning("Failed to send personal WS message: %s", exc)
            await self.disconnect(websocket)

    def broadcast_sync(self, message: str) -> None:
        """
        Synchronous wrapper — used from non-async detection engine threads.
        Schedules the coroutine on the running event loop if one exists.
        """
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(message))
        except RuntimeError:
            # No running loop in this thread — skip push
            pass

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# ─────────────────────────────────────────────────────────────────────────────
# Global singleton
# ─────────────────────────────────────────────────────────────────────────────

ws_manager = ConnectionManager()

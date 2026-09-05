"""
ANTIGRAVITY — MQTT Client
Subscribes to edge engine events, publishes system events.
Topics: antigravity/alerts, antigravity/detections, antigravity/cameras, antigravity/system
"""
import asyncio
import json
import logging
from typing import Callable, Optional

import paho.mqtt.client as mqtt

from app.core.config import settings

logger = logging.getLogger("antigravity.mqtt")

TOPIC_ALERTS = "antigravity/alerts"
TOPIC_DETECTIONS = "antigravity/detections"
TOPIC_CAMERAS = "antigravity/cameras"
TOPIC_SYSTEM = "antigravity/system"

ALL_TOPICS = [TOPIC_ALERTS, TOPIC_DETECTIONS, TOPIC_CAMERAS, TOPIC_SYSTEM]

_mqtt_client: Optional[mqtt.Client] = None
_message_handlers: dict[str, list[Callable]] = {}


def _on_connect(client: mqtt.Client, userdata, flags, rc, properties=None):
    """Callback when MQTT connects."""
    if rc == 0:
        logger.info(f"MQTT connected to {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        for topic in ALL_TOPICS:
            client.subscribe(topic, qos=1)
            logger.info(f"  Subscribed to: {topic}")
    else:
        logger.error(f"MQTT connection failed with code {rc}")


def _on_disconnect(client, userdata, rc, properties=None):
    """Callback when MQTT disconnects."""
    logger.warning(f"MQTT disconnected (rc={rc}), will auto-reconnect")


def _on_message(client, userdata, msg: mqtt.MQTTMessage):
    """Callback when MQTT message received."""
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        topic = msg.topic
        logger.debug(f"MQTT [{topic}]: {json.dumps(payload)[:200]}")

        handlers = _message_handlers.get(topic, [])
        for handler in handlers:
            try:
                handler(topic, payload)
            except Exception as e:
                logger.error(f"MQTT handler error on {topic}: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"MQTT invalid JSON on {msg.topic}: {e}")


def get_mqtt_client() -> mqtt.Client:
    """Return the global MQTT client, creating it if needed."""
    global _mqtt_client
    if _mqtt_client is None:
        _mqtt_client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id="antigravity-backend",
            protocol=mqtt.MQTTv5,
        )
        _mqtt_client.on_connect = _on_connect
        _mqtt_client.on_disconnect = _on_disconnect
        _mqtt_client.on_message = _on_message
        _mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)
    return _mqtt_client


def start_mqtt() -> None:
    """Connect and start the MQTT client loop in a background thread."""
    client = get_mqtt_client()
    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
        client.loop_start()
        logger.info("MQTT client loop started")
    except Exception as e:
        logger.error(f"MQTT connection error: {e}")


def stop_mqtt() -> None:
    """Stop and disconnect the MQTT client."""
    global _mqtt_client
    if _mqtt_client:
        _mqtt_client.loop_stop()
        _mqtt_client.disconnect()
        _mqtt_client = None
        logger.info("MQTT client stopped")


def register_handler(topic: str, handler: Callable) -> None:
    """Register a message handler for a specific topic."""
    if topic not in _message_handlers:
        _message_handlers[topic] = []
    _message_handlers[topic].append(handler)


def publish(topic: str, payload: dict) -> None:
    """Publish a JSON message to a topic."""
    client = get_mqtt_client()
    message = json.dumps(payload, default=str)
    result = client.publish(topic, message, qos=1)
    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        logger.error(f"MQTT publish failed on {topic}: rc={result.rc}")

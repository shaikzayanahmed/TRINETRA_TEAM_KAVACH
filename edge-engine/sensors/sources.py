"""
ANTIGRAVITY — Edge Engine: Video Source Abstraction
Supports: Webcam, MP4 file, RTSP stream, Thermal video.
"""
import abc
import time
import logging
from dataclasses import dataclass, field
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("antigravity.sensors")


@dataclass
class SensorFrame:
    """Universal frame container from any sensor type."""
    frame: np.ndarray
    timestamp: float
    sensor_type: str  # "rgb" or "thermal"
    width: int = 0
    height: int = 0
    frame_number: int = 0

    def __post_init__(self):
        if self.frame is not None:
            self.height, self.width = self.frame.shape[:2]


class VideoSource(abc.ABC):
    """Abstract base class for all video input sources."""

    def __init__(self, source_id: str, sensor_type: str = "rgb"):
        self.source_id = source_id
        self.sensor_type = sensor_type
        self._frame_count = 0
        self._is_open = False

    @abc.abstractmethod
    def open(self) -> bool:
        """Open the video source. Returns True on success."""
        ...

    @abc.abstractmethod
    def read(self) -> Optional[SensorFrame]:
        """Read the next frame. Returns None if unavailable."""
        ...

    @abc.abstractmethod
    def release(self) -> None:
        """Release the video source."""
        ...

    @property
    def is_open(self) -> bool:
        return self._is_open

    def get_fps(self) -> float:
        return 30.0


class WebcamSource(VideoSource):
    """Webcam / USB camera via OpenCV."""

    def __init__(self, device_id: int = 0, source_id: str = "webcam-0"):
        super().__init__(source_id, "rgb")
        self.device_id = device_id
        self._cap: Optional[cv2.VideoCapture] = None

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self.device_id)
        self._is_open = self._cap.isOpened()
        if self._is_open:
            logger.info(f"Webcam opened: device {self.device_id}")
        else:
            logger.error(f"Failed to open webcam: device {self.device_id}")
        return self._is_open

    def read(self) -> Optional[SensorFrame]:
        if not self._cap or not self._cap.isOpened():
            return None
        ret, frame = self._cap.read()
        if not ret:
            return None
        self._frame_count += 1
        return SensorFrame(
            frame=frame,
            timestamp=time.time(),
            sensor_type=self.sensor_type,
            frame_number=self._frame_count,
        )

    def release(self) -> None:
        if self._cap:
            self._cap.release()
            self._is_open = False
            logger.info(f"Webcam released: device {self.device_id}")

    def get_fps(self) -> float:
        if self._cap:
            return self._cap.get(cv2.CAP_PROP_FPS) or 30.0
        return 30.0


class FileSource(VideoSource):
    """Local video file (MP4, AVI, etc.) with optional loop."""

    def __init__(self, file_path: str, loop: bool = True, source_id: str = "file-0"):
        super().__init__(source_id, "rgb")
        self.file_path = file_path
        self.loop = loop
        self._cap: Optional[cv2.VideoCapture] = None

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self.file_path)
        self._is_open = self._cap.isOpened()
        if self._is_open:
            logger.info(f"File source opened: {self.file_path}")
        else:
            logger.error(f"Failed to open file: {self.file_path}")
        return self._is_open

    def read(self) -> Optional[SensorFrame]:
        if not self._cap or not self._cap.isOpened():
            return None
        ret, frame = self._cap.read()
        if not ret:
            if self.loop:
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self._cap.read()
                if not ret:
                    return None
            else:
                return None
        self._frame_count += 1
        return SensorFrame(
            frame=frame,
            timestamp=time.time(),
            sensor_type=self.sensor_type,
            frame_number=self._frame_count,
        )

    def release(self) -> None:
        if self._cap:
            self._cap.release()
            self._is_open = False
            logger.info(f"File source released: {self.file_path}")

    def get_fps(self) -> float:
        if self._cap:
            return self._cap.get(cv2.CAP_PROP_FPS) or 25.0
        return 25.0


class RTSPSource(VideoSource):
    """RTSP camera stream."""

    def __init__(self, rtsp_url: str, source_id: str = "rtsp-0"):
        super().__init__(source_id, "rgb")
        self.rtsp_url = rtsp_url
        self._cap: Optional[cv2.VideoCapture] = None

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self.rtsp_url)
        self._is_open = self._cap.isOpened()
        if self._is_open:
            logger.info(f"RTSP source opened: {self.rtsp_url}")
        else:
            logger.error(f"Failed to open RTSP: {self.rtsp_url}")
        return self._is_open

    def read(self) -> Optional[SensorFrame]:
        if not self._cap or not self._cap.isOpened():
            return None
        ret, frame = self._cap.read()
        if not ret:
            logger.warning("RTSP frame read failed, attempting reconnect...")
            self._cap.release()
            self._cap = cv2.VideoCapture(self.rtsp_url)
            return None
        self._frame_count += 1
        return SensorFrame(
            frame=frame,
            timestamp=time.time(),
            sensor_type=self.sensor_type,
            frame_number=self._frame_count,
        )

    def release(self) -> None:
        if self._cap:
            self._cap.release()
            self._is_open = False
            logger.info(f"RTSP source released: {self.rtsp_url}")

    def get_fps(self) -> float:
        if self._cap:
            return self._cap.get(cv2.CAP_PROP_FPS) or 25.0
        return 25.0


class ThermalFileSource(VideoSource):
    """Thermal camera video file source."""

    def __init__(self, file_path: str, loop: bool = True, source_id: str = "thermal-0"):
        super().__init__(source_id, "thermal")
        self.file_path = file_path
        self.loop = loop
        self._cap: Optional[cv2.VideoCapture] = None

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self.file_path)
        self._is_open = self._cap.isOpened()
        if self._is_open:
            logger.info(f"Thermal source opened: {self.file_path}")
        else:
            logger.error(f"Failed to open thermal: {self.file_path}")
        return self._is_open

    def read(self) -> Optional[SensorFrame]:
        if not self._cap or not self._cap.isOpened():
            return None
        ret, frame = self._cap.read()
        if not ret:
            if self.loop:
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self._cap.read()
                if not ret:
                    return None
            else:
                return None
        self._frame_count += 1
        # Apply thermal colormap for visualization
        if len(frame.shape) == 2 or frame.shape[2] == 1:
            frame = cv2.applyColorMap(frame, cv2.COLORMAP_INFERNO)
        return SensorFrame(
            frame=frame,
            timestamp=time.time(),
            sensor_type="thermal",
            frame_number=self._frame_count,
        )

    def release(self) -> None:
        if self._cap:
            self._cap.release()
            self._is_open = False
            logger.info(f"Thermal source released: {self.file_path}")

    def get_fps(self) -> float:
        if self._cap:
            return self._cap.get(cv2.CAP_PROP_FPS) or 15.0
        return 15.0


def create_source(source_type: str, source_url: str, source_id: str = "cam-0") -> VideoSource:
    """Factory: create the appropriate VideoSource from type and URL."""
    source_type = source_type.upper()
    if source_type == "WEBCAM":
        device = int(source_url) if source_url.isdigit() else 0
        return WebcamSource(device_id=device, source_id=source_id)
    elif source_type == "FILE":
        return FileSource(file_path=source_url, source_id=source_id)
    elif source_type == "RTSP":
        return RTSPSource(rtsp_url=source_url, source_id=source_id)
    elif source_type == "THERMAL_FILE":
        return ThermalFileSource(file_path=source_url, source_id=source_id)
    else:
        raise ValueError(f"Unknown source type: {source_type}")

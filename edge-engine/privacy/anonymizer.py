"""
ANTIGRAVITY — Edge Engine: Privacy / Face Anonymization
Detects and blurs faces before evidence storage.
"""
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("antigravity.privacy")


class FaceAnonymizer:
    """
    Detects faces using OpenCV Haar cascades and applies Gaussian blur.
    Ensures no unblurred faces are stored in evidence when enabled.
    """

    def __init__(self, enabled: bool = True, blur_strength: int = 51):
        self.enabled = enabled
        self.blur_strength = blur_strength
        self._face_cascade: Optional[cv2.CascadeClassifier] = None

    def load(self) -> None:
        """Load the Haar cascade face detector."""
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self._face_cascade = cv2.CascadeClassifier(cascade_path)
        if self._face_cascade.empty():
            logger.error("Failed to load face cascade classifier")
        else:
            logger.info("Face anonymizer loaded (Haar cascade)")

    def anonymize(self, frame: np.ndarray) -> np.ndarray:
        """
        Detect and blur all faces in the frame.
        Returns the anonymized frame (copy).
        """
        if not self.enabled:
            return frame

        if self._face_cascade is None:
            self.load()

        result = frame.copy()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = self._face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        for (x, y, w, h) in faces:
            # Apply strong Gaussian blur to face region
            face_roi = result[y:y+h, x:x+w]
            blurred = cv2.GaussianBlur(
                face_roi,
                (self.blur_strength, self.blur_strength),
                30,
            )
            result[y:y+h, x:x+w] = blurred

        if len(faces) > 0:
            logger.debug(f"Anonymized {len(faces)} face(s)")

        return result

    def detect_faces(self, frame: np.ndarray) -> list:
        """Return list of face bounding boxes [(x, y, w, h), ...]."""
        if self._face_cascade is None:
            self.load()

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self._face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        return list(faces)

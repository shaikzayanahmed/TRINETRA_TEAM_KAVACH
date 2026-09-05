from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field
from pydantic_core import MultiHostUrl


class Settings(BaseSettings):
    """
    ANTIGRAVITY — Central configuration.
    All values are loaded from environment variables / .env file.
    """

    # ── PostgreSQL ──
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "antigravity"

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return MultiHostUrl.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        ).unicode_string()

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI_SYNC(self) -> str:
        return MultiHostUrl.build(
            scheme="postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        ).unicode_string()

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── MinIO ──
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False

    # ── MQTT ──
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883

    # ── JWT ──
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_STRING"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ── YOLO ──
    YOLO_MODEL: str = "yolov8n.pt"
    DETECTION_CONFIDENCE: float = 0.40
    INFERENCE_BACKEND: str = "auto"

    # ── Privacy ──
    PRIVACY_BLUR_ENABLED: bool = True

    # ── Alert Engine ──
    ALERT_COOLDOWN: int = 30
    MIN_TRACK_DURATION: int = 5
    MIN_CONFIDENCE: float = 0.4
    MOVEMENT_THRESHOLD: float = 10.0
    POSITION_SMOOTHING: float = 0.3

    # ── Video Sources ──
    VIDEO_SOURCE: str = "sample_data/videos/sample.mp4"
    THERMAL_SOURCE: str = "sample_data/thermal/thermal_sample.mp4"
    THERMAL_OFFSET_X: int = 0
    THERMAL_OFFSET_Y: int = 0
    THERMAL_SCALE: float = 1.0

    # ── Backend ──
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )


settings = Settings()

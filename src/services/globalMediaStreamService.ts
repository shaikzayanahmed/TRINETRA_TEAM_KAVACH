/**
 * Global Media Stream & Camera Persistence Service
 *
 * Keeps active webcam video streams and uploaded media files alive in memory
 * across page transitions and component mounts, eliminating camera restarts,
 * repeated permission requests, and duplicate media uploads.
 */

import { DetectionFilterMode } from './visionAiService';

export interface ActiveMediaConfig {
  videoSrc: string;
  fileName: string;
  isPlaying?: boolean;
  currentTime?: number;
  spectralFilter?: 'OPTICAL' | 'FLIR_IRONBOW' | 'WHITE_HOT' | 'GREEN_NVG' | 'THERMAL_CAMO';
  filterMode?: DetectionFilterMode;
  isLooping?: boolean;
  playbackRate?: number;
}

const SESSION_WEBCAM_KEY = 'trinetra_webcam_stream_active_v1';
const SESSION_MEDIA_KEY = 'trinetra_uploaded_media_config_v1';

class GlobalMediaStreamService {
  private activeWebcamStream: MediaStream | null = null;
  private isAcquiringWebcam: boolean = false;
  private webcamListeners: Set<(stream: MediaStream | null) => void> = new Set();
  
  private activeMedia: ActiveMediaConfig | null = null;
  private mediaListeners: Set<(media: ActiveMediaConfig | null) => void> = new Set();

  constructor() {
    this.rehydrateStoredMedia();
  }

  private rehydrateStoredMedia() {
    try {
      const stored = sessionStorage.getItem(SESSION_MEDIA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If it's a remote URL, restore it immediately.
        if (parsed && parsed.videoSrc) {
          this.activeMedia = parsed;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  // =========================================================================
  // GLOBAL WEBCAM PERSISTENCE PIPELINE
  // =========================================================================

  /**
   * Retrieves existing active webcam stream or acquires new stream if not yet created.
   * Never terminates tracks when components unmount.
   */
  public async getOrCreateWebcamStream(): Promise<MediaStream> {
    if (this.activeWebcamStream && this.isStreamLive(this.activeWebcamStream)) {
      return this.activeWebcamStream;
    }

    if (this.isAcquiringWebcam) {
      // Wait for ongoing request
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.activeWebcamStream && this.isStreamLive(this.activeWebcamStream)) {
            clearInterval(checkInterval);
            resolve(this.activeWebcamStream);
          } else if (!this.isAcquiringWebcam) {
            clearInterval(checkInterval);
            reject(new Error('Webcam acquisition aborted'));
          }
        }, 80);
      });
    }

    this.isAcquiringWebcam = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.activeWebcamStream = stream;
      sessionStorage.setItem(SESSION_WEBCAM_KEY, 'ACTIVE');

      // Notify any attached component listeners
      this.webcamListeners.forEach((listener) => {
        try {
          listener(stream);
        } catch {}
      });

      window.dispatchEvent(
        new CustomEvent('trinetra_webcam_started', { detail: { stream } })
      );

      return stream;
    } finally {
      this.isAcquiringWebcam = false;
    }
  }

  /**
   * Synchronous accessor for the currently active stream
   */
  public getWebcamStreamSync(): MediaStream | null {
    if (this.activeWebcamStream && this.isStreamLive(this.activeWebcamStream)) {
      return this.activeWebcamStream;
    }
    return null;
  }

  /**
   * Returns true if webcam is currently running or was previously activated
   */
  public isWebcamActive(): boolean {
    if (this.activeWebcamStream && this.isStreamLive(this.activeWebcamStream)) {
      return true;
    }
    return sessionStorage.getItem(SESSION_WEBCAM_KEY) === 'ACTIVE';
  }

  /**
   * Attach listener for webcam stream changes
   */
  public subscribeWebcam(listener: (stream: MediaStream | null) => void): () => void {
    this.webcamListeners.add(listener);
    if (this.activeWebcamStream && this.isStreamLive(this.activeWebcamStream)) {
      listener(this.activeWebcamStream);
    }
    return () => {
      this.webcamListeners.delete(listener);
    };
  }

  private isStreamLive(stream: MediaStream): boolean {
    return stream.active && stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  /**
   * User-directed manual stop
   */
  public stopWebcamStream() {
    if (this.activeWebcamStream) {
      this.activeWebcamStream.getTracks().forEach((track) => track.stop());
      this.activeWebcamStream = null;
    }
    sessionStorage.removeItem(SESSION_WEBCAM_KEY);
    this.webcamListeners.forEach((listener) => {
      try {
        listener(null);
      } catch {}
    });
  }

  // =========================================================================
  // GLOBAL UPLOADED MEDIA & STREAM PERSISTENCE PIPELINE
  // =========================================================================

  /**
   * Stores active media file / stream configuration globally so navigation never loses it
   */
  public setActiveMedia(media: ActiveMediaConfig) {
    this.activeMedia = {
      isPlaying: true,
      isLooping: true,
      currentTime: 0,
      spectralFilter: 'OPTICAL',
      filterMode: 'ALL_OBJECTS',
      ...media,
    };

    try {
      // Persist state metadata in sessionStorage
      sessionStorage.setItem(
        SESSION_MEDIA_KEY,
        JSON.stringify({
          videoSrc: media.videoSrc,
          fileName: media.fileName,
          spectralFilter: media.spectralFilter,
          filterMode: media.filterMode,
          isLooping: media.isLooping ?? true,
        })
      );
    } catch {
      // Storage quota limit fallback
    }

    this.mediaListeners.forEach((listener) => {
      try {
        listener(this.activeMedia);
      } catch {}
    });

    window.dispatchEvent(
      new CustomEvent('trinetra_media_updated', { detail: this.activeMedia })
    );
  }

  /**
   * Updates playback state without resetting stream source
   */
  public updateMediaPlayback(updates: Partial<ActiveMediaConfig>) {
    if (!this.activeMedia) return;
    this.activeMedia = { ...this.activeMedia, ...updates };
  }

  /**
   * Returns current persistent media configuration
   */
  public getActiveMedia(): ActiveMediaConfig | null {
    return this.activeMedia;
  }

  /**
   * Returns true if there is an active uploaded or connected media stream
   */
  public hasActiveMedia(): boolean {
    return Boolean(this.activeMedia?.videoSrc);
  }

  /**
   * Subscribe to uploaded media updates
   */
  public subscribeMedia(listener: (media: ActiveMediaConfig | null) => void): () => void {
    this.mediaListeners.add(listener);
    if (this.activeMedia) {
      listener(this.activeMedia);
    }
    return () => {
      this.mediaListeners.delete(listener);
    };
  }

  /**
   * Clears the current media upload
   */
  public clearActiveMedia() {
    this.activeMedia = null;
    try {
      sessionStorage.removeItem(SESSION_MEDIA_KEY);
    } catch {}
    this.mediaListeners.forEach((listener) => {
      try {
        listener(null);
      } catch {}
    });
    window.dispatchEvent(new CustomEvent('trinetra_media_updated', { detail: null }));
  }
}

export const globalMediaStreamService = new GlobalMediaStreamService();

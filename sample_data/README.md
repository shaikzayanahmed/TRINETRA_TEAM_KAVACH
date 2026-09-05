# Sample Data for ANTIGRAVITY

## Video Sources

The edge engine supports multiple input sources:

### 1. MP4 Video File (Recommended for demo)
Place your surveillance video file here:
```
sample_data/videos/sample.mp4
```

You can use any standard MP4 video. For best results, use footage containing people walking through a scene.

### 2. Webcam
Set `VIDEO_SOURCE=0` in `.env` and `source_type=WEBCAM` to use your computer's webcam.

### 3. RTSP Camera Stream
Set `source_type=RTSP` and provide the RTSP URL of your IP camera:
```
rtsp://username:password@camera-ip:554/stream
```

### 4. Thermal Camera Video
Place your thermal video file here:
```
sample_data/thermal/thermal_sample.mp4
```
Set `source_type=THERMAL_FILE` and update `THERMAL_SOURCE` in `.env`.

## Free Sample Videos

You can download free surveillance test videos from:
- [VIRAT Video Dataset](https://viratdata.org/) — Real surveillance footage
- [MOT Challenge](https://motchallenge.net/) — Multi-object tracking videos
- [Pexels](https://www.pexels.com/search/videos/surveillance/) — Free stock surveillance footage

## Directory Structure
```
sample_data/
├── videos/          # RGB surveillance video files
│   └── sample.mp4   # Main demo video (you provide this)
├── thermal/         # Thermal camera video files
│   └── thermal_sample.mp4
├── rgb/             # Individual RGB frames (optional)
└── README.md        # This file
```

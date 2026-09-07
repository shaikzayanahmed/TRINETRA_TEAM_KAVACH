import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VirtualFence, VirtualFencePoint, FenceGeometryType, FenceSourceTarget } from '../types';
import { apiService } from '../services/apiService';
import { TacticalMapViewer } from '../components/map/TacticalMapViewer';
import { WebcamFeed } from '../components/camera/WebcamFeed';
import { VideoStreamFeed } from '../components/camera/VideoStreamFeed';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_POINTS: Record<FenceGeometryType, VirtualFencePoint[]> = {
  TRIPWIRE: [
    { x: 15, y: 55, lat: 34.2945, lng: 77.7492, label: 'PT 1 (START)' },
    { x: 85, y: 55, lat: 34.2878, lng: 77.7584, label: 'PT 2 (END)' },
  ],
  POLYGON: [
    { x: 25, y: 25, lat: 34.2952, lng: 77.7485, label: 'NODE 1' },
    { x: 75, y: 25, lat: 34.2948, lng: 77.7582, label: 'NODE 2' },
    { x: 80, y: 75, lat: 34.2882, lng: 77.7591, label: 'NODE 3' },
    { x: 20, y: 75, lat: 34.2886, lng: 77.7495, label: 'NODE 4' },
  ],
  '3D_SURROUNDING': [
    { x: 30, y: 35, lat: 34.2941, lng: 77.7501, label: 'BASE 1' },
    { x: 70, y: 35, lat: 34.2938, lng: 77.7565, label: 'BASE 2' },
    { x: 75, y: 70, lat: 34.2892, lng: 77.7571, label: 'BASE 3' },
    { x: 25, y: 70, lat: 34.2895, lng: 77.7505, label: 'BASE 4' },
  ],
};

export const VirtualFencePage: React.FC = () => {
  const [sourceTarget, setSourceTarget] = useState<FenceSourceTarget>('CAM-RGB-01');
  const [fenceType, setFenceType] = useState<FenceGeometryType>('POLYGON');
  const [points, setPoints] = useState<VirtualFencePoint[]>(DEFAULT_POINTS.POLYGON);
  const [heightMeters, setHeightMeters] = useState<number>(4.5);
  const [threshold, setThreshold] = useState<number>(85.0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [zoneName, setZoneName] = useState<string>('Sector 07 Zone Alpha');
  const [direction, setDirection] = useState<'BIDIRECTIONAL' | 'ENTRY_ONLY' | 'EXIT_ONLY'>('ENTRY_ONLY');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSavedToDb, setIsSavedToDb] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const { isFenceBreached, triggerBreach, resetDemo } = useDemo();
  const { user, isOperator, isAdmin } = useAuth();

  // Load existing fence configuration on mount
  useEffect(() => {
    const fetchFences = async () => {
      const data = await apiService.getVirtualFences();
      if (data.length > 0) {
        const primary = data[0];
        setZoneName(primary.name || 'Sector 07 Zone Alpha');
        setIsActive(primary.status === 'ACTIVE');
        setThreshold(primary.confidenceThreshold || 85.0);
        if (primary.type) setFenceType(primary.type);
        if (primary.sourceTarget) setSourceTarget(primary.sourceTarget);
        if (primary.heightMeters) setHeightMeters(primary.heightMeters);
        if (primary.direction) setDirection(primary.direction);
        if (primary.points && primary.points.length >= 2) {
          setPoints(primary.points);
        }
      }
    };
    fetchFences();
  }, []);

  // Handle vertex drag interactions
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (draggingIndex === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(2, Math.min(98, Number(rawX.toFixed(1))));
      const clampedY = Math.max(2, Math.min(98, Number(rawY.toFixed(1))));

      // Compute approximate PostGIS WGS-84 coordinates based on Sector 07 geodetic origin
      const lat = Number((34.2911 + ((50 - clampedY) / 100) * 0.015).toFixed(4));
      const lng = Number((77.7533 + ((clampedX - 50) / 100) * 0.02).toFixed(4));

      setPoints((prev) => {
        const next = [...prev];
        next[draggingIndex] = {
          ...next[draggingIndex],
          x: clampedX,
          y: clampedY,
          lat,
          lng,
        };
        return next;
      });
      setIsSavedToDb(false);
    },
    [draggingIndex]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // Add a new point to the polygon when clicking on the SVG canvas (if in polygon mode and under 8 points)
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex !== null || !svgRef.current) return;
    if (fenceType === 'TRIPWIRE' && points.length >= 2) return;
    if (points.length >= 8) return;

    // Check if clicked directly on a handle circle
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'circle') return;

    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(2, Math.min(98, Number(rawX.toFixed(1))));
    const clampedY = Math.max(2, Math.min(98, Number(rawY.toFixed(1))));
    const lat = Number((34.2911 + ((50 - clampedY) / 100) * 0.015).toFixed(4));
    const lng = Number((77.7533 + ((clampedX - 50) / 100) * 0.02).toFixed(4));

    const newPt: VirtualFencePoint = {
      x: clampedX,
      y: clampedY,
      lat,
      lng,
      label: `NODE ${points.length + 1}`,
    };

    setPoints((prev) => [...prev, newPt]);
    setSelectedPointIndex(points.length);
    setIsSavedToDb(false);
  };

  const removePoint = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (fenceType === 'TRIPWIRE' && points.length <= 2) return;
    if (points.length <= 3) return;
    setPoints((prev) => prev.filter((_, i) => i !== idx));
    setSelectedPointIndex(null);
    setIsSavedToDb(false);
  };

  const handleSwitchFenceType = (type: FenceGeometryType) => {
    setFenceType(type);
    setPoints(DEFAULT_POINTS[type]);
    setSelectedPointIndex(null);
    setIsSavedToDb(false);
  };

  const handleApplyPreset = (presetKey: 'CENTER' | 'DIAGONAL_TRIPWIRE' | 'BUNKER_3D' | 'FULL_PERIMETER') => {
    setIsSavedToDb(false);
    if (presetKey === 'CENTER') {
      setFenceType('POLYGON');
      setPoints([
        { x: 30, y: 30, lat: 34.2941, lng: 77.7501, label: 'NODE 1' },
        { x: 70, y: 30, lat: 34.2938, lng: 77.7565, label: 'NODE 2' },
        { x: 70, y: 70, lat: 34.2892, lng: 77.7571, label: 'NODE 3' },
        { x: 30, y: 70, lat: 34.2895, lng: 77.7505, label: 'NODE 4' },
      ]);
    } else if (presetKey === 'DIAGONAL_TRIPWIRE') {
      setFenceType('TRIPWIRE');
      setPoints([
        { x: 10, y: 80, lat: 34.2881, lng: 77.7475, label: 'PT 1 (START)' },
        { x: 90, y: 20, lat: 34.2955, lng: 77.7595, label: 'PT 2 (END)' },
      ]);
    } else if (presetKey === 'BUNKER_3D') {
      setFenceType('3D_SURROUNDING');
      setHeightMeters(6.0);
      setPoints(DEFAULT_POINTS['3D_SURROUNDING']);
    } else if (presetKey === 'FULL_PERIMETER') {
      setFenceType('POLYGON');
      setPoints([
        { x: 8, y: 8, lat: 34.2965, lng: 77.7455, label: 'CORNER NW' },
        { x: 92, y: 8, lat: 34.2961, lng: 77.7612, label: 'CORNER NE' },
        { x: 92, y: 92, lat: 34.2862, lng: 77.7618, label: 'CORNER SE' },
        { x: 8, y: 92, lat: 34.2868, lng: 77.7451, label: 'CORNER SW' },
      ]);
    }
  };

  const handleSaveToPostgis = async () => {
    // Generate PostGIS WKT representation
    let wkt = '';
    if (fenceType === 'TRIPWIRE') {
      wkt = `LINESTRING(${points.map((p) => `${p.lng || 77.7533} ${p.lat || 34.2911}`).join(', ')})`;
    } else {
      const closedPoints = [...points, points[0]];
      wkt = `POLYGON((${closedPoints.map((p) => `${p.lng || 77.7533} ${p.lat || 34.2911}`).join(', ')}))`;
    }

    const fencePayload: VirtualFence = {
      id: 'VF-01',
      name: zoneName,
      type: fenceType,
      sourceTarget,
      status: isActive ? 'ACTIVE' : 'INACTIVE',
      sector: 'Sector 07 (Northern Leh)',
      confidenceThreshold: threshold,
      assignedCameras: [sourceTarget === 'TACTICAL_MAP' ? 'CAM-RGB-01' : sourceTarget],
      points,
      heightMeters: fenceType === '3D_SURROUNDING' ? heightMeters : undefined,
      postgisWkt: wkt,
      breachCount: isFenceBreached ? 1 : 0,
      direction,
      lastBreachTimestamp: new Date().toLocaleTimeString(),
    };

    await apiService.saveVirtualFence(fencePayload);
    setIsSavedToDb(true);
    setSaveNotice(`✅ Virtual Fence geometry (${fenceType}) successfully committed to PostgreSQL / PostGIS [trinetra_db]`);
    setTimeout(() => setSaveNotice(null), 4500);
  };

  const handleToggleActive = async () => {
    const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    setIsActive(!isActive);
    await apiService.toggleVirtualFence('VF-01', nextStatus);
  };

  // SVG Polygon Points String Calculation
  const polygonPointsStr = points.map((p) => `${p.x * 8},${p.y * 5}`).join(' ');

  // Approximate metrics calculation
  const calculatedPerimeter = points.reduce((acc, p, idx) => {
    const next = points[(idx + 1) % points.length];
    const dx = (next.x - p.x) * 12.5;
    const dy = (next.y - p.y) * 12.5;
    return acc + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const calculatedArea =
    fenceType === 'TRIPWIRE'
      ? 0
      : Math.abs(
          points.reduce((acc, p, idx) => {
            const next = points[(idx + 1) % points.length];
            return acc + (p.x * next.y - next.x * p.y);
          }, 0) / 2
        ) * 145;

  const calculatedVolume = calculatedArea * heightMeters;

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header Bar */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">fence</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface flex items-center gap-2">
              <span>Virtual Geofence & Spatial 3D Tripwire Studio</span>
              <span className="px-2 py-0.2 rounded bg-primary/20 text-primary text-[10px] font-mono font-bold border border-primary/40">
                POSTGIS 3.4
              </span>
            </h1>
            <span className="font-mono text-[11px] text-outline">
              CALIBRATED POLYGON HEURISTICS · 3D BOUNDING VOLUME & COLLISION DETECTOR
            </span>
          </div>
        </div>

        {/* Breach Test & Operator Role Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container border border-surface-container-high text-outline">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span className="text-[11px] font-bold text-on-surface">
              {isAdmin ? 'ROLE: ADMIN' : isOperator ? 'ROLE: OPERATOR' : user?.role || 'ROLE: OPERATOR'}
            </span>
          </div>

          <button
            onClick={isFenceBreached ? resetDemo : triggerBreach}
            className={`px-3 py-1.5 rounded-lg border font-bold uppercase transition-all shadow-md flex items-center gap-1.5 ${
              isFenceBreached
                ? 'bg-secondary text-on-secondary border-secondary hover:bg-secondary/90'
                : 'bg-error-container text-on-error border-error/50 hover:bg-error animate-pulse'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFenceBreached ? 'check_circle' : 'crisis_alert'}
            </span>
            <span>{isFenceBreached ? 'RESET BREACH STATE' : 'TEST BOUNDARY BREACH'}</span>
          </button>
        </div>
      </div>

      {/* Database Save Status Notification */}
      {saveNotice && (
        <div className="p-3 rounded-xl bg-secondary-container/20 border border-secondary text-secondary font-mono text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">verified</span>
            <span>{saveNotice}</span>
          </div>
          <button onClick={() => setSaveNotice(null)} className="text-outline hover:text-on-surface">
            ✕
          </button>
        </div>
      )}

      {/* Main Studio Workspace Grid: Interactive Feed Canvas (Left 7 cols) & Parameter Controls (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Interactive Feed & Geometry Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Source Target Selector & Geometry Mode Toolbar */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            {/* Camera Feed Source Selector */}
            <div className="flex items-center gap-1">
              <span className="text-outline text-[10px] uppercase font-bold mr-1">FEED SOURCE:</span>
              <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-surface-container-high text-[11px]">
                <button
                  onClick={() => setSourceTarget('CAM-RGB-01')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 ${
                    sourceTarget === 'CAM-RGB-01'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">videocam</span>
                  <span>LAPTOP RGB</span>
                </button>

                <button
                  onClick={() => setSourceTarget('CAM-LWIR-01')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 ${
                    sourceTarget === 'CAM-LWIR-01'
                      ? 'bg-tertiary text-on-tertiary font-bold shadow-sm'
                      : 'text-outline hover:text-tertiary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">podcasts</span>
                  <span>LIVE STREAM</span>
                </button>

                <button
                  onClick={() => setSourceTarget('TACTICAL_MAP')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 ${
                    sourceTarget === 'TACTICAL_MAP'
                      ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                      : 'text-outline hover:text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">map</span>
                  <span>GIS MAP</span>
                </button>
              </div>
            </div>

            {/* Geometry Mode Selector */}
            <div className="flex items-center gap-1">
              <span className="text-outline text-[10px] uppercase font-bold mr-1">TYPE:</span>
              <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-surface-container-high text-[11px]">
                <button
                  onClick={() => handleSwitchFenceType('TRIPWIRE')}
                  className={`px-2 py-1 rounded-md transition-all font-semibold ${
                    fenceType === 'TRIPWIRE'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  TRIPWIRE
                </button>
                <button
                  onClick={() => handleSwitchFenceType('POLYGON')}
                  className={`px-2 py-1 rounded-md transition-all font-semibold ${
                    fenceType === 'POLYGON'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  2D POLYGON
                </button>
                <button
                  onClick={() => handleSwitchFenceType('3D_SURROUNDING')}
                  className={`px-2 py-1 rounded-md transition-all font-semibold ${
                    fenceType === '3D_SURROUNDING'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  3D CUBE
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Drawing Canvas Stage */}
          <div className="relative w-full h-[460px] sm:h-[520px] rounded-xl overflow-hidden border border-surface-container-high/70 bg-surface-container-lowest shadow-tactical-extruded group">
            {/* Background Feed Media */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {sourceTarget === 'CAM-RGB-01' ? (
                <WebcamFeed showDetection={false} />
              ) : sourceTarget === 'CAM-LWIR-01' ? (
                <VideoStreamFeed showDetection={false} />
              ) : (
                <TacticalMapViewer interactive={false} compact={true} />
              )}
            </div>

            {/* Tactical Interactive Drawing SVG Overlay */}
            <svg
              ref={svgRef}
              viewBox="0 0 800 500"
              preserveAspectRatio="none"
              onClick={handleSvgClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`absolute inset-0 w-full h-full cursor-crosshair transition-all ${
                draggingIndex !== null ? 'cursor-grabbing' : ''
              }`}
            >
              <defs>
                {/* Tactical Laser Glow Filter */}
                <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Breach Alarm Glow Filter */}
                <filter id="breachGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid Overlay Lines */}
              <g stroke="rgba(173,198,255,0.06)" strokeWidth="1" strokeDasharray="4,4">
                <line x1="200" y1="0" x2="200" y2="500" />
                <line x1="400" y1="0" x2="400" y2="500" />
                <line x1="600" y1="0" x2="600" y2="500" />
                <line x1="0" y1="125" x2="800" y2="125" />
                <line x1="0" y1="250" x2="800" y2="250" />
                <line x1="0" y1="375" x2="800" y2="375" />
              </g>

              {/* 3D Volumetric Extrusion Ceiling & Pillars (If 3D Mode) */}
              {fenceType === '3D_SURROUNDING' && (
                <g>
                  {/* Projected Top Ceiling Wireframe */}
                  <polygon
                    points={points
                      .map((p) => `${p.x * 8},${Math.max(10, p.y * 5 - heightMeters * 12)}`)
                      .join(' ')}
                    fill={isFenceBreached ? 'rgba(255,84,73,0.12)' : 'rgba(173,198,255,0.08)'}
                    stroke={isFenceBreached ? '#ff5449' : '#adc6ff'}
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                    filter="url(#laserGlow)"
                  />

                  {/* Vertical Laser Pillars Connecting Floor Nodes to Ceiling Nodes */}
                  {points.map((p, idx) => (
                    <line
                      key={`pillar-${idx}`}
                      x1={p.x * 8}
                      y1={p.y * 5}
                      x2={p.x * 8}
                      y2={Math.max(10, p.y * 5 - heightMeters * 12)}
                      stroke={isFenceBreached ? '#ff5449' : '#adc6ff'}
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      filter="url(#laserGlow)"
                    />
                  ))}
                </g>
              )}

              {/* Floor Polygon / Tripwire Geometry */}
              {fenceType === 'TRIPWIRE' ? (
                /* 2-Point Linear Tripwire Laser */
                points.length >= 2 && (
                  <g>
                    {/* Glow Aura Line */}
                    <line
                      x1={points[0].x * 8}
                      y1={points[0].y * 5}
                      x2={points[1].x * 8}
                      y2={points[1].y * 5}
                      stroke={isFenceBreached ? '#ff5449' : '#38bdf8'}
                      strokeWidth="8"
                      opacity="0.3"
                      filter={isFenceBreached ? 'url(#breachGlow)' : 'url(#laserGlow)'}
                    />
                    {/* Core Laser Line */}
                    <line
                      x1={points[0].x * 8}
                      y1={points[0].y * 5}
                      x2={points[1].x * 8}
                      y2={points[1].y * 5}
                      stroke={isFenceBreached ? '#ffb4ab' : '#ffffff'}
                      strokeWidth="2.5"
                    />

                    {/* Tripwire Center Trigger Indicator */}
                    <circle
                      cx={(points[0].x + points[1].x) * 4}
                      cy={(points[0].y + points[1].y) * 2.5}
                      r="7"
                      fill={isFenceBreached ? '#ff5449' : '#38bdf8'}
                      stroke="#0a0e16"
                      strokeWidth="2"
                    />
                  </g>
                )
              ) : (
                /* Multi-Point Polygon Floor Geofence */
                <g>
                  <polygon
                    points={polygonPointsStr}
                    fill={
                      isFenceBreached
                        ? 'rgba(255, 84, 73, 0.25)'
                        : 'rgba(56, 189, 248, 0.12)'
                    }
                    stroke={isFenceBreached ? '#ff5449' : '#38bdf8'}
                    strokeWidth="2.5"
                    filter={isFenceBreached ? 'url(#breachGlow)' : 'url(#laserGlow)'}
                    className={isFenceBreached ? 'animate-pulse' : ''}
                  />
                </g>
              )}

              {/* Draggable Vertex Node Handles */}
              {points.map((pt, idx) => (
                <g
                  key={`handle-${idx}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingIndex(idx);
                    setSelectedPointIndex(idx);
                  }}
                  className="cursor-pointer group/node"
                >
                  {/* Outer Pulsing Reticle */}
                  <circle
                    cx={pt.x * 8}
                    cy={pt.y * 5}
                    r={selectedPointIndex === idx ? 13 : 9}
                    fill="none"
                    stroke={isFenceBreached ? '#ff5449' : '#38bdf8'}
                    strokeWidth="1.5"
                    opacity={selectedPointIndex === idx ? 0.9 : 0.6}
                    className="group-hover/node:scale-125 transition-transform"
                  />
                  {/* Inner Solid Handle Dot */}
                  <circle
                    cx={pt.x * 8}
                    cy={pt.y * 5}
                    r="5"
                    fill={selectedPointIndex === idx ? '#ffffff' : isFenceBreached ? '#ff5449' : '#38bdf8'}
                    stroke="#0a0e16"
                    strokeWidth="1.5"
                  />

                  {/* Node Label Tooltip */}
                  <rect
                    x={pt.x * 8 + 8}
                    y={pt.y * 5 - 20}
                    width="68"
                    height="18"
                    rx="3"
                    fill="#0a0e16"
                    stroke={isFenceBreached ? '#ff5449' : '#38bdf8'}
                    strokeWidth="1"
                    opacity="0.85"
                  />
                  <text
                    x={pt.x * 8 + 12}
                    y={pt.y * 5 - 8}
                    fill="#dfe2ed"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    {pt.label || `NODE ${idx + 1}`}
                  </text>
                </g>
              ))}
            </svg>

            {/* Canvas Bottom Interactive Tip */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-lg bg-surface-container-lowest/90 backdrop-blur border border-surface-container-high/60 flex items-center justify-between font-mono text-[11px] text-outline shadow-md">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[14px] text-primary">touch_app</span>
                <span>Click & drag handles to reshape boundary · Click canvas to add node</span>
              </span>
              <span className="text-secondary font-bold">
                {points.length} ACTIVE VERTICES
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Controls & PostGIS Parameters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
            {/* Zone Name & Status Switcher */}
            <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
              <div className="flex flex-col">
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => {
                    setZoneName(e.target.value);
                    setIsSavedToDb(false);
                  }}
                  placeholder="Enter Zone Name"
                  className="font-headline text-sm font-bold text-on-surface uppercase bg-transparent border-b border-dashed border-outline focus:border-primary focus:outline-none"
                />
                <span className="font-mono text-[11px] text-outline mt-0.5">
                  POSTGIS RECTANGLE & POLYGON ID: VF-01
                </span>
              </div>

              <button
                onClick={handleToggleActive}
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold uppercase transition-colors ${
                  isActive
                    ? 'bg-secondary-container text-secondary border border-secondary/40'
                    : 'bg-surface-container text-outline border border-surface-container-high'
                }`}
              >
                {isActive ? 'STATUS: ACTIVE' : 'STATUS: INACTIVE'}
              </button>
            </div>

            {/* Quick Shape Presets */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <span className="text-outline uppercase text-[11px] font-semibold">Geometry Presets:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyPreset('CENTER')}
                  className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-high text-on-surface text-[11px] font-semibold transition-colors text-left flex items-center justify-between"
                >
                  <span>Center Box</span>
                  <span className="material-symbols-outlined text-[14px] text-primary">crop_square</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('DIAGONAL_TRIPWIRE')}
                  className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-high text-on-surface text-[11px] font-semibold transition-colors text-left flex items-center justify-between"
                >
                  <span>Tripwire Line</span>
                  <span className="material-symbols-outlined text-[14px] text-primary">timeline</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('BUNKER_3D')}
                  className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-high text-on-surface text-[11px] font-semibold transition-colors text-left flex items-center justify-between"
                >
                  <span>3D Perimeter Box</span>
                  <span className="material-symbols-outlined text-[14px] text-primary">view_in_ar</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('FULL_PERIMETER')}
                  className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-high text-on-surface text-[11px] font-semibold transition-colors text-left flex items-center justify-between"
                >
                  <span>Sector Perimeter</span>
                  <span className="material-symbols-outlined text-[14px] text-primary">crop_free</span>
                </button>
              </div>
            </div>

            {/* 3D Height Extrusion Slider (If 3D Mode) */}
            {fenceType === '3D_SURROUNDING' && (
              <div className="flex flex-col gap-1.5 font-mono text-xs p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-outline uppercase text-[11px]">3D Volumetric Height:</span>
                  <span className="text-primary font-bold">{heightMeters} METERS</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="12.0"
                  step="0.5"
                  value={heightMeters}
                  onChange={(e) => {
                    setHeightMeters(Number(e.target.value));
                    setIsSavedToDb(false);
                  }}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-[10px] text-outline">
                  Extrudes ceiling laser wireframe for low-altitude drone & aerial intrusion detection.
                </span>
              </div>
            )}

            {/* Direction Heuristics Trigger */}
            <div className="flex flex-col gap-1 font-mono text-xs">
              <span className="text-outline uppercase text-[11px] font-semibold">Directional Trigger Filter:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ENTRY_ONLY', 'BIDIRECTIONAL', 'EXIT_ONLY'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => {
                      setDirection(dir);
                      setIsSavedToDb(false);
                    }}
                    className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                      direction === dir
                        ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                        : 'bg-surface-container-lowest text-outline hover:text-on-surface border border-surface-container-high'
                    }`}
                  >
                    {dir === 'ENTRY_ONLY' ? 'ENTRY ONLY' : dir === 'BIDIRECTIONAL' ? 'BIDIRECTIONAL' : 'EXIT ONLY'}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Confidence Threshold Slider */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-outline uppercase">AI Confidence Filter:</span>
                <span className="text-primary font-bold text-sm">{threshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={threshold}
                onChange={(e) => {
                  setThreshold(Number(e.target.value));
                  setIsSavedToDb(false);
                }}
                className="w-full h-2 bg-surface-container-lowest rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Calibrated PostGIS Dimensional Metrics */}
            <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
              <span className="text-outline">Geometry Type:</span>
              <span className="text-right text-primary font-bold">{fenceType}</span>

              <span className="text-outline">Perimeter Length:</span>
              <span className="text-right text-on-surface">{calculatedPerimeter.toFixed(0)} Meters</span>

              <span className="text-outline">Enclosed Area:</span>
              <span className="text-right text-secondary font-bold">{calculatedArea.toFixed(0)} m²</span>

              {fenceType === '3D_SURROUNDING' && (
                <>
                  <span className="text-outline">3D Volume:</span>
                  <span className="text-right text-primary font-bold">{calculatedVolume.toFixed(0)} m³</span>
                </>
              )}

              <span className="text-outline">Total Breaches:</span>
              <span className="text-right text-error font-bold">{isFenceBreached ? 1 : 0}</span>
            </div>

            {/* Active Vertex Nodes List with PostGIS Geodetics & Deletion */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-outline uppercase text-[11px] font-semibold">
                  Boundary Vertices ({points.length}):
                </span>
                <span className="text-[10px] text-outline">PostGIS WGS-84</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {points.map((pt, idx) => (
                  <div
                    key={`pt-node-${idx}`}
                    onClick={() => setSelectedPointIndex(idx)}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                      selectedPointIndex === idx
                        ? 'bg-primary/10 border-primary text-on-surface'
                        : 'bg-surface-container-lowest border-surface-container-high text-outline hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-surface-container flex items-center justify-center font-bold text-primary text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-on-surface">{pt.label || `NODE ${idx + 1}`}</span>
                      <span className="text-[10px] text-outline">
                        [{pt.lat?.toFixed(4)}, {pt.lng?.toFixed(4)}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-secondary font-mono mr-1">
                        {pt.x}%, {pt.y}%
                      </span>
                      {points.length > (fenceType === 'TRIPWIRE' ? 2 : 3) && (
                        <button
                          onClick={(e) => removePoint(idx, e)}
                          title="Delete Node"
                          className="w-5 h-5 rounded hover:bg-error/20 hover:text-error flex items-center justify-center transition-colors text-outline"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save to PostgreSQL / PostGIS Action Button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveToPostgis}
                className="w-full py-3 rounded-lg bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(173,198,255,0.35)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>SAVE TO POSTGIS DATABASE (TRINETRA_DB)</span>
              </button>

              {!isSavedToDb && (
                <span className="text-center font-mono text-[10px] text-tertiary font-semibold animate-pulse">
                  ⚠️ Unsaved geometry modifications detected. Click save to commit changes.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

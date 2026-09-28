import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Crop,
  Maximize2,
  Minimize2,
  Move,
  ShoppingBag,
  Star,
  Heart,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
} from 'lucide-react';

const ASPECT_RATIOS = [
  { id: '3:4', label: '3:4 Portrait', ratio: 3 / 4, desc: 'Fashion & Store Default' },
  { id: '1:1', label: '1:1 Square', ratio: 1, desc: 'Square Catalog' },
  { id: '4:5', label: '4:5 Mobile', ratio: 4 / 5, desc: 'Feed Standard' },
];

const RATIO_NAMES = [
  [3 / 4, '3:4 Portrait'], [1, '1:1 Square'], [4 / 5, '4:5 Mobile'], [4 / 3, '4:3 Landscape'], [16 / 9, '16:9 Wide'], [16 / 6, '16:6 Banner'],
];
const ratioName = (r) => RATIO_NAMES.find(([v]) => Math.abs(v - r) < 0.01)?.[1] || `${Math.round(r * 100) / 100}:1`;

const viewportW = () => (typeof window !== 'undefined' ? window.innerWidth : 1024);

// Largest crop box that fits the modal: at most 340px tall and `maxWidth` wide (less on phones).
const fitBox = (ratio, maxWidth = 440) => {
  const maxW = Math.min(maxWidth, viewportW() - 72);
  const height = Math.min(340, maxW / ratio);
  return { width: Math.round(height * ratio), height: Math.round(height) };
};

// Hero banners are stored at 16:6 and shown with object-cover (centred) in three places.
// The narrower two trim the sides, so the crop frame marks what they keep.
const BANNER_SAFE_ZONES = [
  { ratio: 2, label: 'App' },
  { ratio: 4 / 2.6, label: 'Web phone' },
];

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  aspectRatio = 3 / 4, // 3:4 default for fashion products
  allowRatioSwitch = true,
  title,
  previewType = 'product', // 'product' | 'category' | 'combo' | 'banner'
  itemName = '',
  subtitle = '', // banner only
  badgeText = '', // banner only
  badgeColor = '#E91E8C', // banner only
  price = 999,
  originalPrice = null,
  fileNamePrefix,
  onClose,
  onCropComplete,
  onSkipCrop,
}) {
  // Crop settings
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio || 3 / 4);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Preview tab: 'card' (customer store card) | 'cut' (exact cropped image)
  const [activePreviewTab, setActivePreviewTab] = useState('card');

  const imageRef = useRef(null);
  const workspaceRef = useRef(null);

  // Fixed container dimensions for the interactive crop workspace
  // Height is constrained to ~340px for comfortable modal layout
  const isBanner = previewType === 'banner';
  const { width: boxWidth, height: boxHeight } = fitBox(selectedRatio || 3 / 4, isBanner ? 820 : 440);

  const resolvedPreviewType = previewType || (selectedRatio !== 1 ? 'product' : 'category');
  const modalTitle = title || (
    resolvedPreviewType === 'category'
      ? 'Crop & Position Category Image'
      : resolvedPreviewType === 'combo'
        ? 'Crop & Position Combo Cover'
        : resolvedPreviewType === 'banner'
          ? 'Crop & Position Hero Banner'
          : resolvedPreviewType === 'splash'
            ? 'Crop & Position Splash Screen'
            : 'Crop & Position Product Image'
  );

  // Base scale calculation so image cleanly covers or fits the frame
  const coverScale = naturalSize.width && naturalSize.height
    ? Math.max(boxWidth / naturalSize.width, boxHeight / naturalSize.height)
    : 1;

  const containScale = naturalSize.width && naturalSize.height
    ? Math.min(boxWidth / naturalSize.width, boxHeight / naturalSize.height)
    : 1;

  // Reset state when a new image opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsLoaded(false);
      setSelectedRatio(aspectRatio || (previewType === 'category' ? 1 : 3 / 4));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth || 800, height: img.naturalHeight || 800 });
        setIsLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, aspectRatio, previewType]);

  // React attaches onWheel as a passive listener, so preventDefault there is ignored (and logs
  // an error) and the modal scrolls while zooming. Use a native non-passive listener instead.
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(4, Math.max(0.4, +(prev + delta).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, imageSrc, isLoaded]);

  if (!isOpen || !imageSrc) return null;

  // ── Drag & Pan Handlers ──────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ── Quick Helpers ────────────────────────────────────────────────────────
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFitCover = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleFitContain = () => {
    if (coverScale > 0 && containScale > 0) {
      setZoom(+(containScale / coverScale).toFixed(2));
    }
    setOffset({ x: 0, y: 0 });
  };

  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // ── Save Canvas Crop (100% Synchronized with Viewport) ─────────────────────
  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img || !naturalSize.width || !naturalSize.height) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // High resolution output dimensions
    const outputBase = 1200;
    let outputWidth, outputHeight;
    if (selectedRatio <= 1) {
      outputHeight = outputBase;
      outputWidth = Math.round(outputBase * selectedRatio);
    } else {
      outputWidth = outputBase;
      outputHeight = Math.round(outputBase / selectedRatio);
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Clean background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Scale factor between screen crop box and high-res canvas
    const scaleFactor = outputWidth / boxWidth;

    ctx.save();
    // 1. Move to canvas center
    ctx.translate(outputWidth / 2, outputHeight / 2);
    // 2. Apply user drag offset (scaled to canvas resolution)
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    // 3. Rotate around the image center
    ctx.rotate((rotation * Math.PI) / 180);
    // 4. Scale by zoom, cover scale, and output scale
    const totalScale = zoom * coverScale * scaleFactor;
    ctx.scale(totalScale, totalScale);
    // 5. Draw image centered
    ctx.drawImage(
      img,
      -naturalSize.width / 2,
      -naturalSize.height / 2,
      naturalSize.width,
      naturalSize.height
    );
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const prefix = fileNamePrefix || (
        resolvedPreviewType === 'category'
          ? 'category'
          : resolvedPreviewType === 'combo'
            ? 'combo'
            : resolvedPreviewType === 'banner'
              ? 'banner'
              : resolvedPreviewType === 'splash'
                ? 'splash'
                : 'product'
      );
      const croppedFile = new File([blob], `cropped_${prefix}_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const croppedPreview = URL.createObjectURL(blob);
      onCropComplete(croppedFile, croppedPreview);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  // Preview sizing for the live preview card
  const previewBoxWidth = 200;
  const previewBoxHeight = Math.round(previewBoxWidth / (selectedRatio || 3 / 4));
  const previewScaleFactor = previewBoxWidth / boxWidth;

  const displayProductName = itemName || 'Premium Oversized Cotton T-Shirt';
  const displayPrice = Number(price) > 0 ? Number(price).toLocaleString('en-IN') : '—'; // no made-up price
  // Show a struck-through price / discount only when the caller passed a real higher price.
  const hasOriginal = Number(originalPrice) > Number(price);
  const displayOriginalPrice = hasOriginal ? Number(originalPrice).toLocaleString('en-IN') : null;
  const discountPct = hasOriginal ? Math.round((1 - Number(price) / Number(originalPrice)) * 100) : 0;

  // The crop frame redrawn at `frameW` px wide (same offset/zoom/rotation, scaled).
  const framedImage = (frameW) => {
    const f = frameW / boxWidth;
    return naturalSize.width > 0 && (
      <img
        src={imageSrc}
        alt=""
        className="max-w-none select-none pointer-events-none"
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: `${naturalSize.width}px`, height: `${naturalSize.height}px`,
          transform: `translate(-50%, -50%) translate(${offset.x * f}px, ${offset.y * f}px) rotate(${rotation}deg) scale(${zoom * coverScale * f})`,
          transformOrigin: 'center center',
        }}
      />
    );
  };

  // A banner placement: a viewW×viewH window showing the centre of the full 16:6 frame.
  // White behind the image, like the saved canvas, so zoomed-out edges preview truthfully.
  const bannerView = (viewW, viewH, variant) => {
    const frameW = viewH * (selectedRatio || 16 / 6);
    return (
      <div className="relative overflow-hidden rounded-xl bg-white shadow-md" style={{ width: viewW, height: viewH }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 overflow-hidden" style={{ width: frameW, height: viewH }}>
          {framedImage(frameW)}
        </div>
        {variant === 'web' ? (
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent flex flex-col justify-center px-[6%] max-w-[75%]">
            {itemName && <p className="text-white font-bold leading-tight drop-shadow truncate" style={{ fontSize: Math.max(9, viewH * 0.11) }}>{itemName}</p>}
            {subtitle && <p className="text-white/85 truncate mt-0.5" style={{ fontSize: Math.max(7, viewH * 0.06) }}>{subtitle}</p>}
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6">
            {itemName && <p className="text-white text-[10px] font-bold truncate">{itemName}</p>}
            {subtitle && <p className="text-white/80 text-[8px] truncate">{subtitle}</p>}
          </div>
        )}
        {badgeText && (
          <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full shadow" style={{ backgroundColor: badgeColor }}>
            {badgeText}
          </span>
        )}
      </div>
    );
  };
  const bannerDesktopW = Math.min(480, viewportW() - 110);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                  {modalTitle}
                </h3>
                {resolvedPreviewType !== 'category' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {ratioName(selectedRatio)}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Drag to reposition • Scroll or slider to zoom • Real-time live store preview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body: 2 Columns ──────────────────────────────────────── */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-h-[80vh] overflow-y-auto">
          
          {/* ── LEFT: Crop & Positioning Workspace (7 cols) ────────────── */}
          <div className={`${isBanner ? 'lg:col-span-12' : 'lg:col-span-7'} flex flex-col items-center`}>
            
            {/* Top Aspect Ratio Switcher (if enabled) */}
            {allowRatioSwitch && resolvedPreviewType === 'product' && (
              <div className="w-full flex items-center justify-between mb-3 bg-neutral-100 dark:bg-neutral-800/70 p-1 rounded-xl">
                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 px-2.5">
                  Frame Ratio:
                </span>
                <div className="flex gap-1">
                  {ASPECT_RATIOS.map((item) => {
                    const isActive = Math.abs(selectedRatio - item.ratio) < 0.01;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedRatio(item.ratio)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instruction banner */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <Move className="w-3.5 h-3.5 text-emerald-500" />
              <span>Drag to move photo • Scroll mouse to zoom</span>
            </div>

            {/* Interactive Crop Frame Container */}
            <div className="relative p-2 rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-xl flex items-center justify-center">
              <div
                ref={workspaceRef}
                className={`relative rounded-xl overflow-hidden border-2 border-dashed border-emerald-500 bg-neutral-950 select-none shadow-2xl ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Image being cropped */}
                {naturalSize.width > 0 && (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Workspace"
                    crossOrigin="anonymous"
                    draggable={false}
                    className="max-w-none select-none pointer-events-none transition-transform duration-75"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: `${naturalSize.width}px`,
                      height: `${naturalSize.height}px`,
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom * coverScale})`,
                      transformOrigin: 'center center',
                    }}
                  />
                )}

                {/* Rule-of-Thirds Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/25">
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                  <div className="border border-white/10" />
                </div>

                {/* Banner: what the narrower placements keep (they trim the sides) */}
                {isBanner && BANNER_SAFE_ZONES.map((z) => (
                  <div
                    key={z.label}
                    className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none border-x-2 border-dashed border-amber-300/90"
                    style={{ width: Math.min(boxWidth, boxHeight * z.ratio) }}
                  >
                    <span className="absolute top-1 left-1 text-[9px] font-bold text-amber-200 bg-black/60 px-1.5 py-0.5 rounded">{z.label}</span>
                  </div>
                ))}

                {/* Subtle Center Target */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                  <div className="w-4 h-4 border border-dashed border-white/80 rounded-full" />
                </div>
              </div>
            </div>

            {/* Controls Bar Below Workspace */}
            <div className="w-full mt-3 space-y-3 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
              
              {/* Zoom Slider */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
                  className="p-1 rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}
                  className="p-1 rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 w-12 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Action Buttons: Cover, Fit, Center, Rotate, Reset */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFitCover}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Fill Frame completely without blank edges"
                  >
                    Fill Frame
                  </button>
                  <button
                    type="button"
                    onClick={handleFitContain}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Show entire photo inside frame"
                  >
                    Fit Whole
                  </button>
                  <button
                    type="button"
                    onClick={handleCenter}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Center photo position"
                  >
                    Center
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw className="w-3 h-3" /> Rotate
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    title="Reset all adjustments"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT: Crystal Clear Live Preview (5 cols) ───────────────── */}
          <div className={`${isBanner ? 'lg:col-span-12' : 'lg:col-span-5'} flex flex-col bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 h-full`}>
            
            {/* Preview Section Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Real Store Preview
                </span>
              </div>
              
              {/* Preview Tabs: Customer Card vs Raw Cut */}
              {resolvedPreviewType !== 'category' && !isBanner && (
                <div className="flex bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('card')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      activePreviewTab === 'card'
                        ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    Store Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('cut')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      activePreviewTab === 'cut'
                        ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    Exact Crop
                  </button>
                </div>
              )}
            </div>

            {/* PREVIEW CONTENT BASED ON TYPE */}
            {isBanner ? (
              /* BANNER PREVIEW — the three real placements */
              <div className="flex flex-col items-center gap-4 py-1">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">🖥️ Website · desktop (full 16:6)</span>
                  {bannerView(bannerDesktopW, Math.round(bannerDesktopW / (selectedRatio || 16 / 6)), 'web')}
                </div>
                <div className="flex flex-wrap items-end justify-center gap-5">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">📱 Website · phone</span>
                    {bannerView(170, Math.round(170 / (4 / 2.6)), 'web')}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">📲 Mobile app</span>
                    {bannerView(210, 105, 'app')}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500 text-center max-w-md">
                  Phones show only the middle of the banner — keep faces and text inside the dashed guides.
                </p>
              </div>
            ) : resolvedPreviewType === 'splash' ? (
              /* SPLASH SCREEN MOBILE PREVIEW */
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  📱 Mobile Splash Screen Preview
                </span>
                <div className="relative w-[190px] h-[338px] rounded-[32px] border-[6px] border-slate-900 shadow-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-900 rounded-full z-30" />
                  <div className="absolute top-2.5 left-4 right-4 flex items-center justify-between text-[8px] font-semibold text-white/80 z-20">
                    <span>9:41</span>
                    <span>5G</span>
                  </div>

                  <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                    {naturalSize.width > 0 && (
                      <img
                        src={imageSrc}
                        alt="Splash cropped preview"
                        className="max-w-none select-none pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: `${naturalSize.width}px`,
                          height: `${naturalSize.height}px`,
                          transform: `translate(-50%, -50%) translate(${offset.x * (178 / boxWidth)}px, ${offset.y * (178 / boxWidth)}px) rotate(${rotation}deg) scale(${zoom * coverScale * (178 / boxWidth)})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
                    <h4 className="text-xl font-black text-white tracking-tight drop-shadow-md line-clamp-2">
                      {itemName || 'Dundu'}
                    </h4>
                    {subtitle && (
                      <p className="text-[10px] font-medium text-white/90 mt-1 max-w-[150px] leading-tight drop-shadow-sm line-clamp-2">
                        {subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>

                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-full bg-white/40 z-20" />
                </div>
                <p className="text-[11px] text-neutral-500 text-center max-w-xs leading-relaxed">
                  Shows how customers see your photo with text and subtext when opening the mobile app.
                </p>
              </div>
            ) : resolvedPreviewType === 'category' ? (
              /* CATEGORY PREVIEW */
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-2">
                
                {/* 1. Circular Strip Avatar (Mobile strip & Web nav) */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    📱 Mobile Strip & Web Header
                  </span>
                  <div className="w-20 h-20 rounded-full border-2 border-emerald-500 ring-4 ring-emerald-500/20 bg-neutral-950 overflow-hidden relative flex items-center justify-center shadow-lg">
                    {naturalSize.width > 0 && (
                      <img
                        src={imageSrc}
                        alt="Category avatar preview"
                        className="max-w-none select-none pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: `${naturalSize.width}px`,
                          height: `${naturalSize.height}px`,
                          transform: `translate(-50%, -50%) translate(${offset.x * (80 / boxWidth)}px, ${offset.y * (80 / boxWidth)}px) rotate(${rotation}deg) scale(${zoom * coverScale * (80 / boxWidth)})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 mt-1.5 max-w-32 text-center truncate">
                    {itemName || 'Category Name'}
                  </span>
                </div>

                {/* 2. Square Catalog Card */}
                <div className="w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 p-2.5 flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    🏷️ Catalog Filter Card
                  </span>
                  <div className="w-28 h-28 rounded-lg bg-neutral-950 overflow-hidden relative flex items-center justify-center border border-neutral-200/60 dark:border-neutral-700/60 shadow-inner">
                    {naturalSize.width > 0 && (
                      <img
                        src={imageSrc}
                        alt="Category card preview"
                        className="max-w-none select-none pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: `${naturalSize.width}px`,
                          height: `${naturalSize.height}px`,
                          transform: `translate(-50%, -50%) translate(${offset.x * (112 / boxWidth)}px, ${offset.y * (112 / boxWidth)}px) rotate(${rotation}deg) scale(${zoom * coverScale * (112 / boxWidth)})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-2 truncate max-w-full">
                    {itemName || 'Category Name'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center leading-relaxed max-w-xs">
                  This preview shows how the category icon appears as circular story avatars and catalog grid cards.
                </p>
              </div>

            ) : resolvedPreviewType === 'combo' && activePreviewTab === 'card' ? (
              /* COMBO PREVIEW */
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  🎁 Customer Combo Card
                </span>
                <div className="w-56 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <div className="w-56 bg-neutral-950 overflow-hidden relative flex items-center justify-center" style={{ height: `${Math.round(224 / (selectedRatio || 4 / 3))}px` }}>
                    {naturalSize.width > 0 && (
                      <img
                        src={imageSrc}
                        alt="Combo preview"
                        className="max-w-none select-none pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: `${naturalSize.width}px`,
                          height: `${naturalSize.height}px`,
                          transform: `translate(-50%, -50%) translate(${offset.x * (224 / boxWidth)}px, ${offset.y * (224 / boxWidth)}px) rotate(${rotation}deg) scale(${zoom * coverScale * (224 / boxWidth)})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                      COMBO DEAL
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {itemName || 'Super Saver Combo Pack'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{displayPrice}</span>
                      {displayOriginalPrice && <span className="text-[11px] text-neutral-400 line-through">₹{displayOriginalPrice}</span>}
                      {discountPct > 0 && <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">{discountPct}% OFF</span>}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500 text-center">
                  Rendered in combo carousels across web & mobile.
                </p>
              </div>

            ) : activePreviewTab === 'cut' ? (
              /* EXACT CROP CUT VIEW */
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> High-Resolution Output File
                </span>
                
                {/* Crop container showing exact cut */}
                <div
                  className="rounded-xl overflow-hidden bg-neutral-950 relative shadow-2xl border-2 border-neutral-300 dark:border-neutral-700"
                  style={{
                    width: `${previewBoxWidth}px`,
                    height: `${previewBoxHeight}px`,
                  }}
                >
                  {naturalSize.width > 0 && (
                    <img
                      src={imageSrc}
                      alt="Exact cut preview"
                      className="max-w-none select-none pointer-events-none"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: `${naturalSize.width}px`,
                        height: `${naturalSize.height}px`,
                        transform: `translate(-50%, -50%) translate(${offset.x * previewScaleFactor}px, ${offset.y * previewScaleFactor}px) rotate(${rotation}deg) scale(${zoom * coverScale * previewScaleFactor})`,
                        transformOrigin: 'center center',
                      }}
                    />
                  )}
                </div>

                {/* Specs badges */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs mt-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    Ratio: {ratioName(selectedRatio)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    Format: High-Res JPEG
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    95% Quality
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  This is the exact cropped file that will be saved.
                </p>
              </div>

            ) : (
              /* REALISTIC DUNDU STORE CUSTOMER PRODUCT CARD VIEW */
              <div className="flex-1 flex flex-col items-center justify-center py-1">
                
                {/* Real E-Commerce Product Card */}
                <div className="w-[210px] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
                  
                  {/* Image container */}
                  <div
                    className="w-full bg-neutral-950 relative overflow-hidden flex items-center justify-center"
                    style={{ height: `${previewBoxHeight}px` }}
                  >
                    {naturalSize.width > 0 && (
                      <img
                        src={imageSrc}
                        alt="Product card live preview"
                        className="max-w-none select-none pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: `${naturalSize.width}px`,
                          height: `${naturalSize.height}px`,
                          transform: `translate(-50%, -50%) translate(${offset.x * previewScaleFactor}px, ${offset.y * previewScaleFactor}px) rotate(${rotation}deg) scale(${zoom * coverScale * previewScaleFactor})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}

                    {/* Top Badges */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md">
                      NEW
                    </span>
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90">
                      <Heart className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className="p-3 flex flex-col gap-1.5 bg-white dark:bg-neutral-900">
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">4.9</span>
                      <span className="text-[9px] text-neutral-400">(84)</span>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1 leading-snug">
                      {displayProductName}
                    </h4>

                    {/* Price & Discount */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-neutral-900 dark:text-white">
                        ₹{displayPrice}
                      </span>
                      {displayOriginalPrice && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          ₹{displayOriginalPrice}
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-300 dark:border-neutral-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-neutral-300 dark:border-neutral-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-neutral-300 dark:border-neutral-700" />
                    </div>

                    {/* Add to Bag Button */}
                    <div className="w-full mt-1 py-1.5 rounded-xl bg-neutral-900 dark:bg-emerald-600 text-white flex items-center justify-center gap-1.5 text-[11px] font-bold shadow-sm">
                      <ShoppingBag className="w-3 h-3" /> Add to Bag
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center mt-2.5 max-w-xs leading-relaxed">
                  Shows how customers see this product card in store feeds, search, and catalogs.
                </p>
              </div>
            )}

          </div>

        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          
          {/* Skip / Use original option */}
          <div>
            {onSkipCrop ? (
              <button
                type="button"
                onClick={onSkipCrop}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:underline cursor-pointer"
              >
                Use original photo without cropping
              </button>
            ) : (
              <span className="text-xs text-neutral-400">
                Crop ratio: <strong className="text-neutral-700 dark:text-neutral-300 font-bold">{ratioName(selectedRatio)}</strong>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSaveCrop}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Cropped Image
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

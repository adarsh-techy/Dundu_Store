import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, Check, Crop } from 'lucide-react';

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  aspectRatio = 1, // 1 for 1:1 square
  onClose,
  onCropComplete,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
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

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const outputWidth = 800;
    const outputHeight = 800 / aspectRatio;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate image render dimensions
    const drawWidth = outputWidth;
    const drawHeight = (img.naturalHeight / img.naturalWidth) * outputWidth;

    ctx.drawImage(
      img,
      -drawWidth / 2 + offset.x,
      -drawHeight / 2 + offset.y,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], `cropped_product_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const croppedPreview = URL.createObjectURL(blob);
      onCropComplete(croppedFile, croppedPreview);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Crop & Position Product Image
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left Crop Workspace */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-500 mb-2">
              Drag to position • Scroll/Slider to zoom
            </span>
            <div
              className="relative w-72 h-72 rounded-xl overflow-hidden border-2 border-dashed border-emerald-500 bg-neutral-900 cursor-move shadow-inner flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-w-none select-none transition-transform duration-75"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
              {/* Crop Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30">
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
            </div>

            {/* Controls Toolbar */}
            <div className="w-full mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-neutral-500" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <ZoomIn className="w-4 h-4 text-neutral-500" />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleRotate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
                </button>
                <button
                  onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Reset Position
                </button>
              </div>
            </div>
          </div>

          {/* Right Live App Mobile Preview */}
          <div className="flex flex-col items-center bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
              📱 Live Mobile App Product Card
            </span>
            <div className="w-48 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="w-48 h-48 bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt="App live preview"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `translate(${offset.x / 2.5}px, ${offset.y / 2.5}px) scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                  NEW
                </span>
              </div>
              <div className="p-3">
                <div className="w-24 h-3 bg-neutral-200 dark:bg-neutral-700 rounded mb-1.5" />
                <div className="w-16 h-2.5 bg-emerald-500/30 rounded mb-2" />
                <div className="flex justify-between items-center">
                  <div className="w-12 h-4 bg-emerald-600 rounded" />
                  <div className="w-6 h-6 bg-emerald-500 rounded-full" />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-neutral-500 mt-3 text-center">
              This is how your product will be rendered in the customer app!
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCrop}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition"
          >
            <Check className="w-4 h-4" /> Save Cropped Image
          </button>
        </div>
      </div>
    </div>
  );
}

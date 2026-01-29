import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Rect, Point, ImageDimensions } from '../types';
import { roundedRect, normalizeRect, generateId } from '../utils/canvasUtils';
import { Download, Undo2, Trash2, Move, MousePointer2 } from 'lucide-react';

interface HighlightCanvasProps {
  imageFile: File;
  onReset: () => void;
}

const HighlightCanvas: React.FC<HighlightCanvasProps> = ({ imageFile, onReset }) => {
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [highlights, setHighlights] = useState<Rect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);

  // Load Image
  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.src = url;
    img.onload = () => {
      setOriginalImage(img);
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Original Image
    ctx.drawImage(originalImage, 0, 0);

    // 2. Draw Semi-transparent Overlay (The "Dimmer")
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; // Adjust opacity here
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Cut out the holes (Highlights)
    // 'destination-out' removes pixels from the existing canvas content (the overlay we just drew)
    // Note: We need to be careful. If we just do destination-out on the main canvas, 
    // it will erase the overlay AND the original image underneath if they are on the same layer.
    // 
    // CORRECT APPROACH: 
    // We can't easily layer 'destination-out' on top of an image in a single context 
    // without erasing the image too.
    // So we use a temporary logic:
    // 1. Save context state.
    // 2. Clip the context to EXCLUDE the highlights? No, complex.
    // 
    // BETTER APPROACH FOR SINGLE CANVAS:
    // 1. Draw Image.
    // 2. Draw Overlay.
    // 3. To "reveal" the image, we actually just redraw the *original image* 
    //    cropped to the highlight rect on TOP of the overlay.
    
    // Let's go with the Redraw Method (cleanest for single canvas):
    
    // Draw highlights
    highlights.forEach(rect => {
      ctx.save();
      // Create a clipping path for the rounded rect
      roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
      ctx.clip();
      
      // Draw the original image again inside this clip
      ctx.drawImage(originalImage, 0, 0);
      
      // Optional: Add a subtle border/glow to make the cut look cleaner
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
      ctx.stroke();
      
      ctx.restore();
    });

    // 4. Draw Current Drag Preview (if drawing)
    if (isDrawing && startPoint && currentMousePos) {
      const { x, y, width, height } = normalizeRect(
        startPoint.x, 
        startPoint.y, 
        currentMousePos.x, 
        currentMousePos.y
      );
      
      ctx.save();
      // Draw a dashed guide box
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      roundedRect(ctx, x, y, width, height, 12);
      ctx.stroke();
      
      // "Fake" the reveal for preview
      ctx.clip();
      ctx.drawImage(originalImage, 0, 0);
      ctx.restore();
    }

  }, [originalImage, highlights, isDrawing, startPoint, currentMousePos]);

  // Trigger draw when state changes
  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Handle Coordinates Conversion (Screen to Canvas)
  const getCanvasCoordinates = (e: React.MouseEvent | MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentMousePos(coords);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    if (isDrawing) {
      setCurrentMousePos(coords);
    } else {
      // Just for cursor tracking if we added hover effects later
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;

    const endPoint = getCanvasCoordinates(e);
    if (endPoint) {
      const { x, y, width, height } = normalizeRect(
        startPoint.x, 
        startPoint.y, 
        endPoint.x, 
        endPoint.y
      );

      // Only add if it's large enough (prevent accidental clicks)
      if (width > 10 && height > 10) {
        const newRect: Rect = {
          id: generateId(),
          x,
          y,
          width,
          height
        };
        setHighlights(prev => [...prev, newRect]);
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentMousePos(null);
  };

  // Actions
  const handleUndo = () => {
    setHighlights(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setHighlights([]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary link
    const link = document.createElement('a');
    link.download = `focused-image-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!originalImage) return null;

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      
      {/* Toolbar */}
      <div className="flex-none h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-lg select-none">
            <Move className="w-5 h-5" />
            <span>FocusFrame</span>
          </div>
          <div className="h-6 w-px bg-gray-600 mx-2"></div>
          <span className="text-gray-400 text-sm hidden sm:block">
            Draw boxes to highlight areas
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleUndo}
            disabled={highlights.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            title="Undo last box (Ctrl+Z)"
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          
          <button 
            onClick={handleClear}
            disabled={highlights.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>

          <div className="h-6 w-px bg-gray-600 mx-2"></div>

          <button 
            onClick={onReset}
            className="text-gray-400 hover:text-white text-sm px-2"
          >
            Change Image
          </button>

          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-900/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
          >
            <Download size={18} />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-950 relative"
      >
        <div className="relative shadow-2xl shadow-black/50 border border-gray-800">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
            className="max-w-full max-h-[80vh] cursor-crosshair block bg-gray-900"
            style={{ 
              // Basic responsive behavior
              width: 'auto',
              height: 'auto', 
            }}
          />
          {highlights.length === 0 && !isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 animate-pulse">
                <MousePointer2 size={16} />
                <span className="text-sm font-medium">Click and drag to highlight</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-gray-950 text-gray-500 text-xs py-2 px-4 flex justify-between border-t border-gray-800">
        <span>Original: {dimensions.width} x {dimensions.height}px</span>
        <span>{highlights.length} Highlights</span>
      </div>
    </div>
  );
};

export default HighlightCanvas;

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageZoomProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  type?: "image" | "video";
}

export default function ImageZoom({ src, alt, isOpen, onClose, type = "image" }: ImageZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s + 0.2, 4));
      } else {
        setScale((s) => {
          const next = Math.max(s - 0.2, 1);
          if (next === 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      }
    },
    []
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastDistRef.current > 0) {
          const ratio = dist / lastDistRef.current;
          setScale((s) => Math.max(1, Math.min(4, s * ratio)));
        }
        lastDistRef.current = dist;
      } else if (isDragging && e.touches.length === 1) {
        setPosition({
          x: e.touches[0].clientX - dragStartRef.current.x,
          y: e.touches[0].clientY - dragStartRef.current.y,
        });
      }
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    lastDistRef.current = 0;
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: "rgba(26,18,14,.95)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <p
              className="text-[12px] font-ui tracking-wide truncate max-w-[60%]"
              style={{ color: "rgba(248,246,242,.6)" }}
            >
              {alt}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                style={{ color: "var(--ivory)" }}
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-[11px] font-ui w-10 text-center" style={{ color: "rgba(248,246,242,.5)" }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                style={{ color: "var(--ivory)" }}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={resetZoom}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                style={{ color: "var(--ivory)" }}
                aria-label="Reset zoom"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/10 ml-1"
                style={{ color: "var(--ivory)" }}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            onClick={(e) => {
              if (e.target === e.currentTarget && scale > 1) {
                resetZoom();
              }
            }}
          >
            {type === "video" ? (
              <video
                src={src}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                controls
                loop
                playsInline
              />
            ) : (
              <motion.img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                draggable={false}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

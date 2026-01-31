"use client";

import { useRef, useState, useEffect } from "react";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    try {
      setIsLoading(true);
      setError("");

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "No se pudo acceder a la cámara. Por favor, verifica los permisos del navegador.",
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      // Cleanup: stop camera when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          handleClose();
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tomar Foto</h2>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <svg
                className="animate-spin w-12 h-12 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p>Iniciando cámara...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-500 text-white p-6 rounded-lg max-w-md text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full object-contain"
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Camera guides overlay */}
        {!isLoading && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-white/20 m-8 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isLoading && !error && (
        <div className="bg-gray-900 p-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Flip camera button */}
            <button
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors"
              title="Cambiar cámara"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Capture button */}
            <button
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-4 border-gray-800 hover:bg-gray-200 transition-all transform active:scale-95"
              title="Tomar foto"
            >
              <div className="w-full h-full rounded-full border-2 border-gray-800" />
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12" />
          </div>

          <p className="text-white text-center text-sm mt-4">
            Asegúrate de que tu torso esté bien iluminado y visible
          </p>
        </div>
      )}
    </div>
  );
}

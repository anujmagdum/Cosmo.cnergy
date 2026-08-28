import React, { useState } from 'react';
import { X, ExternalLink, AlertTriangle, Image as ImageIcon, ZoomIn, RefreshCw } from 'lucide-react';
import { getDriveThumbnailUrl, getDriveThumbnailFallbackUrl, getDriveDirectViewUrl } from '../utils/driveEmbed';

interface Props {
  imageUrl: string;
  componentName: string;
  onClose: () => void;
}

export const DriveImageLightboxModal: React.FC<Props> = ({
  imageUrl,
  componentName,
  onClose
}) => {
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const primaryUrl = getDriveThumbnailUrl(imageUrl, 1200);
  const fallbackUrl = getDriveThumbnailFallbackUrl(imageUrl, 1200);
  const directDriveUrl = getDriveDirectViewUrl(imageUrl);

  const activeSrc = useFallback ? fallbackUrl : primaryUrl;

  const handleImageError = () => {
    if (!useFallback && fallbackUrl) {
      setUseFallback(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4 p-5 md:p-6 text-[#073642]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/70 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-800">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#073642] truncate max-w-md">
                {componentName}
              </h3>
              <p className="text-xs text-[#586E75]">
                Zero-Storage Google Drive Image Lightbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={directDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#EEE8D5] hover:bg-emerald-100 text-[#073642] hover:text-emerald-800 border border-[#D6D1B1] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open direct file in Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Drive</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Image Viewport */}
        <div className="relative w-full min-h-[320px] max-h-[65vh] bg-[#0B192C] rounded-2xl overflow-hidden flex items-center justify-center border border-slate-700">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs font-mono font-bold tracking-wider">Streaming Google Drive CDN Thumbnail...</span>
            </div>
          )}

          {!hasError && activeSrc ? (
            <img
              src={activeSrc}
              alt={componentName}
              onError={handleImageError}
              onLoad={handleImageLoad}
              onClick={() => setIsZoomed(!isZoomed)}
              className={`max-w-full max-h-[65vh] object-contain transition-transform duration-200 cursor-zoom-in ${
                isZoomed ? 'scale-125 cursor-zoom-out' : ''
              }`}
            />
          ) : (
            /* Graceful Fallback Warning */
            <div className="p-8 text-center max-w-md space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-200">
                  Google Drive Permissions Restricted
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Google Drive file cannot be rendered inline because its sharing permissions are restricted.
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl text-left text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-emerald-400">How to fix:</p>
                <p>1. Open the file in Google Drive.</p>
                <p>2. Set Sharing permissions to <strong className="text-white">"Anyone with the link can view"</strong>.</p>
              </div>

              <div className="pt-2">
                <a
                  href={directDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open File in Google Drive</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#586E75] pt-1">
          <span className="flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-emerald-700" />
            <span>Click image to toggle zoom</span>
          </span>
          <span className="font-mono text-[11px] truncate max-w-sm">
            {imageUrl}
          </span>
        </div>
      </div>
    </div>
  );
};

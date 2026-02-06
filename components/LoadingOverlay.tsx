import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  onStart: () => void;
  isLoading: boolean;
  isVisible: boolean;
}

const LoadingOverlay: React.FC<Props> = ({ onStart, isLoading, isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible && containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          if (containerRef.current) containerRef.current.style.display = 'none';
        }
      });
    }
  }, [isVisible]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 text-amber-500"
    >
      <div className="text-center space-y-8 max-w-md px-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-600">
          EMBER HAND
        </h1>
        <p className="text-stone-400 text-lg">
          Web Camera Required. <br/>
          Pinch (🤌) to Create. Open Palm (🫴) to Destroy.
        </p>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-amber-200 rounded-full animate-spin"></div>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-600 hover:border-amber-400"
          >
            <div className="absolute inset-0 w-0 bg-amber-600 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
            <span className="relative text-amber-500 group-hover:text-amber-300 font-semibold tracking-wider uppercase">
              Enter Void
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;

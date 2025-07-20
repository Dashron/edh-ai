'use client';

import { useState, useEffect } from 'react';

interface CardTooltipProps {
  cardName: string;
  x: number;
  y: number;
}

export const CardTooltip = ({ cardName, x, y }: CardTooltipProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cardFaces, setCardFaces] = useState<Array<{name: string; image_uris?: Record<string, string>}> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCardImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        // Query our local database for the card's image_uris and card_faces
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: `SELECT image_uris, card_faces FROM cards WHERE name = '${cardName.replace(/'/g, "''")}'` 
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const { image_uris, card_faces } = result.data[0];
            
            // Check if this is a dual-faced card
            if (card_faces) {
              try {
                const parsedCardFaces = typeof card_faces === 'string' ? JSON.parse(card_faces) : card_faces;
                if (parsedCardFaces && parsedCardFaces.length >= 2) {
                  setCardFaces(parsedCardFaces);
                  setImageUrl(null);
                  return;
                }
              } catch {
                // Fall back to single image
              }
            }
            
            // Single-faced card or fallback
            if (image_uris) {
              let parsedImageUris;
              try {
                parsedImageUris = typeof image_uris === 'string' ? JSON.parse(image_uris) : image_uris;
                setImageUrl(parsedImageUris.normal || parsedImageUris.large || parsedImageUris.small);
                setCardFaces(null);
              } catch {
                setError(true);
              }
            } else {
              setError(true);
            }
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (cardName) {
      fetchCardImage();
    }
  }, [cardName]);

  if (!cardName) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{ 
        left: x + 10, 
        top: y - 150,
        transform: y < 200 ? 'translateY(0)' : 'translateY(-100%)'
      }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl">
        {isLoading && (
          <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">Image not found</span>
          </div>
        )}
        
        {/* Dual-faced card display */}
        {cardFaces && cardFaces.length >= 2 && !isLoading && !error && (
          <div className="flex gap-4">
            {cardFaces.slice(0, 2).map((face, index) => {
              const faceImageUrl = face.image_uris?.normal || face.image_uris?.large || face.image_uris?.small;
              return (
                <div key={index} className="flex flex-col items-center">
                  {faceImageUrl ? (
                    <img 
                      src={faceImageUrl} 
                      alt={face.name}
                      className="max-w-64 h-auto rounded"
                      onError={() => setError(true)}
                    />
                  ) : (
                    <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-300 text-center font-medium max-w-64 truncate">
                    {face.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Single-faced card display */}
        {imageUrl && !cardFaces && !isLoading && !error && (
          <img 
            src={imageUrl} 
            alt={cardName}
            className="max-w-64 h-auto rounded"
            onError={() => setError(true)}
          />
        )}
        
        <div className="mt-2 text-xs text-gray-300 text-center font-medium">
          {cardName}
        </div>
      </div>
    </div>
  );
};
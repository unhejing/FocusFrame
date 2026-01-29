import React, { useRef, useState } from 'react';
import { Upload, ImageIcon, FileWarning } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 animate-fade-in">
      <div 
        className={`
          relative group cursor-pointer
          w-full max-w-2xl h-96 
          border-2 border-dashed rounded-3xl 
          flex flex-col items-center justify-center 
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
            : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleInputChange} 
        />
        
        <div className="bg-gray-800 p-6 rounded-full mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
          <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-200 mb-2">Upload an Image</h3>
        <p className="text-gray-400 text-center max-w-md">
          Drag and drop your screenshot or photo here,<br/> or click to browse files.
        </p>
        
        <div className="absolute bottom-8 flex gap-4 text-xs text-gray-500 font-mono">
          <span className="flex items-center gap-1"><ImageIcon size={14}/> JPG</span>
          <span className="flex items-center gap-1"><ImageIcon size={14}/> PNG</span>
          <span className="flex items-center gap-1"><ImageIcon size={14}/> WEBP</span>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;

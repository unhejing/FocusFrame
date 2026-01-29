import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import HighlightCanvas from './components/HighlightCanvas';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImageSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleReset = () => {
    // Optional: Confirm if edits exist? Keeping it simple for now.
    setSelectedFile(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden font-sans">
      {!selectedFile ? (
        <ImageUploader onImageSelected={handleImageSelected} />
      ) : (
        <HighlightCanvas 
          imageFile={selectedFile} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
};

export default App;

"use client";

import { useState } from "react";

export default function DocumentUploader({ onUploadComplete, onError }) {
  const [file, setFile] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = setFile(event.target.files[0]);
    if (!file) return;

    // Add other valid file types in future
    const isValidType = file.type === "application/pdf";
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
    const isValid = isValidType && isValidSize;

    if (!isValid) {
      onError("Invalid file type or size.  Please upload a PDF file less than 10MB.");
      return;
    }

    setFile(file);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        onUploadComplete(result.message);
      } else {
        // Handle server errors or invalid responses
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading the file", error);
    }
  };

  // Implementation of file upload goes here

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

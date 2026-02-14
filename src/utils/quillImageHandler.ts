/**
 * Custom image handler for React Quill
 * Uploads images to the server instead of embedding them as base64
 * Supports image resizing via width attribute
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

export const imageHandler = function (this: any) {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Image size must be less than 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }

    try {
      // Show loading state
      const quill = this.quill;
      const range = quill.getSelection(true);
      quill.insertText(range.index, "Uploading image...");

      // Upload to server
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("polwel_access_token");
      const response = await fetch(`${API_BASE_URL}/uploads/rich-text-image`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error("Invalid response from server");
      }

      // Remove loading text
      quill.deleteText(range.index, "Uploading image...".length);

      // Insert the image URL
      const fullImageUrl = data.url.startsWith("http") ? data.url : `${API_BASE_URL.replace("/api", "")}${data.url}`;
      quill.insertEmbed(range.index, "image", fullImageUrl);
      quill.setSelection(range.index + 1);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image. Please try again.");

      // Remove loading text on error
      const quill = this.quill;
      const range = quill.getSelection();
      if (range) {
        const text = quill.getText(range.index - "Uploading image...".length, "Uploading image...".length);
        if (text === "Uploading image...") {
          quill.deleteText(range.index - "Uploading image...".length, "Uploading image...".length);
        }
      }
    }
  };
};

export const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
    handlers: {
      image: imageHandler,
    },
  },
};

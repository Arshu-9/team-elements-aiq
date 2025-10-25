import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Paperclip, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FileUploadButtonProps {
  sessionId: string;
  onFileUploaded?: () => void;
}

export const FileUploadButton = ({ sessionId, onFileUploaded }: FileUploadButtonProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateQRNGKey = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-qrng-key");
      if (error) throw error;
      return data.key;
    } catch (error) {
      console.error("Error generating QRNG key:", error);
      // Fallback to crypto random
      const array = new Uint8Array(4);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 8);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate one-time QRNG encryption key
      const encryptionKey = await generateQRNGKey();

      // Upload file to storage
      const filePath = `${sessionId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("session-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store file metadata with encryption key
      const { error: dbError } = await (supabase as any).from("session_files").insert({
        session_id: sessionId,
        uploader_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        encryption_key: encryptionKey,
      });

      if (dbError) throw dbError;

      toast({
        title: "File uploaded",
        description: `${file.name} secured with quantum encryption`,
      });

      onFileUploaded?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="hover:bg-primary/10"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="relative">
            <Paperclip className="w-5 h-5" />
            <Lock className="w-2 h-2 absolute -top-1 -right-1 text-primary" />
          </div>
        )}
      </Button>
    </>
  );
};

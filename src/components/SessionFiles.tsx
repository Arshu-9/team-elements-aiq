import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, Download, Lock, Eye, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { Card } from "./ui/card";

interface SessionFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  is_opened: boolean;
  encryption_key: string;
  uploader_id: string;
  created_at: string;
  file_path: string;
}

interface SessionFilesProps {
  sessionId: string;
}

export const SessionFiles = ({ sessionId }: SessionFilesProps) => {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("session_files")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFiles(data || []);
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();

    const channel = supabase
      .channel(`session-files-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_files",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFiles((prev) => [payload.new as SessionFile, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setFiles((prev) =>
              prev.map((f) => (f.id === payload.new.id ? (payload.new as SessionFile) : f))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleFileOpen = async (file: SessionFile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (file.is_opened) {
        toast({
          title: "File already opened",
          description: "This file's quantum lock has been used. It can no longer be accessed.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from("session-files")
        .download(file.file_path);

      if (error) throw error;

      // Mark file as opened
      await (supabase as any)
        .from("session_files")
        .update({
          is_opened: true,
          opened_by: user.id,
          opened_at: new Date().toISOString(),
        })
        .eq("id", file.id);

      // Download the file
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "File downloaded",
        description: "⚠️ This file's quantum lock has been consumed. It cannot be accessed again.",
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Download failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎙️";
    if (type.includes("pdf")) return "📄";
    if (type.includes("document") || type.includes("word")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    return "📎";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-6 glass rounded-xl">
        <FileIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No files shared yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <Card key={file.id} className="glass border-primary/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">{getFileIcon(file.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {file.is_opened ? (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>Opened</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleFileOpen(file)}
                  className="elegant-glow-sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Open (1x)
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

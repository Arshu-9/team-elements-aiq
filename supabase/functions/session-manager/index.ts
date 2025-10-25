import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, sessionId, userId } = await req.json();

    if (action === "rotate-key") {
      // Get session
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        throw new Error("Session not found");
      }

      // Generate new key
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-qrng-key`, {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      const keyData = await response.json();
      const newKey = keyData.key;

      // Store old key rotation
      await supabase.from("session_key_rotations").insert({
        session_id: sessionId,
        old_key: session.session_key,
        new_key: newKey,
      });

      // Update session with new key
      await supabase
        .from("sessions")
        .update({ session_key: newKey })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({ success: true, newKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "destroy-session") {
      console.log(`Destroying session ${sessionId}`);
      
      // Check if user is creator
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.creator_id !== userId) {
        throw new Error("Only creator can destroy session");
      }

      // Delete all messages (including spy and burn mode)
      await supabase
        .from("session_messages")
        .delete()
        .eq("session_id", sessionId);

      // Delete all files from storage
      const { data: files } = await supabase
        .from("session_files")
        .select("file_path")
        .eq("session_id", sessionId);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => f.file_path);
        await supabase.storage.from("session-files").remove(filePaths);
      }

      // Delete file records
      await supabase
        .from("session_files")
        .delete()
        .eq("session_id", sessionId);

      // Delete participants
      await supabase
        .from("session_participants")
        .delete()
        .eq("session_id", sessionId);

      // Delete chat state
      await supabase
        .from("session_chat_state")
        .delete()
        .eq("session_id", sessionId);

      // Delete key rotations
      await supabase
        .from("session_key_rotations")
        .delete()
        .eq("session_id", sessionId);

      // Delete intrusion attempts
      await supabase
        .from("intrusion_attempts")
        .delete()
        .eq("session_id", sessionId);

      // Finally, completely delete the session (not just mark inactive)
      await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-expired") {
      // Find all expired sessions
      const { data: expiredSessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("is_active", true)
        .lt("expires_at", new Date().toISOString());

      if (expiredSessions && expiredSessions.length > 0) {
        for (const session of expiredSessions) {
          // Auto-destroy expired sessions
          await fetch(`${supabaseUrl}/functions/v1/session-manager`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "destroy-session",
              sessionId: session.id,
              userId: "system",
            }),
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, expired: expiredSessions?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

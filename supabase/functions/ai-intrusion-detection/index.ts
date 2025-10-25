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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId, userId, deviceInfo, reason } = await req.json();

    console.log("AI Intrusion Detection triggered", { sessionId, userId, reason });

    // Get session details
    const { data: session } = await supabase
      .from("sessions")
      .select("*, creator_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    // Use AI to analyze the intrusion attempt
    const aiAnalysis = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a security AI analyzing unauthorized session access attempts. Provide a brief, professional security assessment.",
          },
          {
            role: "user",
            content: `Analyze this intrusion attempt:
Session: ${session.name}
Reason: ${reason}
Device Info: ${JSON.stringify(deviceInfo)}
User ID: ${userId || "Unknown"}

Provide a 1-sentence security assessment of this attempt.`,
          },
        ],
      }),
    });

    if (!aiAnalysis.ok) {
      console.error("AI analysis failed:", await aiAnalysis.text());
    }

    const aiData = await aiAnalysis.json();
    const aiAssessment = aiData.choices?.[0]?.message?.content || "Unauthorized access attempt detected";

    console.log("AI Assessment:", aiAssessment);

    // Generate new quantum key
    const keyResponse = await fetch(`${supabaseUrl}/functions/v1/generate-qrng-key`, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const keyData = await keyResponse.json();
    const newKey = keyData.key;

    console.log("New quantum key generated");

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

    console.log("Session key rotated");

    // Log the intrusion attempt
    await supabase.from("intrusion_attempts").insert({
      session_id: sessionId,
      attempted_by_user_id: userId,
      reason: reason,
      device_info: deviceInfo,
    });

    console.log("Intrusion logged");

    // Get creator's profile
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.creator_id)
      .single();

    // Get all authorized participants
    const { data: participants } = await supabase
      .from("session_participants")
      .select("user_id")
      .eq("session_id", sessionId);

    console.log("Notifying participants of key change");

    // Send notification to creator through a system message
    if (participants && participants.length > 0) {
      await supabase.from("session_messages").insert({
        session_id: sessionId,
        sender_id: session.creator_id,
        content: `🚨 Security Alert: ${reason}. Session quantum key has been automatically refreshed. New key: ${newKey}\n\n🤖 AI Assessment: ${aiAssessment}`,
        chat_mode: "normal",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocked: true,
        newKey,
        aiAssessment,
        message: "Intrusion blocked and key rotated",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

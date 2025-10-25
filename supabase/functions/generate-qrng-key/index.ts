import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generating QRNG key...");
    
    // Fetch quantum random numbers from ANU QRNG
    // Using hex16 type to get hexadecimal characters
    const response = await fetch(
      "https://qrng.anu.edu.au/API/jsonI.php?length=4&type=hex16&size=1"
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch quantum random numbers");
    }
    
    const data = await response.json();
    console.log("QRNG response:", data);
    
    if (!data.success || !data.data || data.data.length === 0) {
      throw new Error("Invalid QRNG response");
    }
    
    // Convert hex values to uppercase 7-character key
    const hexValues = data.data as string[];
    const key = hexValues.join("").substring(0, 7).toUpperCase();
    
    console.log("Generated key:", key);
    
    return new Response(
      JSON.stringify({ key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating QRNG key:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate key",
        fallback: true,
        key: Math.random().toString(36).substring(2, 9).toUpperCase()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

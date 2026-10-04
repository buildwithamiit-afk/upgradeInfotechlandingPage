import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. JSON parse the incoming browser request
    const body = await request.json();
    const { name, phone, email, course, location, source } = body;

    // 2. Server-side Validations
    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Valid name is required' }), { status: 400 });
    }

    const rawPhone = phone || '';
    const phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return new Response(JSON.stringify({ error: 'Valid 10-digit mobile number is required' }), { status: 400 });
    }

    // Default values if course/location aren't present
    const finalCourse = course || 'SAP (Unknown)';
    const finalLocation = location || 'Not Specified';
    const formName = source || 'Unknown Form';

    // 3. Prepare payload for the CRM
    const crmPayload: any = {
      name: name.trim(),
      mobile: phoneDigits.slice(-10),
      course: finalCourse,
      location: finalLocation,
      message: `Lead from: ${formName} (${finalCourse} - ${finalLocation})`,
      source: "New Landing Page"
    };

    if (email && email.trim() !== '') {
      crmPayload.email = email.trim();
    }

    // 4. Fetch the secure URL from environment variables
    const crmUrl = import.meta.env.CRM_URL;
    
    if (!crmUrl) {
      console.error("[API Lead Error] CRM_URL environment variable is missing!");
      return new Response(JSON.stringify({ error: 'Internal Server Error (CRM_URL missing)' }), { status: 500 });
    }

    // 5. Forward data to CRM
    console.log(`[API Lead] Sending lead from "${formName}" to CRM...`);
    const crmResponse = await fetch(crmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmPayload)
    });

    // 6. Check CRM Status and Log
    if (!crmResponse.ok) {
      console.error(`[API Lead Error] CRM rejected with status: ${crmResponse.status}`);
      return new Response(JSON.stringify({ error: 'Failed to sync with CRM' }), { status: 502 });
    }

    console.log(`[API Lead] Lead successfully sent to CRM (Status: ${crmResponse.status})`);
    
    // 7. Return success to the browser
    return new Response(JSON.stringify({ success: true, redirect: '/thank-you' }), { status: 200 });

  } catch (error) {
    console.error("[API Lead Exception]", error);
    return new Response(JSON.stringify({ error: 'Something went wrong processing your request' }), { status: 500 });
  }
};

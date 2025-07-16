// @ts-nocheck
// $lib/utils/web-admins.js

// This is a helper utility for uploading products to shopify or validating api keys


const API_BASE_URL = '/api/web-admins';


//Tests if a gemini API key works / is valid. Returns true or false.
async function testGeminiKey(apiKey) {
    
    let valid = true;
    //?type=gemini search parameter must be specified 
    const response = await fetch(API_BASE_URL+"?type=gemini", {
      method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({apiKey}),
    });

    if (!response.ok) {
        const errorData = await response.json();
        valid = false;
    }
    return valid;
}


//Tests if a shopify destination is valid. Returns true or false.
async function testShopifyAccess(url, apiKey) {
    
    let valid = true;
    //?type=shopify search parameter must be specified 
    const response = await fetch(API_BASE_URL+"?type=shopify", {
      method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({accessToken: apiKey, storeUrl: url}),
    });

    if (!response.ok) {
        const errorData = await response.json();
        valid = false;
    }
    return valid;
}


async function uploadProductsToShopify(productIds, destinationId, publishing, markup,  handlers, abortSignal) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds, destinationId, publishing, markup }),
            signal: abortSignal

        });

        if (!response.body) {
            throw new Error("Response body is missing, can't stream updates.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

         
            let eventEndIndex;
            while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
                const eventData = buffer.substring(0, eventEndIndex);
                buffer = buffer.substring(eventEndIndex + 2);

                const lines = eventData.split('\n');
                let eventType = 'message';
                let data = {};

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.substring(7).trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            data = JSON.parse(line.substring(6).trim());
                        } catch (e) {
                            console.error('Failed to parse event data:', e, line);
                        }
                    }
                }
                
                // --- Invoke the correct handler based on the event type ---
                if (eventType === 'start' && handlers.onStart) {
                    handlers.onStart(data.message);
                } else if (eventType === 'progress' && handlers.onProgress) {
                    handlers.onProgress(data);
                } else if (eventType === 'complete' && handlers.onComplete) {
                    handlers.onComplete(data);
                }
            }
        }
    } catch (error) {
        if (handlers.onError) {
            handlers.onError(error);
        } else {
            console.error("Error during Shopify upload stream:", error);
        }
    }
}



async function downloadCSV(productIds) {
    const API_BASE_URL = "api/download"
    try{

        
        const response = await fetch(API_BASE_URL, {
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productIds),
        });

        if (!response.ok) {
            const errorData = await response.json();
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // The filename is set by the server's Content-Disposition header!
        a.download = `cj-products-${Date.now()}.csv`; // A fallback filename
        document.body.appendChild(a); // Append the link to the body

        a.click(); // Programmatically click the link to trigger the download
        
        a.remove(); // Clean up by removing the link
    }catch(error) {
        console.error("Error downloading CSV:", error);
    }
}


const WebAdminsAPI = {
    testGeminiKey,
    testShopifyAccess,
    uploadProductsToShopify,
    downloadCSV

};

export default WebAdminsAPI;
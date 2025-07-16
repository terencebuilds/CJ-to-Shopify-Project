
// $lib/server/utils.js

// @ts-nocheck
// A collection of General common utilities for the server




// Function to truncate text to a maximum length

function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}


// Function to calculate the price on markup

function priceOnMarkup(originalPrice, markupRate, markupType){
        const rate = parseFloat(markupRate) || 0;
        let newPrice;
        if (markupType === '%') {
            // Percentage markup: Original Price * (1 + Markup/100)
            newPrice = originalPrice * (1 + rate / 100);
        } else { 
            // Fixed markup in $: Original Price + Markup
            newPrice =originalPrice + rate;
        }
        // Round to 2 decimal places for currency and assign
        newPrice = Math.round(newPrice * 100) / 100;
        return newPrice;
    }


// Function to fetch data with retries (most necessary for AI calls and APIs)

async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to POST to Shopify...`);
            const response = await fetch(url, options);

            // Check for the non-JSON response issue
            const contentType = response.headers.get("content-type");
            if (!contentType || contentType.indexOf("application/json") === -1) {
                // This is our specific transient error. Throw to trigger a retry.
                throw new Error("Non-JSON response received from server.");
            }
            
            // Check for client or server errors that ARE in JSON format
            if (!response.ok) {
                const errorBody = await response.json();
                // Don't retry on 4xx errors (Bad Request, Unauthorized, etc.)
                // as they indicate a problem with our request itself.
                if (response.status >= 400 && response.status < 500) {
                    console.error("Shopify API Client Error (will not retry):", errorBody);
                    throw new Error(`Shopify API request failed with status: ${response.status}`);
                }
                // For 5xx errors, it's a server issue, so we DO want to retry.
                throw new Error(`Shopify Server Error (status ${response.status}).`);
            }
            
            // If we get here, the request was successful!
            return await response.json();

        } catch (error) {
            if (attempt === maxRetries) {
                // We've used up all our retries, throw the final error.
                console.error("All retry attempts failed.");
                throw error;
            }

            // Calculate delay with exponential backoff + a small random "jitter"
            const delay = Math.pow(2, attempt - 1) * 1000 + (Math.random() * 250);
            console.log(`Request failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
          
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// A function for patching potentially incomplete JSON. (necessary for correcting AI responses that get cut off)

function repairIncompleteJson(incompleteJson) {
    const stack = [];
    // We only care about brackets, so we can ignore characters inside strings.
    let inString = false;
    let inEscape = false;

    for (const char of incompleteJson) {
        if (inEscape) {
            // The previous character was a backslash, so this one is escaped.
            inEscape = false;
            continue;
        }

        if (char === '\\') {
            inEscape = true;
            continue;
        }

        if (char === '"') {
            // Toggle the inString flag, unless it was escaped
            if (!inEscape) {
                inString = !inString;
            }
        }

        if (inString) {
            // If we are inside a string, we ignore all other characters.
            continue;
        }

        switch (char) {
            case '{':
            case '[':
                stack.push(char);
                break;
            case '}':
                if (stack[stack.length - 1] === '{') {
                    stack.pop();
                }
                break;
            case ']':
                if (stack[stack.length - 1] === '[') {
                    stack.pop();
                }
                break;
        }
    }

    // Now, close whatever is left on the stack in reverse order.
    let repairedJson = incompleteJson;
    while (stack.length > 0) {
        const openChar = stack.pop();
        if (openChar === '{') {
            repairedJson += '}';
        } else if (openChar === '[') {
            repairedJson += ']';
        }
    }

    return repairedJson;
}



const GeneralUtil = {
    truncate,
    priceOnMarkup,
    fetchWithRetry,
    repairIncompleteJson,
};



export default GeneralUtil;


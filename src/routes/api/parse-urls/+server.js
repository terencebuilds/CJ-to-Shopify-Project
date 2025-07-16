// @ts-nocheck
// src/routes/api/parse-urls/+server.js

//Server script for scraping raw product info, and for parsing feedback when the client parses URLs

import { json } from '@sveltejs/kit';
import fetch from 'node-fetch'; 
import * as cheerio from 'cheerio';
import db from '$lib/server/db'; // Import Database instance

import { _getStructuredOptions } from '../web-admins/+server.js';



function getProductImageUrls($) {
   // Attempt to find all specific product images (which use 'data-src' for lazy loading)

   const images = $('img.pic--fwzAT')
       .map((i, el) => $(el).attr('data-src'))
       .get() // Convert the Cheerio object to a plain array
       .filter(src => src); // Filter out any empty or undefined src attributes

   // If the specific images are found, return them
   if (images.length > 0) {
       return images;
   }

   //  If no specific images were found, try to find the first <img> tag's src.

   const fallbackImage = $('img').first().attr('src');
   return fallbackImage ? [fallbackImage] : []; // Return it as an array for consistency
}


//An easier to use helper funciton for getting product images from Urls
export async function _getProductImagesFromUrl(url){

    try{
        const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const name = $('title').text().trim() || url; // Use URL as fallback
        const allImages = getProductImageUrls($);

        return allImages;

    } catch (error) {
         console.error(error);
         return [];
    }
}

/**
 * This function finds the embedded product data by
 * locating the start of the object and programmatically finding its corresponding
 * closing brace, then getting the information inside it
 *
 * @param {string} pageHtml - The full HTML content of the product page.
 * @returns {Array<object>} An array of fully-formed variant objects.
 */
function _getEmbeddedProductData(pageHtml) {
    const startMarker = 'window.productDetailData=';

    try {
        // 1. Find the starting position of our data object.
        const scriptContentIndex = pageHtml.indexOf(startMarker);
        if (scriptContentIndex === -1) {
            throw new Error(`Could not find the start marker '${startMarker}'`);
        }

        // 2. Find the first opening brace '{' after our start marker.
        const objectStartIndex = pageHtml.indexOf('{', scriptContentIndex);
        if (objectStartIndex === -1) {
            throw new Error('Could not find the opening brace of the JSON object.');
        }

        let braceCount = 1;
        let objectEndIndex = -1;

        // 3. Loop through the rest of the string to find the matching closing brace.
        for (let i = objectStartIndex + 1; i < pageHtml.length; i++) {
            const char = pageHtml[i];
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
            }

            // 4. When braceCount is 0, we've found our matching closing brace.
            if (braceCount === 0) {
                objectEndIndex = i;
                break; // Exit the loop
            }
        }

        if (objectEndIndex === -1) {
            throw new Error('Could not find the matching closing brace for the JSON object.');
        }

        // 5. Extract the pure, perfect JSON string using our calculated indices.
        const jsonString = pageHtml.substring(objectStartIndex, objectEndIndex + 1);
        
        // 6. Sanitize the string just in case (this is still good practice).
        const sanitizedString = jsonString.replace(/:undefined/g, ':null');
        
        // 7. Parse the clean string. This will work.
        const productData = JSON.parse(sanitizedString);
        
        // --- The rest is the same successful logic as before ---
        const variantsArray = productData.stanProducts;
        if (!variantsArray || !Array.isArray(variantsArray)) {
            throw new Error("'stanProducts' array not found in the parsed data.");
        }

        return variantsArray
            .filter(v => v.sellPrice) 
            .map(v => ({
                variantId: v.id,
                name: v.variantKey,
                price: parseFloat(v.sellPrice),
                sku: v.sku,
                imageUrl: v.image
            }));

    } catch (e) {
        console.error('Final parsing attempt failed:', e);
        throw new Error(`This was the final attempt. The error is: ${e.message}`);
    }
}



// Using a CJdropshipping product page, we can get all the variants of a product.  
export async function _getProductVariants(url){

    const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Connection': 'keep-alive',
        };


       const response = await fetch(url,  { headers: browserHeaders });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

        const html = await response.text();

    return _getEmbeddedProductData(html)
}


//----------------------------------------------------------------------------



export async function POST({ request }) {
    const { urls } = await request.json();

    // Set up the response headers for Server-Sent Events
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    };
        // Prevent duplcate products in the DB

        const allUrls = db.prepare('SELECT sourceUrl FROM products').all();

       //convert into a list of just strings
        const allUrlsList = allUrls.map((row) => row.sourceUrl);
        
        //console.log(allUrlsList);
        const placeholders = allUrlsList.map(() => '?').join(',');
        const products = db.prepare(`
            DELETE FROM products WHERE sourceUrl IN (${placeholders})
        `).run(...allUrlsList);

   

    // Created a new readble stream to send SSE
    return new Response(new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const sendEvent = (data, eventType = 'message') => {
                controller.enqueue(encoder.encode(`event: ${eventType}\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };



            
            sendEvent({ message: 'Parsing started', total: urls.length }, 'start');




            
            let successfulCount = 0;
            let failedCount = 0;

                   // Get table of all urls in the database
  

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];

                   
                try {
                    // Simulate processing
                    sendEvent({ url, index: i, status: 'processing' }, 'progress');

                   

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${url}: ${response.status}`);
                    }

                    const html = await response.text();
                    const $ = cheerio.load(html);
                    const name = $('title').text().trim() || url; // Use URL as fallback


                    //let variants = _getEmbeddedProductData(html);
                    //console.log("variant info",variants);

                    //let structuredOptions = _getStructuredOptions(variants, name);
                    //console.log("structured options", structuredOptions);


                    // Get first thumbnail image

                    const allImages = getProductImageUrls($);
                    const imageUrl = allImages[0] || 'https://via.placeholder.com/150'; // Fallback image if no image found

                    // Get description if available
                    const description = $('meta[name="description"]').attr('content') || 'No description available';

                    // Get price if available


                    // The price is encrypted. It's element looks like this:
                    /*
                        <span class="priceBox--jttAF notranslate">
                        <span class="symbol--T9Jzt">$</span>6.10</span>
                    */


                    const priceText = $('span.priceBox--jttAF').text().trim();
                    const priceMatch = priceText.match(/[\d,.]+/);  // Match numbers with optional commas or periods    
                    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0; // Convert to float, default to 0 if not found
                    if (isNaN(price)) {
                        throw new Error(`Invalid price found for ${url}`);
                    }


                    // Validate product name
                    if (name===url) {
                        throw new Error(`No valid product name found for ${url}`);
                    }
                
                    // Get date added (current date as fallback)
                    const dateAdded = new Date().toISOString();

                    // Add product to database
                    db.prepare('INSERT INTO products (name, sourceUrl, imageUrl, description, price, dateAdded) VALUES (?, ?, ?, ?, ?, ?)')
                        .run(name, url, imageUrl, description, price, dateAdded);

                    sendEvent({ url, index: i, name, status: 'success' }, 'progress');
                    successfulCount++;


                   

                } catch (error) {
                    console.error(`Error processing URL ${url}:`, error);
                    sendEvent({ url, index: i, error: error.message, status: 'failed' }, 'progress');
                    failedCount++;
                }

                //Test delay to simulate processing time
                await new Promise(resolve => setTimeout(resolve, 200)); 
            }

            await new Promise(resolve => setTimeout(resolve, 500)); 

            sendEvent({ message: 'Parsing complete', successfulCount, failedCount }, 'complete');
            
            // Print the database contents for debugging
            const products = db.prepare('SELECT * FROM products').all();
            //console.log('Products in database:', products);

            controller.close(); // Close the connection when done

        },
        cancel() {
            console.log('Client disconnected from SSE stream');
        }
    }), { headers });
}


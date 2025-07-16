// @ts-nocheck
//src/routes/api/web-admins


//Server script for testing connections, and sending products to Shopify


import { json } from '@sveltejs/kit';
import fetch from 'node-fetch'; 

import * as cheerio from 'cheerio';

import db from '$lib/server/db'; // Import Database instance

import { _ExpediteAskGemini, _askGemini } from '../ai-filter/+server.js';
import { _getDecryptedLlmKey, _getDecryptedShopifyApiKey } from '../configs/+server.js'; // Import the helper!
import { _getProductImagesFromUrl, _getProductVariants } from '../parse-urls/+server.js';


import papa from 'papaparse';

import GeneralUtil from '$lib/server/utils.js';
import { Repeat } from 'lucide-svelte';


const SHOPIFY_API_VERSION = "2024-10"


// IMPORTANT: This is the sosphisticated prompt template to get the AI to simplify variant / option structures & relationships (VariantMaps), and to infer product types.

const VARIANT_OPTIONS_PROMPT =
`
Analyze the following product information:
Product Title: "{productTitle}"
Variant Names: [{variantNames}]

Your task is to extract three pieces of information:
1. A single, suitable "productType" for Shopify.
2. An ordered list of the distinct option names (e.g., "Size", "Color").
3. A map of each original variant name to its corresponding option values.

Respond with ONLY a valid JSON object in the following format. Do not include any other text or explanations.

{
  "productType": "The single product type you determined",
  "options": ["Name of Option 1", "Name of Option 2", ...],
  "variantMap": {
    "Original Variant Name 1": ["Value for Option 1", "Value for Option 2", ...],
    "Original Variant Name 2": ["Value for Option 1", "Value for Option 2", ...]
  }
}

CRITICAL RULES:
- The order of values in the arrays within "variantMap" MUST match the order of names in the "options" array.
- If a value is a code (e.g., "ML251711441"), use the code directly as the value.
    - (b) Be aware that some products have messy data, and use codes as 'color' values. Acknowledge this and
    add them to the list of options regardless of how messy it is. It is better than not being able to map a product's variant.
    add a third option, for the code in these cases.
    eg: options: ['size', 'color', 'code']
    - (c) avoid extending options to include 'code' if the data isn't messy. 
    - (d) DO NOT duplicate variant map values, be mininal to the extent eleagant data allows you eg:

        BAD:
            "Black-L": ["L", "Black", ""], 
            "Black-M": ["M", "Black", ""], 
            "Brickred-L": ["L", "Brickred", ""],
            "Brickred-M": ["M", "Brickred", ""],
            ....
            "Black-L": ["L", "Black", ""], 
            "Black-M": ["M", "Black",

- If an option's value is missing for a variant, use an empty string "" as a placeholder. 
    (this outcome should be avoided, unless condition (b)

-Example
Input Variant Names: "[Small - Red, Small - Blue, Large - Red]"
Your "variantMap" would be:
"variantMap": {
  "Small - Red": ["Small", "Red"],
  "Small - Blue": ["Small", "Blue"],
  "Large - Red": ["Large", "Red"]
}
`;



//This function validates Admin connections, for either shopify or gemini

export async function PATCH({ request }) {
  
    const url = new URL(request.url);
    const requestType = url.searchParams.get('type');
    const requestBody = await request.json()

    if (requestType === "gemini") {
    // Verify Gemini API Key


        // Test a sample message
        try{
     
            const apiKey = _getDecryptedLlmKey();
            if (!apiKey) {
                return json({ message: 'LLM API key is not configured on the server.' }, { status: 500 });
            }

    
            let response = await _askGemini(apiKey, "Hello!")    
            return json({message: 'Gemini connection validated'}, { status: 200 });
        }  
        catch{
            return json({message: 'Admin connection rejected'}, {status: 500})

        }

    }  else if (requestType === "shopify") {

    // Verify Shopify Destination 
            
         
            const accessToken = await requestBody.accessToken;
            const storeUrl = await requestBody.storeUrl

            //console.log(requestBody);
            //console.log("access token:", accessToken);
    
            try {
                  // Basic Validation
                    if (!accessToken || !storeUrl) {
                        return json({ message: 'Missing Shopify access token or store URL' }, { status: 400 });
                    }

                // Construct the Shopify API endpoint URL
                const shopifyApiUrl = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/shop.json`;


                //  Make the authenticated GET request
                const response = await fetch(shopifyApiUrl, {
                    method: 'GET',
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                });

                

                

            //  Check if the request was successful

            if (!response.ok) {
                // If not okay, Shopify provides a useful error message
                const errorData = await response.json();
          
                throw new Error(`Shopify API Error: ${errorData.errors || response.statusText}`);
            }

            // If we get here, the request was successful and authenticated.
            const shopData = await response.json();
            // @ts-ignore
            console.log(`Successfully connected to shop: ${shopData.shop.name}`);

        } 
        catch (error) {
            console.error('Shopify validation failed:', error);
            return json({ message: 'Shopify connection rejected', error: error.message }, { status: 401 }); // 401 Unauthorized
        }


     return json({ message: 'Admin connection validated'}, { status: 200 });
    }
}

//This function will be for uploading products to shopify


// src/routes/api/upload-products/+server.js

export async function POST({ request }) {
    console.log("request recieved");
    try {
        const { productIds, destinationId, publishing, markup } = await request.json();

        console.log(productIds, destinationId, publishing);

        if (!productIds || !destinationId || publishing == null) {
            return json({ message: 'Invalid input' }, { status: 400 });
        }


        // Get all product data at once
        const placeholders = productIds.map(() => '?').join(',');
        const query = `SELECT * FROM products WHERE id IN (${placeholders})`;
        let products = db.prepare(query).all(...productIds);


        // sort the produucts in the order they were in the productIds request
        

        const orderMap = new Map();
        productIds.forEach((id, index) => {
            orderMap.set(id, index);
        });

        //  then sort the 'products' array based on the order stored in the map.
        products.sort((a, b) => {
            const orderA = orderMap.get(a.id); // product A's original index
            const orderB = orderMap.get(b.id); // product B'S original index

            return orderA - orderB;
        });

  
        //console.log("products:", products);
        // Get destination info


        const destInfo = db.prepare(`SELECT * FROM shopify_destinations WHERE id = ?`).get(destinationId);
        if (!destInfo) {
            return json({ message: 'Destination not found' }, { status: 404 });
        }
        const accessToken = await _getDecryptedShopifyApiKey(destinationId);

        // Get store url
        const storeUrl = destInfo.url;
        const shopifyApiUrl = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/products.json`;

        console.log(shopifyApiUrl);
        // Use a ReadableStream to send events
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                const sendEvent = (eventType, data) => {
                    const eventString = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(eventString));
                };

                sendEvent('start', { message: `Upload started for ${products.length} products.` });

                console.log("started upload");


                let successfulCount = 0;
                let failedCount = 0;

                // Process products one by one to avoid overwhelming the server, and APIs
                for (let i = 0; i < products.length; i++) {
                    const product = products[i];
                      
                    try {
                        // simulate delay to avoid overloading the LLM
                        await new Promise(resolve => setTimeout(resolve, 500)); 
                        
                   
                   //remove "cjdropshipping from the name of the product"
                    let product_name = product.name.replace("- CJdropshipping", "");
                    product_name = product_name.trim();

                    const p_url = product.sourceUrl;

                    
                
                    
                    const scrapedVariants = await _getProductVariants(p_url);
                    const structuredData = await _getStructuredOptions(scrapedVariants);
                    let geminiVariants = structuredData.variants;

                    //geminiVariants = normalizeVariantOptionOrder(structuredData.options, geminiVariants);

                  
                    const chosenStatus = publishing ? "active" : "draft";

                    const allImages = await _getProductImagesFromUrl(p_url);
                    const shopifyImages = allImages.map(url => ({ src: url }));

                     
                    let shopifyOptions = structuredData.options.map(optionName => ({ name: optionName }));

                    //console.log(allImages, "all images");
         
                     let shopifyVariants = buildShopifyVariants(scrapedVariants, structuredData);
                    shopifyVariants = await cleanVariants(shopifyVariants, shopifyOptions );
                                 

                 
                    // find the lowest priced variant of shopifyVariants
                    const lowestPriceVariant = shopifyVariants.reduce(
                            (lowest, current) => (current.price < lowest.price ? current : lowest)
                        );                        
                        let productLowestSale = GeneralUtil.priceOnMarkup(product.price, markup[0], markup[1]);

                        //console.log("lowest priced variant: ", lowestPriceVariant.price, "compared to ", productLowestSale);

                        let flatDiff = parseFloat( productLowestSale - lowestPriceVariant.price) || 1;
                        if (flatDiff < 0) {flatDiff = flatDiff * -1};

                        // Change the price of all the variants by the flat difference
                        const variantsWithUpdatedPrices = shopifyVariants.map(variant => {
                            let newPrice = (parseFloat(variant.price) + flatDiff) || 1;

                            if (newPrice < 0) {newPrice = 1};

                            //console.log(variant.images);

                            //console.log("new price: ", newPrice);
                            const priceString = (Math.round(newPrice * 100) / 100).toString() 
                            return {
                                ...variant,

                                price: (Math.round(newPrice * 100) / 100).toString() 
                            };
                        });


                        let finalShopifyVariants = forceCorrectOptionOrder(variantsWithUpdatedPrices);
                     
                        finalShopifyVariants = await cleanVariants(finalShopifyVariants, shopifyOptions );

                        const finalProduct = {
                                        product: {
                                            title: product_name,
                                            body_html: product.description,
                                            vendor: "CJ Dropshipping", //TODO: update with actual vendor name
                                            product_type: structuredData.productType,
                                            options: shopifyOptions,
                                            variants: finalShopifyVariants,
                                            images: shopifyImages,
                                            status: chosenStatus,
                                        }
                                };

                    //console.log(finalProduct);

                                    const fetchOptions = {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Shopify-Access-Token': accessToken
                            },
                            body: JSON.stringify(finalProduct),
                        };


                       // console.log("------------------\n" ) ;
                       //console.log(JSON.stringify(finalProduct, null, 2));



                        // Try uploading 3 times
                        const createdProduct = await GeneralUtil.fetchWithRetry(shopifyApiUrl, fetchOptions, 3);

                        // Successful upload

                        console.log('SUCCESS! Product created on Shopify:');
                        console.log('Product ID:', createdProduct.product.id);
                        console.log('View in Admin:', `https://${storeUrl}/admin/products/${createdProduct.product.id}`);



                        // Important streamed information to send to client for feedback
                        successfulCount++;
                        sendEvent('progress', {
                            status: 'success',
                            productName: product.name,
                            index: i,
                        });

                    } catch (error) {
                          // Important streamed information to send to client for feedback
                        failedCount++;
                        console.log(error);
                        sendEvent('progress', {
                            status: 'failed',
                            productName: product.name,
                            error: error.message,
                            index: i,
                        });
                    }
                }

                
                await new Promise(resolve => setTimeout(resolve, 500)); 
                        
                sendEvent('complete', {
                    message: 'Upload process finished.',
                    successfulCount,
                    failedCount,
                });

                controller.close(); // IMPORTANT: Close the stream
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Failed to start upload stream:', error);
        return json({ message: 'Internal Server Error' }, { status: 500 });
    }
}




// This function, serves as a primary a validator for the raw {variantMap, options, productType} output, that we prompted for

export async function _getStructuredOptions(scrapedVariants, productTitle) {
    const variantNames = scrapedVariants.map(v => v.name).join(', ');


    //console.log("product title:",productTitle)
    let prompt = VARIANT_OPTIONS_PROMPT.replace('[{variantNames}]', variantNames);
    prompt=prompt.replace('[{productTitle}]', productTitle);
    try {

        // try to ask Gemini for the structured data

        let structuredData = [];
        let geminiResponse = null;

        let maxTries = 2;
        while (maxTries > 0){
            try{
            
                geminiResponse = await _ExpediteAskGemini(prompt);
                geminiResponse = geminiResponse
                .replace(/^```json\s*/, '') // Removes ```json at the start of the string
                .replace(/```$/, '');  

                structuredData = JSON.parse(geminiResponse);
                break;
            
            } catch(error){

                  console.log("JSON.parse failed. Attempting to repair the string...");
                
                try {
                    let cleanedResponse = geminiResponse.replace(/^```json\s*/, '').replace(/```$/, '');
                    const repairedResponse = GeneralUtil.repairIncompleteJson(cleanedResponse);
                    
                    // Try to parse the *repaired* string
                    structuredData = JSON.parse(repairedResponse);
                    
                    console.log("Successfully parsed after repair!");
                    break; // Success! Exit the loop.

                } catch (repairError) {
                    console.error("Repair attempt also failed:", repairError.message);
                    // Let the loop continue to the next retry
                }
                console.log(geminiResponse);
            
            }finally{
                maxTries--;
            }
        }  

        if (!structuredData.options || !structuredData.variantMap || !Array.isArray(structuredData.options)) {
            throw new Error("Gemini response is missing required 'options' or 'variantMap' keys.");
        }
        
       
               return structuredData;

    } catch (error) {
        console.error("Failed to get or parse structured options from Gemini:", error);
        return null; // Return null on failure
    }
}



function normalizeVariantOptionOrder(options, messyVariants) {
    if (!options || options.length === 0 || !messyVariants) {
        return [];
    }

    // Step 1: Create a map to quickly look up which option a value belongs to.

    // e.g., { "S": "Size", "M": "Size", "Pink": "Color", "Blue": "Color" }
    const valueToOptionMap = new Map();
    for (const variant of messyVariants) {
        for (let i = 0; i < variant.optionValues.length; i++) {
            const value = variant.optionValues[i];
            if (value && !valueToOptionMap.has(value)) {
                // Heuristic: Assume the LLM gets the order right for at least ONE variant.
                // We map the value to the option name at that index.
                if (options[i]) {
                   valueToOptionMap.set(value, options[i]);
                }
            }
        }
    }

    // Step 2: Build the clean, ordered list of variants.
    const normalizedVariants = messyVariants.map(variant => {
        const newOptionValues = Array(options.length).fill(""); // Create a correctly-sized empty array

        for (const value of variant.optionValues) {
            if (!value) continue; // Skip empty values

            const correctOptionName = valueToOptionMap.get(value);
            const correctIndex = options.indexOf(correctOptionName);

            if (correctIndex !== -1) {
                newOptionValues[correctIndex] = value;
            }
        }

        return {
            ...variant,
            optionValues: newOptionValues,
        };
    });

    return normalizedVariants;
}

// This function is a final defense against improper variant structuring.
// Situations where variant values get mixed up: "{color: large, size: red}"

function forceCorrectOptionOrder(variants) {
                    // Define what we know a "Size" looks like.
                    const knownSizes = new Set([
                        'XS', 'S', 'M', 'L', 'XL', 
                        '2XL', '3XL', '4XL', '5XL'
                    ]);

                    return variants.map(variant => {
                        const opt1 = variant.option1;
                        const opt2 = variant.option2;

                        // The "isSwapped" condition:
                        // If option1 is NOT a size, but option2 IS a size, they are flipped.
                        if (!knownSizes.has(opt1) && knownSizes.has(opt2)) {
                            console.log(`Fixing swapped variant: ${opt1}/${opt2} -> ${opt2}/${opt1}`);
                            // Return a new object with the values swapped back.
                            return { ...variant, option1: opt2, option2: opt1 };
                        }

                        // Otherwise, the variant is fine as-is.
                        return variant;
                    });
                }


// This function ensures that every variant has a valid, unique value, and that only variants that the LLM map successfully mapped are included in the final list.
                
function buildShopifyVariants(scrapedVariants, geminiData) {
    const { options, variantMap } = geminiData;

    return scrapedVariants.map(scrapedVariant => {
        // Find the corresponding option values from the LLM's map
        const optionValues = variantMap[scrapedVariant.name];

        if (!optionValues) {
            return null; // Skip if the LLM somehow forgot to map a variant
        }

        const newVariant = {
            price: scrapedVariant.price,
            sku: scrapedVariant.sku,
            inventory_management: 'shopify',
            inventory_quantity: 100, // This is a placeholder, TODO// Allow custom inventory values
        };
        

        const finalOptionValues = [ ...optionValues ]; // Create a mutable copy

        // Find the value of the "Code" option, if it exists. Best placeholder 
        const codeIndex = options.indexOf('Code');
        const codeValue = (codeIndex !== -1) ? finalOptionValues[codeIndex] : null;

        // Iterate through the option values and replace any empty strings.
        for (let i = 0; i < finalOptionValues.length; i++) {
            if (finalOptionValues[i] === "") {
                // If a value is empty, use the unique "Code" value as a robust placeholder if that exists, other wise use the variant's own name as a last resort.
                finalOptionValues[i] = codeValue || scrapedVariant.name; 
            }
        }
        
        // Dynamically assign option1, option2, etc., using the cleaned values.
        options.forEach((optionName, index) => {
            newVariant[`option${index + 1}`] = finalOptionValues[index];
        });

        return newVariant;

    }).filter(v => v !== null); // Filter out any variants that couldn't be mapped.
}




// This function will remove any duplicate variants from the structured variant list passed by 'buildShopifyVariants'

async function cleanVariants(variants, productOptions, placeholder = 'N/A') {
    const numOptions = productOptions.length;
    if (numOptions === 0) return variants; // No options to normalize

    const uniqueVariants = [];
    const seenOptions = new Set();

    for (const variant of variants) {
        // 1. Normalize: Create an array of the variant's option values
        const currentOptions = [
            variant.option1,
            variant.option2,
            variant.option3
        ];
        
        const normalizedOptions = [];
        for (let i = 0; i < numOptions; i++) {
            // If the option value is null or undefined, use the placeholder
            const value = currentOptions[i] == null ? placeholder : currentOptions[i];
            normalizedOptions.push(value);
        }

        // 2. Deduplicate: Create a unique key from the *normalized* options
        const optionKey = normalizedOptions.join('|');

        if (!seenOptions.has(optionKey)) {
            // We haven't seen this combination before.
            seenOptions.add(optionKey);

            // Create a new variant object with the normalized options
            const newVariant = { ...variant };
            newVariant.option1 = normalizedOptions[0];
            if (numOptions > 1) {
                newVariant.option2 = normalizedOptions[1];
            }
            if (numOptions > 2) {
                newVariant.option3 = normalizedOptions[2];
            }
            
            uniqueVariants.push(newVariant);
        }
    }

    return uniqueVariants;
}
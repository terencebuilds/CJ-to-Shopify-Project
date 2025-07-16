// @ts-nocheck
//src/routes/api/ai-filter/+server.js

// Server script to faciliate Gemini API calls (originally just for filtering but also expanded to be used for Shopify Uploads)


import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { _getDecryptedLlmKey } from '../configs/+server.js'; // Import the helper!


// Basic Gemini call here

async function _askGemini(apiKey, prompt) {
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3n-e4b-it:generateContent?key=${apiKey}`;


    const generationConfig = {
    "maxOutputTokens": 8192,    
    "temperature": 0.5,
    };


    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: generationConfig,

        })
    });


    
    //console.log(response);

    if (!response.ok) {
        const error = await response.json();
        console.error("Gemini API Error:", error);
        throw new Error('Failed to communicate with the LLM service.');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}


export async function _ExpediteAskGemini(prompt){
       const apiKey = _getDecryptedLlmKey();
            if (!apiKey) {
                return json({ message: 'LLM API key is not configured on the server.' }, { status: 500 });
            }
        return await _askGemini(apiKey, prompt);
}


export async function POST({ request }) {

    // Get the data from the client
    const { criteria, productIds, maxProducts } = await request.json();
    if (!criteria || !Array.isArray(productIds) || productIds.length === 0) {
        return json({ message: 'Criteria and a non-empty array of productIds are required.' }, { status: 400 });
    }

    // Get the decrypted LLM key from our existing helper function
    
    const apiKey = _getDecryptedLlmKey();

    console.log("Got decrypted LLM key");
    if (!apiKey) {
        return json({ message: 'LLM API key is not configured on the server.' }, { status: 500 });
    }

    // Fetch the relevant product data from the server database
    const placeholders = productIds.map(() => '?').join(',');
    const products = db.prepare(`
        SELECT id, name, description, price FROM products WHERE id IN (${placeholders})
    `).all(...productIds);


    let promptConstraint = ""; 
    if (maxProducts && Number(maxProducts) > 0) {
        promptConstraint = `
        ADDITIONAL CONSTRAINT: Your final list of IDs must not contain more than ${maxProducts} items. If you find more products that match the criteria, you MUST select only the top ${maxProducts} best matches based on the user's criteria. Rank them and return only the best ones.`;
    }

    // Prompt Engineering //

      const prompt = `
        You are an expert product catalog filtering assistant.
        I will provide you with a list of products in JSON format and a user's filtering criteria.
        Your task is to identify which products from the list match the user's criteria.

        USER CRITERIA: "${criteria}"
        ${promptConstraint}  // <-- Dynamically insert the constraint here!

        PRODUCT LIST:
        ${JSON.stringify(products, null, 2)}

        Analyze all rules and the product list.
        Your response MUST be a valid JSON array of numbers, containing only the 'id's of the products that match the criteria.
        Don't rely solely on key-words. Use context and inference to determine whether a criteria likely fites.
        Do not include any other text, explanations, or markdown formatting like \`\`\`json.
        If no products match, return an empty array: [].
    `;

    try {
        // Call the LLM and get the raw response
        const llmResponseText = await _askGemini(apiKey, prompt);

        //  Validate and Parse the AI's response (in the case the AI failed to follow the instructions)

        let selectedIds = [];
        try {
            // Clean up Gemini's habitual pretty formatting and parse it into a JSON array
            const cleanedResponse = llmResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedResponse = JSON.parse(cleanedResponse);

            if (Array.isArray(parsedResponse) && parsedResponse.every(item => typeof item === 'number')) {
                // Filter the parsed IDs to ensure the AI didn't "hallucinate" an ID that wasn't in the original list
                const originalIdSet = new Set(productIds);
                selectedIds = parsedResponse.filter(id => originalIdSet.has(id));
            } else {
                throw new Error("AI response was not an array of numbers.");
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", llmResponseText, parseError);
            return json({ message: 'The AI returned an invalid response. Please try again.' }, { status: 502 }); // 502 Bad Gateway
        }
        
    //Update the products in the DB, Updating their isAISelected tag
       //db.prepare(query).run(params);

        try {
            // Create a transaction function.
            const updateAISelections = db.transaction((ids) => {
                // Step 1: Reset all previous selections (commented out)
               // db.prepare('UPDATE products SET isAISelected = 0').run();

                // Step 2: Set the new selections, if any.
                if (ids && ids.length > 0) {
                    const placeholders = ids.map(() => '?').join(',');
                    const query = `UPDATE products SET isAISelected = 1 WHERE id IN (${placeholders})`;
                    db.prepare(query).run(...ids);
                }
            });

    // Execute the transaction.
    updateAISelections(selectedIds);
    console.log("Successfully updated AI selections in a transaction.");

} catch (dbError) {
    console.error("Database transaction failed for AI selections:", dbError);
}


        // Send the clean, validated list of IDs back to the client
        return json(selectedIds);

    } catch (error) {
        return json({ message: error.message }, { status: 500 });
    }
}


export async function DELETE() {
    console.log("Received request to clear all AI selections.");

    try {
        // A simple update query to set the flag to 0 (or false) for all products.
        const stmt = db.prepare('UPDATE products SET isAISelected = 0');
        const info = stmt.run();

        return json({
            message: 'All AI selections have been cleared.',
            clearedCount: info.changes // `changes` tells you how many rows were affected.
        });

    } catch (dbError) {
        console.error("Database error while clearing AI selections:", dbError);
        return json(
            { message: 'Failed to clear AI selections due to a server error.' },
            { status: 500 }
        );
    }
}


export {_askGemini}
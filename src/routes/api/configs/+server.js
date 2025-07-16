// @ts-nocheck
// src/routes/api/configs/+server.js

//Server scrript to facilitate changes to settings, and API key handling (integrations)


import { json } from '@sveltejs/kit';
import fetch from 'node-fetch'; 
import * as cheerio from 'cheerio';
import db from '$lib/server/db'; // Import Database instance




function encryptKey(key) {
    // Perfom simple encryption on the key string, ceasar cipher
        let encryptedKey = key.split('').map((char) => {
        let ascii = char.charCodeAt(0);
        let encryptedAscii = ascii + 1; // Simple encryption by adding 1 to the ASCII value
        return String.fromCharCode(encryptedAscii);
    }).join(''); // Join the encrypted characters back into a string
    return encryptedKey;
}

function decryptKey(key) {
    // Perfom simple decryption on the key string, deceaser cipher
    let decryptedKey = key.split('').map((char) => {
        let ascii = char.charCodeAt(0);
        let decryptedAscii = ascii - 1; // Simple decryption by subtracting 1 from the ASCII
        return String.fromCharCode(decryptedAscii);
        }).join(''); // Join the decrypted characters back into a string
    return decryptedKey
}


export async function GET({ url }) { // Destructuring {} as request is not used
  
   const requestType = url.searchParams.get('type');

    // 2. Check if the request is for the LLM key status.
    if (requestType === 'llm_key_status') {
        //  Handle the LLM key status check
        try {
            const keyRecord = db.prepare('SELECT id FROM llm_keys WHERE id = 1').get();

            // Return a simple JSON object indicating if a key exists.
            //  `!!` operator converts the result object / undefined to a boolean.
            return json({ hasKey: !!keyRecord });
        } catch (error) {
            console.error('Error fetching LLM key status:', error);
            return json({ message: 'Failed to fetch LLM key status.', error: error.message }, { status: 500 });
        }
    }
    
    else {
  
  
        try {
            // Prepare and execute the query to get all destinations.
    
            const stmt = db.prepare('SELECT id, nickname, url FROM shopify_destinations');
            const destinationsFromDb = stmt.all();

            // Transform the data for the client.
            //  Send a placeholder empty string for API key to avoid sending the encrypted API key to the client
            const clientSafeDestinations = destinationsFromDb.map(dest => ({
                id: dest.id,
                nickname: dest.nickname,
                url: dest.url,
                apiKey: '' // Placeholder for the UI input field.
            }));

            return json(clientSafeDestinations);

        } catch (error) {
            console.error('Error in GET /api/configs:', error);
            return json({ message: 'Failed to fetch Shopify destinations.', error: error.message }, { status: 500 });
        }
    }
}

// This API will be used to add shopify destinations to the DB, or change existing ones
export async function POST({ request }) {
    try {
        const destinationsData = await request.json();

        if (!Array.isArray(destinationsData)) {
            return json({ message: 'Request body must be an array of destinations.' }, { status: 400 });
        }

        const newDestinations = destinationsData.filter(d => d.id === null);
        const existingDestinations = destinationsData.filter(d => d.id !== null);

        // Add new destinations
        for (const dest of newDestinations) {
            if (!dest.nickname || !dest.url || !dest.apiKey) {
                return json({ message: 'Missing fields for new destination (nickname, url, apiKey).' }, { status: 400 });
            }
            const encryptedKey = encryptKey(dest.apiKey);
            db.prepare('INSERT INTO shopify_destinations (nickname, url, encryptedKey) VALUES (?, ?, ?)')
              .run(dest.nickname, dest.url, encryptedKey);
        }

        // Update existing destinations
        for (const dest of existingDestinations) {
            if (dest.id === undefined || !dest.nickname || !dest.url) { // apiKey might be optional for updates if not changing
                return json({ message: 'Missing fields for existing destination (id, nickname, url).' }, { status: 400 });
            }
            let query = 'UPDATE shopify_destinations SET nickname=?, url=?';
            const params = [dest.nickname, dest.url];

            if (dest.apiKey !== undefined && dest.apiKey.length > 0 ) { // Only update key if provided
                const encryptedKey = encryptKey(dest.apiKey);
                query += ', encryptedKey=?';
                params.push(encryptedKey);

               // console.log("updated api key")
            }
            query += ' WHERE id=?';
            params.push(dest.id);

            const info = db.prepare(query).run(...params);
            if (info.changes === 0) {
                console.warn(`Attempted to update destination with id ${dest.id} but it was not found.`);
               //Let it slide, no error 404
            }
        }

        return json({ message: 'Shopify destinations updated successfully.' });

    } catch (error) {
        console.error('Error in POST /api/configs:', error);
        return json({ message: 'Failed to update Shopify destinations.', error: error.message }, { status: 500 });
    }
}

// This API will be used to delete shopify destinations from the DB
export async function DELETE({ request }) {
    try {
        const idsToDelete = await request.json();

        if (!Array.isArray(idsToDelete) || idsToDelete.length === 0 || !idsToDelete.every(id => typeof id === 'number')) {
            return json(
                { message: 'Request body must be a non-empty array of numeric destination IDs.' },
                { status: 400 }
            );
        }

        const placeholders = idsToDelete.map(() => '?').join(',');
        const stmt = db.prepare(`DELETE FROM shopify_destinations WHERE id IN (${placeholders})`);
        const info = stmt.run(...idsToDelete);

        return json({
            message: 'Shopify destinations deleted successfully.',
            deletedCount: info.changes
        });

    } catch (error) {
        console.error('Error in DELETE /api/configs:', error);
        return json(
            { message: 'Failed to delete Shopify destinations.', error: error.message },
            { status: 500 }
        );
    }
}



export async function PUT({ request }) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return json({ message: 'API key is required and must be a non-empty string.' }, { status: 400 });
        }

        const encryptedKey = encryptKey(apiKey);

        // Check if an entry for the LLM key exists (assuming ID 1 for a single global key)
        const existingKey = db.prepare('SELECT id FROM llm_keys WHERE id = 1').get();

        if (existingKey) {
            // Update existing key
            db.prepare('UPDATE llm_keys SET encryptedKey=? WHERE id=1').run(encryptedKey);
            console.log("Successfully updated LLM API key.");
        } else {
            // Insert new key
            db.prepare('INSERT INTO llm_keys (id, encryptedKey) VALUES (1, ?)').run(encryptedKey);
            console.log("Successfully inserted LLM API key.");
        }

        return json({ message: 'LLM API key updated successfully.' });

    } catch (error) {
        console.error('Error in PUT /api/configs (LLM key):', error);
        return json({ message: 'Failed to update LLM API key.', error: error.message }, { status: 500 });
    }
}

// GET handler for retrieving LLM API key status (not the key itself)
export async function _GET_LLM_KEY() { // Renamed to avoid conflict with main GET
    try {
        const keyStatus = db.prepare('SELECT id FROM llm_keys WHERE id = 1').get();
        
        // Return whether a key exists
        return json({ hasKey: !!keyStatus });
    } catch (error) {
        console.error('Error fetching LLM key status:', error);
        return json({ message: 'Failed to fetch LLM key status.', error: error.message }, { status: 500 });
    }
}

// Helper to get decrypted LLM key for server-side use (e.g., in `parse-urls` endpoint)
export function _getDecryptedLlmKey() {
    try {
        const encryptedKeyEntry = db.prepare('SELECT encryptedKey FROM llm_keys WHERE id = 1').get();
        if (encryptedKeyEntry && encryptedKeyEntry.encryptedKey) {
            return decryptKey(encryptedKeyEntry.encryptedKey);
        }
    } catch (error) {
        console.error('Error retrieving or decrypting LLM key from DB:', error);
    }
    return null;
}


// Helper to get decrypted Shopify API key for server-side use (e.g., in `parse-urls` endpoint)
export function _getDecryptedShopifyApiKey(shopifyDestId) {
    try {
        const encryptedKeyEntry = db.prepare('SELECT encryptedKey FROM shopify_destinations WHERE id = ?').get(shopifyDestId);
        if (encryptedKeyEntry && encryptedKeyEntry.encryptedKey) {
            return decryptKey(encryptedKeyEntry.encryptedKey);
        }
    } catch (error) {
        console.error('Error retrieving or decrypting LLM key from DB:', error);
    }
    return null;
}
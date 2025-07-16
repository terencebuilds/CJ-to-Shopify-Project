// src/lib/utils/configs.js

const API_CONFIGS_BASE_URL = '/api/configs';
const API_AI_FILTER_BASE_URL = '/api/ai-filter'; 


/**
 * Saves (adds new or updates existing) Shopify destinations.
 * @param {Array<Object>} destinations - Array of destination objects.
 *   Each object: { id: number|null, nickname: string, url: string, apiKey: string }
 *   `id` is null for new destinations, existing for updates.
 */
async function saveShopifyDestinations(destinations) {
    try {
        const response = await fetch(API_CONFIGS_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(destinations),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to save Shopify destinations: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error saving Shopify destinations:', error);
        throw error; // Re-throw to be handled by UI
    }
}

/**
 * Fetches all Shopify destinations.
 * Returns id, nickname, and url (apiKey is kept server-side).
 */
async function fetchShopifyDestinations() {
    try {
        const response = await fetch(API_CONFIGS_BASE_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch: ${response.statusText}`);
        }
        return await response.json(); // This returns a promise that resolves to an array of destinations
    } catch (error) {
        console.error('Error fetching Shopify destinations:', error);
        throw error;
    }
}
/**
 * Deletes Shopify destinations by their IDs.
 * @param {Array<number>} ids - Array of destination IDs to delete.
 */
async function deleteShopifyDestinations(ids) {
    if (!ids || ids.length === 0) {
        return { message: "No destinations to delete." };
    }
    try {
        const response = await fetch(API_CONFIGS_BASE_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ids),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete Shopify destinations: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error deleting Shopify destinations:', error);
        throw error;
    }
}

/**
 * Saves the LLM API key.
 * @param {string} apiKey - The LLM API key.
 */
async function saveLlmApiKey(apiKey) {
    try {
        const response = await fetch(API_CONFIGS_BASE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to save LLM API key: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error saving LLM API key:', error);
        throw error;
    }
}

/**
 * Checks if an LLM API key is already stored.
 * Returns { hasKey: boolean }.
 */
async function checkLlmApiKeyStatus() {
    try {
        const response = await fetch(`${API_CONFIGS_BASE_URL}?type=llm_key_status`); // Adding a query param
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to check LLM API key status: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error checking LLM API key status:', error);
        throw error;
    }
}

/**
 * Filters products with AI.
 * @param {string} criteria - The criteria for AI filtering.
 * @param {string[]} productIds - The IDs of products to filter.
 * @param {number} [maxProducts] - The maximum number of products to filter. Defaults
 */

export async function filterProductsWithAI(criteria, productIds, maxProducts) {
    try {
        const response = await fetch(API_AI_FILTER_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Add maxProducts to the body object. If it's undefined, JSON.stringify will omit it.
            body: JSON.stringify({ criteria, productIds, maxProducts })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'AI filtering failed on the server.');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in filterProductsWithAI:', error);
        return null;
    }
}

export async function clearAISelections() {
    try {
        const response = await fetch(API_AI_FILTER_BASE_URL, {
            method: 'DELETE' 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to clear AI selections.');
        }

        return await response.json(); // Returns the success message from the server
    } catch (error) {
        console.error('Error in clearAISelections:', error);
        throw error;
    }
}





const ConfigsAPI = {
    saveShopifyDestinations,
    fetchShopifyDestinations,
    deleteShopifyDestinations,
    saveLlmApiKey,
    checkLlmApiKeyStatus,
    filterProductsWithAI,
    clearAISelections,

};

export default ConfigsAPI;
// @ts-nocheck
// $lib/utils/products.js

// This is a helper utility for product requests to the server

const API_BASE_URL = '/api/product-manager';

async function fetchProducts(filter = 'all') {
    let apiUrl = API_BASE_URL;
    let products = []

    // Add the query parameter if the filter is not 'all'
    if (filter !== 'all') {
        apiUrl += `?mode=${filter}`;
    }
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        products = await response.json();
    } catch (error) {
        console.error(error);
        products = []; // Clear products on error
    }

    return products
}


async function multipleProductSelection(selectionList, selectedVal) {
       //console.log(JSON.stringify({ id, isSelected, isAISelected }))
    const response = await fetch(API_BASE_URL+"?type=multi_select", {
      method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({selected: selectedVal, IdList: selectionList}),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update product: ${response.statusText}`);
    }

    return response.json();
}


async function updateProductSelection({ id, isSelected, isAISelected }) {
 
    //console.log(JSON.stringify({ id, isSelected, isAISelected }))
    const response = await fetch(API_BASE_URL, {
  
      method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isSelected, isAISelected }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update product: ${response.statusText}`);
    }

    return response.json();
}


async function deleteProducts(productIds) {
    if (!productIds || productIds.length === 0) {
        // Don't make a network request if there's nothing to delete
        return Promise.resolve({ message: "No products to delete." });
    }

    const response = await fetch('/api/product-manager', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productIds), // Send the array of IDs
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete products');
    }

    return response.json();
}

const ProductAPI = {
    fetchProducts,
    updateProductSelection,
    multipleProductSelection,
    deleteProducts,

};






export default ProductAPI;
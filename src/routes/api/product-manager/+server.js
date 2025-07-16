// @ts-nocheck
// src/routes/api/product-manager/+server.js
// This API will facilitate database requests from the client to the server. This concerns manual product deletion and selection

import { error, json } from '@sveltejs/kit';
import fetch from 'node-fetch';
import db from '$lib/server/db'; // Import Database instance


export async function GET({ url }) {

    const filterMode = url.searchParams.get('mode');

    let products;
    let baseQuery = 'SELECT * FROM products';
    const params = [];

    // switch case for different filter modes
    switch (filterMode) {
        case 'selected':
            // Filter for products where isSelected is true (1)
            baseQuery += ' WHERE isSelected = ?';
            params.push(1);
            break;

        case 'ai_selected':
            // Filter for products where isAISelected is true (1)
            baseQuery += ' WHERE isAISelected = ?';
            params.push(1);
            break;
        
        // "all" is the default case if mode is unknown or invalid

        case 'all':
        default:
            // No WHERE clause needed, the query remains the same.
            break;
    }

    baseQuery += ' ORDER BY dateAdded DESC';

    try {
        // Prepare the final query.
        const stmt = db.prepare(baseQuery);
        products = stmt.all(...params); // Use spread operator for the params array

        return json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
    }
}


/**
 * PATCH handler for updating a single product's selection status or multiple (depending on search params)
 * Expects a JSON body with { id, isSelected, isAISelected }.
 * 
 * Batch select vs single select
 */
export async function PATCH({ request }) {

    const url = new URL(request.url);

    const filterMode = url.searchParams.get('type');



   if (filterMode == "multi_select") { //Batch select
 
        const requestBody = await request.json();
        
        try {
            //create an sql query that changes the selection value

                
                const idsToDelete = await requestBody.IdList;
                

                // Create placeholders for each id in the array
                const placeholders = idsToDelete.map(() => '?').join(',');

                // Deselection or selection?
                const valText = await requestBody.selected ? 'true':'false'

                // Update the selection
                const stmt = db.prepare(
                    `UPDATE products SET isSelected = ${valText} WHERE id IN (${placeholders})`
                );

                stmt.run(idsToDelete);
                    

        return json({ message: 'Product selection updated successfully' }, {status:200});

        }catch(e){
            console.log(e);
            
             return json({ message: `Products unable to update` }, { status: 404 });

        }


    }else { // Single Select
        try {
            const { id, isSelected, isAISelected } = await request.json();

            // Basic validation
            if (id === undefined || isSelected === undefined || isAISelected === undefined) {
                return json({ message: 'Missing required fields: id, isSelected, isAISelected' }, { status: 400 });
            }

            // The database stores booleans as integers (0 for false, 1 for true)
            const selectedValue = isSelected ? 1 : 0;
            const aiSelectedValue = isAISelected ? 1 : 0;

            const stmt = db.prepare(
                'UPDATE products SET isSelected = ?, isAISelected = ? WHERE id = ?'
            );
            const info = stmt.run(selectedValue, aiSelectedValue, id);

            if (info.changes === 0) {
                // This means no row was found with the given ID
                return json({ message: `Product with id ${id} not found.` }, { status: 404 });
            }

        return json({ message: 'Product updated successfully', id: id });

    } catch (error) {
        console.error('Error updating product:', error);
        return json({ message: 'Failed to update product', error: error.message }, { status: 500 });
    }
}
}



export async function DELETE({ request }) {
    try {
        const idsToDelete = await request.json();

        // Input validation
        if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
            return json(
                { message: 'Request body must be a non-empty array of product IDs.' },
                { status: 400 } // Bad request
            );
        }

        // Create a string of question marks, one for each ID. e.g., "?,?,?"
        const placeholders = idsToDelete.map(() => '?').join(',');

        const stmt = db.prepare(
            `DELETE FROM products WHERE id IN (${placeholders})`
        );

        const info = stmt.run(...idsToDelete);


        return json({
            message: 'Products deleted successfully.',
            deletedCount: info.changes
        });

    } catch (error) {
        console.error('Error deleting product(s):', error);

        return json(
            { message: 'Failed to delete products', error: error.message },
            { status: 500 }
        );
    }
}

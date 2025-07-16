// @ts-nocheck
//src/routes/api/download/+server.js

// Server script just for downloading CSV (for now)

import { json } from '@sveltejs/kit';
import db from '$lib/server/db'; // Import Database instance

import { _ExpediteAskGemini, _askGemini } from '../ai-filter/+server.js';
import { _getDecryptedLlmKey, _getDecryptedShopifyApiKey } from '../configs/+server.js'; 
import { _getProductImagesFromUrl, _getProductVariants } from '../parse-urls/+server.js';

import papa from 'papaparse'; // Import PapaParse for CSV parsing


// New function which returns a csv of products based on their ids

export async function POST({ request }) {

    const requestBody = await request.json();

    try{
         const productIds = requestBody
         console.log(productIds);

         // simple validation
         if(!Array.isArray(productIds)){
             throw new Error('Invalid request body. Please provide an array of product IDs.');
         }

         let productList = []

        const placeholders = productIds.map(() => '?').join(',');
        const query = `SELECT name, description, price, sourceUrl, dateAdded FROM products WHERE id IN (${placeholders})`;

        productList = await  db.prepare(query).all(...productIds);

         if (productList.length <= 0) {
            throw new Error("No product found with the provided IDs.");
         }


         console.log(productList);

          // convert into csv file
   
         const csvContent = papa.unparse(productList);

         const headers = { 
            "Content-Type": "text/csv"
            , "Content-Disposition": `attachment; filename="cj-products-${Date.now()}.csv"`
          };

        return new Response(csvContent, {"headers":  headers} );

    }catch(error){
        console.error('Failed to parse products and return csv file:', error);
   
        return json({ error: 'Failed to parse products and return csv file.' }, { status: 500 });
    }
    
}
<script>
// @ts-nocheck
// src/lib/views/products/+page.svelte
// This view is responsible for selecting products from the database and filtering using AI or manually.


//Import necessary components and icons
import DropDownContainer from "./drop-down-container.svelte";
import AIFilteringWidget from "./ai-filtering-widget.svelte";
import ProductCard from "./product-card.svelte";


//Import client utilities
import ProductsAPI from "$lib/utils/products.js";
import ConfigsAPI from "$lib/utils/configs.js";
import WebAdminsAPI from "$lib/utils/web-admins.js";



import {Download, Trash, ListCheckIcon} from "lucide-svelte";


let sampleImageURL = "https://oss-cf.cjdropshipping.com/product/2025/06/23/06/6a55e88f-fbc5-48db-9475-7d2d8242167c.jpg"

let testProducts = [
    {id: 1, name: "Product A", desc: "This is product A" , price: 10.99, thumbnail: sampleImageURL, dateAdded: "2023-10-01"},
    {id: 2, name: "Product B", desc: "This is product B" , price: 12.99, thumbnail: sampleImageURL, dateAdded: "2023-10-02"},
    {id: 3, name: "Product C", desc: "This is product C" , price: 8.99, thumbnail: sampleImageURL, dateAdded: "2023-10-03"}
]

let filterTranslation = {
    'All Products': 'all',
    'Selected' : 'selected',
    'AI Selected': 'ai_selected'
}

// Local variables for filter and sort options

let selectedFilter = "All Products"; // Default filter option  
let selectedSort = "Newest First"; // Default sort option

let selectedProducts = []; // Array to hold selected products
let filteredProducts = []; // Array to hold filtered products based on selected filter and sort options
let selectedFilteredProducts = []; // Array to hold products that have been selected and are the ones displayed currently
let sortedAndFilteredProducts = [];


let AIFilterSuccess = null; // Variable to hold AI filter success message
let AIFilterError = null; // Variable to hold AI filter error message
let AIFilterResultShow = false; // Variable to hold AI filter result show status

let maxProductsInput = ""; // Variable to hold the input for maximum products to be filtered by AI

let selectingAll = false; // Variable to hold the status of selecting all products



async function refreshProducts(){
    const rememberedFilter = selectedFilter
    selectedFilter = null;
    setTimeout(()=>  {selectedFilter = rememberedFilter;  filteredProducts = filteredProducts;}, 100);
}

async function ai_filter(event){


    AIFilterSuccess = "filtering...";
    AIFilterError = null;

    try{

           const apiKeyValid = await WebAdminsAPI.testGeminiKey();
        if (apiKeyValid == false){
            console.log("api key valid",apiKeyValid);
            AIFilterError = "Invalid API key (configure in settings)";
            AIFilterSuccess = null;
          }


        if (AIFilterResultShow){return
            console.log('Event overflow');
        }

     

        AIFilterResultShow = true;


        const returned = event.detail;

        const criteria = returned.criteria;
        let max_products = returned.max_products;

    


        if (isNaN(max_products)|| max_products <= 0){

            // only return error if something was typed in
                if (maxProductsInput !== ''){
                    AIFilterSuccess = null;
                    AIFilterError = "Please enter a valid number for maximum products";
                    return;
                }
                max_products = null;
                        
        }

        console.log("Max products ", max_products);

        console.log("Filtering criteria", criteria);

        if (!criteria || !criteria.length || criteria.length === 0){
            AIFilterSuccess = null;
            AIFilterError = "Please enter criteria";
            return;
        }


        // get the list of ids from filtered products
        const ids = filteredProducts.map(product => product.id);
        let filterSuccess = await ConfigsAPI.filterProductsWithAI(criteria, ids, max_products)
        if (filterSuccess !== null) {
            let productAmount = filterSuccess.length;

            AIFilterSuccess = productAmount + " product" + (productAmount === 1 ? " was" : "s were") + " selected";
        }
        
        console.log("Filtered result" ,filterSuccess)
        // Refresh the filtered products
        await refreshProducts();
    }finally{
        setTimeout(() => {
            AIFilterResultShow = false;
        }, 250);
        
    }
}

async function ai_clear(event){
    //Clear all AI selections
    let deleteSuccess = await ConfigsAPI.clearAISelections()


    if (deleteSuccess !== null) {
        // Refresh the filtered products
        await refreshProducts();
    }
    
}

async function select_all(){


    selectingAll = !selectingAll;


    // Select all products from filtered products
    let ids = [];
    for (let i = 0; i < filteredProducts.length; i++) {
        ids.push(filteredProducts[i].id);
    }

    let result = ProductsAPI.multipleProductSelection(ids, selectingAll);
    if (result !== null) {
        // Refresh the filtered products

        await refreshProducts();
    }
}


function product_select(event) {
    const returned = event.detail;
    const pID = returned.id;
    const isSelected = returned.isSelected;
    const isAISelected = returned.isAISelected || false;

    // Find the product in our source-of-truth array
    const productIndex = filteredProducts.findIndex(p => p.id === pID);

    if (productIndex !== -1) {
        // Update its 'isSelected' property
        filteredProducts[productIndex].isSelected = isSelected;
        // Trigger Svelte's reactivity by reassigning the array
        filteredProducts = filteredProducts; 
    }
   
    // Send the update to the backend API
    ProductsAPI.updateProductSelection({ id: pID, isSelected: isSelected, isAISelected: isAISelected });
}


function product_deleting(event){

    const pID = event.detail;

    // Clear all mentions of this ID from all local tables
    
    filteredProducts = filteredProducts.filter(product => product.id !== pID);
    selectedProducts = selectedProducts.filter(id => id !== pID);
    
}

async function selection_deleting() {
    // Get an array of just the IDs from the selected product objects.
    
    const idsToDelete = selectedFilteredProducts.map(product => product.id);

    if (idsToDelete.length === 0) {
        console.log("No products selected to delete.");
        return; // Exit if there's nothing to do
    }

    console.log("Batch deleting product IDs:", idsToDelete);

    // API call
    await ProductsAPI.deleteProducts(idsToDelete);

    // Update the local arrays
    const idsToDeleteSet = new Set(idsToDelete);
    filteredProducts = filteredProducts.filter(product => !idsToDeleteSet.has(product.id));
    selectedProducts = selectedProducts.filter(id => !idsToDeleteSet.has(id));
}



// Reactivity

// Continuously update the intersection between Filtered products and Selected products
$: selectedFilteredProducts = filteredProducts.filter(product => 
        selectedProducts.includes(product.id)
    );


$: {
    // An Immediately Invoked Async Function Expression (IIFE)
    (async () => {
        if (selectedFilter !== null) {
            const passFilter = filterTranslation[selectedFilter];
            
            // Show a loading state if you want
            filteredProducts = []; // Optional: clear old results while loading

            console.log(`Fetching products with filter: ${passFilter}`);
            
            // We 'await' the promise to resolve, and then assign the result.
            filteredProducts = await ProductsAPI.fetchProducts(passFilter);
        }
    })(); // The () at the end executes the function immediately
}

// This reactive block will handle sorting
$: {
    if (filteredProducts) {
        // Create a copy to avoid mutating the original array
        let productsToSort = [...filteredProducts];

        switch (selectedSort) {
            case "Price: Low to High":
                productsToSort.sort((a, b) => a.price - b.price);
                break;
            case "Price: High to Low":
                productsToSort.sort((a, b) => b.price - a.price);
                break;
            case "Name (A-Z)":
                // localeCompare is a robust way to sort strings
                productsToSort.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "Newest First":
            default:
                // Assuming dateAdded is a string in a format that can be compared chronologically (like YYYY-MM-DD)
                productsToSort.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
                break;
        }
        sortedAndFilteredProducts = productsToSort;
    }
}




// Helper function to download selected products as CSV
async function DownloadCSV() {
    
    if (!selectedFilteredProducts || selectedFilteredProducts.length <= 0){
        return;
    };

    // get list of just productIds
    const passedData = selectedFilteredProducts.map(product => (product.id));
    const downloadResult = await WebAdminsAPI.downloadCSV(passedData);
}



$: {
    if (filteredProducts) {
        selectedProducts = filteredProducts
            .filter(product => product.isSelected)
            .map(product => product.id);
    } else {
        selectedProducts = [];
    }
}



</script>


<div class="options vertical">



    <!-- AI Filtering Widget -->
    <AIFilteringWidget on:ai_clear = {ai_clear}  on:ai_filter = {ai_filter} 
    bind:AIFilterSuccess = {AIFilterSuccess} 
    bind:AIFilterError = {AIFilterError} 
    bind:AIFilterResultShow = {AIFilterResultShow} 
    bind:maxProductsInput = {maxProductsInput}
    />


    <!-- Overview Bar-->
    <div class = "mini-container dynamic fill no-y airtight line"
    style="flex: 0">
    
        
        <div class = "options dynamic fill"
        style= "justify-content: flex-start; overflow: hidden;">
        <!-- Filter By Drop Down-->
        <DropDownContainer label="Filter By:" options={["All Products", "Selected", "AI Selected"]} bind:selectedOption={selectedFilter} />

        <!-- Sort By Drop Down-->
        <DropDownContainer label="Sort By:" options={["Newest First", "Price: Low to High", "Price: High to Low", "Name (A-Z)"]} bind:selectedOption={selectedSort} />
        </div>

        
        <div class="options vertical airtight"
        style="padding-top: 14px; gap:0px; text-align: center; padding-right: 10px;
           justify-content: flex-end;
">
               <!-- Download CSV-->
            <button class="btn compact" on:click={DownloadCSV} style="white-space: nowrap;">
                <Download color="white" />
                Downlod CSV
            </button>

                 <div style="font-size:0.8rem; opacity:0.5; "> 
           {selectedFilteredProducts.length} Products Selected 
           </div>

        </div>

    </div>


    <!-- Free floating options that appear when you select products -->

    {#if selectedFilteredProducts.length > 0}
      <div class="selection-helper">

        <button class="btn transparent compact" style="--base-txt: color-mix(in srgb, var(--danger-color) 95%, var(--text-color));" on:click={selection_deleting} >
            <Trash size={20}/>
            Delete Selected
        </button>

 
      </div>

    {/if}
   

 

    <!-- batch select -->

    <div class = "mini-h dynamic partial-opacity"
    style="width: 100%; justify-content:space-between">
         Select Products:

       <button class="btn transparent compact thin-outline line"
       style="max-width: 120px;" 
       on:click={select_all}>
            <ListCheckIcon size=50 />

            {#if selectingAll}
                Deselect All
            {:else}
                Select All
            {/if}

   
       </button>
    </div>
   

        <!-- Product Selection Section -->

        <!-- Product Selection Section -->
    <div class="product-selection">
        {#if sortedAndFilteredProducts.length === 0}
            <p style="opacity: 0.5;">No products available. Please add products to the database through URL import.</p>
        {:else}
            <!-- Change this line to use the new sorted array -->
            {#each sortedAndFilteredProducts as product (product.id)}
                <ProductCard 
                    product={product} 
                    selected={product.isSelected}
                    AIselected={product.isAISelected}
                    bind:selectedProducts
                    on:product_select={product_select} 
                    on:product_deleting={product_deleting}
                />
            {/each}
        {/if}
    </div>




</div>




<style lang="scss">

.selection-helper {
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 10px;
    border-radius: 10px;

    background-color:  color-mix(in srgb, var(--background-color) 95%, transparent) ;
    box-shadow: 0 4px 8px  color-mix(in srgb, var(--text-color) 30%, transparent);
    z-index: 5;
}

.product-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(325px, 300px));

    max-width: 1500px;
    align-items: center;
    padding: 10px;
    gap: 25px 0px;

}

</style>
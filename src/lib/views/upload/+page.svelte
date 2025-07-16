<script>
// @ts-nocheck
//  $lib/upload/+page.svelte
// This view is responsible for uploading products to shopify


    import { onMount } from 'svelte';
  
    import ConfigsAPI from '$lib/utils/configs.js';
    import ProductsAPI from '$lib/utils/products.js';

    // import ProductsAPI from '$lib/utils/products.js'; 

    import { UploadCloud, Check, X, Pause, Play, Tag, Percent, Info, LoaderCircle } from 'lucide-svelte';

    import ProductCard from './product-card.svelte';
    import GeneralUtil from '$lib/utils/general';
    import WebAdminsAPI from '$lib/utils/web-admins';

    // --- Configuration State ---
    let destinations = [];
    let selectedDestinationId = null;
    let publishStatus = 'DRAFT'; // DRAFT or ACTIVE
    let markupRate = 150;
    let markupType = '%'; // '%' or '$'

    // --- Upload Process State ---
    let productsToUpload = [];
    let isUploading = false;
    let isPaused = false;
    let uploadProgress = 0;
    let successCount = 0;
    let errorCount = 0;

    let recentlyUploadedIds = new Set()

    let abortController = new AbortController();

    

    let productSelectionStatus = "AI"
    let statusMessage = "Ready to upload.";

    // Load initial data needed for the screen
    onMount(async () => {
        // Fetch the user's Shopify destinations for the dropdown
        destinations = await ConfigsAPI.fetchShopifyDestinations();
        if (destinations.length > 0) {
            selectedDestinationId = destinations[0].id;
        }

    }




);


    function resetQueue() {
        recentlyUploadedIds.clear();
        updateUploadQueue(productSelectionStatus); // Re-run the queue logic
    }
    async function startUpload() {
        if (!selectedDestinationId) {
            alert("Please select a destination store.");
            return;
        }

        await updateUploadQueue(productSelectionStatus);

        //get the list of just the product ids to upload
        let productIds = productsToUpload.map(p => p.id);


        abortController = new AbortController();

        let currentIndex = 0;

        
        isUploading = true;
        isPaused = false;
        successCount = 0;
        errorCount = 0;

        function newUIStatus(){
         
            //console.log(productsToUpload);
            let product = productsToUpload[currentIndex];
        
            if (product == null) return;

            product.status = 'uploading';
            productsToUpload = productsToUpload; // Trigger Svelte reactivity
            statusMessage = `Uploading ${currentIndex + 1} of ${productsToUpload.length}: ${GeneralUtil.truncate(product.name, 40) }`;
      
        
        }

        const bufferEventHandlers = {
            onStart: function(){
                console.log("new ui status")
                newUIStatus()
            },
            onProgress: function(event){
                console.log(event);


                const product = productsToUpload[currentIndex];



                console.log("product uploaded", product)

                if (event.status == "success"){successCount++;  product.status = 'success';}
                if (event.status == "failed"){errorCount++;  product.status = 'error';}

               
                recentlyUploadedIds.add(product.id);

                productsToUpload = productsToUpload;

                currentIndex++;
                // show the uploading ui for the next product
                newUIStatus()
                uploadProgress = ((currentIndex + 1) / productsToUpload.length) * 100;
            },

            onComplete: function(event){
                console.log("onComplete", event);

              
            },

            onError: function(event){

            }
        }


        console.log("bufferEventHandlers", bufferEventHandlers);
    

       let uploadResult = await WebAdminsAPI.uploadProductsToShopify(productIds, selectedDestinationId, false, [markupRate, markupType],  bufferEventHandlers, abortController.signal );
        isUploading = false;
        statusMessage = `Upload complete. ${successCount} successful, ${errorCount} failed.`;
    }

    function cancelUpload() {
        if (confirm("Are you sure you want to cancel the upload?")) {
            isUploading = false;
            isPaused = false;
            statusMessage = "Upload cancelled by user.";

            abortController.abort();

            // Optionally reset statuses
            productsToUpload.forEach(p => { if(p.status === 'uploading') p.status = 'pending' });
            productsToUpload = productsToUpload;
        }
    }


    async function updateUploadQueue(status) {
    if (isUploading) return; // Don't change the queue during an upload

    statusMessage = `Loading ${status} products...`;
    productsToUpload = []; // Clear the queue while loading

    const allProducts = await ProductsAPI.fetchProducts('all');
    if (!allProducts) {
        statusMessage = "Could not load products.";
        return;
    }

    let filtered = [];
    switch (status) {
        case 'AI':
            filtered = allProducts.filter(p => p.isAISelected);
            break;
        case 'MANUAL':
            filtered = allProducts.filter(p => p.isSelected);
            break;
        case 'BOTH':
            filtered = allProducts.filter(p => p.isSelected || p.isAISelected);
            break;
    }


    // Map and filter in one step for efficiency
    productsToUpload = filtered
        // Exclude products that have been successfully uploaded in this session.
        .filter(p => !recentlyUploadedIds.has(p.id)) 
        .map(p => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            price: p.price,
            originalPrice: p.price,
            url: p.url,
            status: 'pending',
            error: null
        }));

    
    //console.log(productsToUpload);
    productsToUpload = productsToUpload; // Final assignment to trigger UI updates
    statusMessage = `Ready to upload ${productsToUpload.length} product(s).`;
}





$: {
    if (productsToUpload && productsToUpload.length > 0) {
        productsToUpload.forEach(product => {
            product.price =  GeneralUtil.priceOnMarkup(product.originalPrice, markupRate, markupType);
        });



        // Trigger Svelte's reactivity for the UI to update
        productsToUpload = productsToUpload;
    }
}


$: updateUploadQueue(productSelectionStatus);
</script>

<div class="options vertical ">
    <!-- Widget Header -->
    <div class="options vertical airtight">
        <div class="mini-h"
        style="justify-content: left; margin: auto; width: 100%">
            Upload to Shopify
            <UploadCloud size={30}/>
        </div>
        <hr class="partial-opacity" style="width: 100%;" />
    </div>

    <!-- Configuration Area -->

    <div class = "mini-container dynamic">
        <div class="options fill airtight">
            <div class="config-item">
                <label for="destination">Destination</label>
                <select id="destination" bind:value={selectedDestinationId} disabled={isUploading}>
                    {#if destinations.length === 0}
                        <option disabled selected>Go to Settings to add a destination</option>
                    {/if}
                    {#each destinations as dest}
                        <option value={dest.id}>{dest.nickname}</option>
                    {/each}
                </select>
            </div>

            <div class="config-item">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label>Product Status</label>
                <div class="radio-group">
                    <button class:active={publishStatus === 'DRAFT'} on:click={() => publishStatus = 'DRAFT'} disabled={isUploading}>Draft</button>
                    <button class:active={publishStatus === 'ACTIVE'} on:click={() => publishStatus = 'ACTIVE'} disabled={isUploading}>Published</button>
                </div>
            </div>

            <div class="config-item">
                <label for="markup">Price Markup</label>
                <div class="input-group">
                    <input type="number" id="markup" bind:value={markupRate} min="0" disabled={isUploading} style="width: 30px;"/>
                    <select bind:value={markupType} disabled={isUploading}>
                        <option value="%">%</option>
                        <option value="$">$</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class = "mini-container dynamic">

        <p class = "partial-opacity" style="margin-top: 10px;">
              Product Selection
        </p>
          
      

         <div class="radio-group"  style="margin-top: 10px;">
                    <button class:active={productSelectionStatus === 'AI'} on:click={() => productSelectionStatus = 'AI'} disabled={isUploading}>AI Selected</button>
                    <button class:active={productSelectionStatus === 'MANUAL'} on:click={() => productSelectionStatus = 'MANUAL'} disabled={isUploading}>Manually Selected</button>
                     <button class:active={productSelectionStatus === 'BOTH'} on:click={() => productSelectionStatus = 'BOTH'} disabled={isUploading}>Both</button>
                </div>


    </div>


    <!-- Upload Queue -->

    <div class = "mini-container dynamic">
        <div class = "mini-h dynamic line fill compact no-y">
            Upload Queue ({productsToUpload.length} products)
            <button class="btn transparent thin-outline compact partial-opacity" 
            style="max-width: 20%;"
            
            on:click={resetQueue}>
            Refresh Queue
            </button>
        </div>
        <div class="upload-queue-container">
            {#each productsToUpload as product (product.id)}
                <ProductCard product={product}/>
            {/each}
        </div>

 


    <!-- Widget Footer / Controls -->
    <div class="options fill airtight">
        <div class="options vertical compact" style="flex:1; margin-top: var(--large-gap)">

            <progress style="min-width: 100%" value={uploadProgress} max="100"></progress>
            <span>{statusMessage}</span>
        </div>
        <div class="options airtight">
            {#if !isUploading}
                 <button class="btn" on:click={startUpload}>Start Upload</button>
            {:else}
                <button class="btn transparent thin-outline" on:click={cancelUpload}>
                    <X /> Cancel
                </button>
            {/if}
        </div>
    </div>
       </div>
</div>


<style lang="scss">

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slide-out {
        to { transform: translateX(-150%); opacity: 0; }
    }


    .config-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: auto;
        max-width: 100%;
        min-width: 30%;
        label { opacity: 0.5}
        select, input { padding: 8px; border-radius: 5px; border: 1px solid #ccc; font-size: 1rem; }
    }

    .radio-group {
        display: flex;
        button {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid color-mix(in srgb, var(--text-color) 40%, transparent );
            background-color: color-mix(in srgb, var(--background-color) 90%, white);
            cursor: pointer;
            &:first-child { border-radius: 5px 0 0 5px; }
            &:last-child { border-radius: 0 5px 5px 0; border-left: none; }
            &.active { background-color: var(--primary-color); color: white; border-color: #007bff; }
            color: var(--text-color);
        }
        color: var(--text-color);

    }

        select{
          background-color: color-mix(in srgb, var(--background-color) 90%, white);
        color: var(--text-color);
    }
    
    .input-group {
        display: flex;
        
        input { flex-grow: 1; border-top-right-radius: 0; border-bottom-right-radius: 0;
                background-color: color-mix(in srgb, var(--background-color) 90%, white);
                 border: 1px solid color-mix(in srgb, var(--text-color) 40%, transparent );
        
        
        }
        select { border-left: none; border-top-left-radius: 0; border-bottom-left-radius: 0; 
          background-color: color-mix(in srgb, var(--background-color) 90%, white);
           border: 1px solid color-mix(in srgb, var(--text-color) 40%, transparent );
        
        }
    }

       .upload-queue-container {
        display: flex;
        gap: 15px;
        padding: 10px;
        overflow-x: auto;
        background-color: transparent ;
        border-radius: 8px;
        min-height: 140px;
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
    }

    

 

</style>
<script>
// @ts-nocheck


// This is a Svelte component for a product card

import { createEventDispatcher } from "svelte";
    

import { Trash, Eye } from 'lucide-svelte';
import GeneralUtil from "$lib/utils/general.js"
import ProductsAPI from "$lib/utils/products.js"



// These will be the cards that will be displayed in the product view
export let product = {
    name: "Product Name",
    description: "Product Description",
    price: 0,
    imageUrl: "https://via.placeholder.com/150"
};

export let AISelected = false; // This will be used to show the AI selected tag
export let selected = false; // This will be used to show the selected tag

let isDeleting = false;
const dispatch = createEventDispatcher();

// Function to toggle the selected state of the product card
function toggleSelected() {
    if (isDeleting) return; // Don't allow selecting while deleting
    selected = !selected;

    AISelected = product.isAISelected ? true : false;


    dispatch('product_select', {isSelected: selected, id: product.id, isAISelected: AISelected} );
}   

// Function to delete the current product from the db
async function deleting(event) {
    // Stop the click from bubbling up and triggering toggleSelected
    event.stopPropagation(); 
    
    isDeleting = true;

    try {
        // Call the API to delete from the database
        await ProductsAPI.deleteProducts([product.id]);
        
        // IMPORTANT: Only dispatch the event AFTER the API call is successful
        dispatch('product_deleting', product.id);

        // The component will now be unmounted by the parent, so we don't need to do more here.

    } catch (error) {
        console.error("Failed to delete product:", error);
        // Optionally show an error to the user (e.g., a toast notification)
        alert(`Could not delete ${product.name}. Please try again.`);
    } finally {
        // This will run even if the component is about to be destroyed
        isDeleting = false; 
    }
}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="product-card"
    on:click={toggleSelected}
    class:selected={selected}
>


    <div class="image-place">
        <img src={product.imageUrl} alt={product.name} class="product-image" />
    </div>


    <!-- Ai selected tag -->
    {#if product.isAISelected}
    <div class="ai-selected-tag">
        <span>AI Selected</span>
    </div>
    {/if}
    

    <p class="product-price">${product.price.toFixed(2)}</p>

    <div class="product-details">
        <h4 class="product-name">{GeneralUtil.truncate(product.name, 74) }</h4>
        <p class="product-description">{GeneralUtil.truncate(product.description, 80) }</p>
    </div>


    <div class="product-actions">

        <button class="btn transparent" 
        style="--base-txt: color-mix(in srgb, var(--danger-color) 90%, var(--text-color))"
        on:click={deleting}>
            <Trash size={20}           
         />
        </button>

        <a 
            href={product.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn compact transparent" 
            on:click|stopPropagation
             style=" text-decoration: none; --base-txt: color-mix(in srgb, var(--link-color) 90%, var(--text-color))"
     
         >
        <Eye size={20} />
        View Details
        </a>
     
    </div>  

</div>


<style lang="scss">



.ai-selected-tag {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(17, 192, 113, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    z-index: 1;
}

.product-name{

    font-size: 0.9rem;

    margin: 0px;
    margin-top: 4px;
    max-height: 28%;

    overflow: hidden;
}

.mini-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 5px 10px;
    background-color:rgba(240, 240, 240, 0);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #333;

    &:hover {
        background-color: #e0e0e0;
    }

    svg {
        margin-right: 5px;
    }
}

.product-actions {

    display: flex;
    position: absolute;
    bottom: 0%;
    left:2%;
    max-height: 10%;
    justify-content: space-between;
    margin-top: 10px;

}

.product-description {
  
    font-size: 0.8rem;
    opacity: 0.5;

    margin: 20px 0;
    max-height: 20%;
}
.product-price {
  
    font-size: 0.7rem;
    font-weight: bold;
    opacity: 0.4;

 
    position: absolute;
    z-index: 10;
    bottom:-4%;
    right: 2%;
}

.image-place {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 8px;
    background-color: #f0f0f0;
    position: absolute
}

.product-card {
    border: 1px solid color-mix(in srgb, var(--background-color) 20%, transparent);
    position: relative;
    border-radius: 8px;
    padding: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background-color: color-mix(in srgb, var(--background-color) 40%, transparent);
    box-shadow: 0 2px 4px color-mix(in srgb, var(--text-color) 20%, transparent);
    width: 300px;
    max-height: 400px;
    height: auto;
    aspect-ratio: 1 / 1; 

    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    &:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 8px color-mix(in srgb, var(--text-color) 15%, transparent);
    }
    &.selected {
        border: 1px solid var(--primary-color);
        box-shadow: 0 4px 8px var(--primary-color);
    }

  

}
.product-image {
    width: 100%;
    height: auto;
    border-radius: 8px;
}
.product-details {
    position: absolute;
    bottom: 0%;
    width: 100%;
    height: 40%;

 
   background-color: color-mix(in srgb, var(--background-color) 99%, transparent);
    margin-top: 0px;
    backdrop-filter: blur(5px);

}

</style>
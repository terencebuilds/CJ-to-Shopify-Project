<script>
// @ts-nocheck

//$lib/utils/upload/product-card.svelte
// This is a svelte component that renders a product card, for the upload page


//Import components, modules
import { LoaderCircle, Check, X, Import } from 'lucide-svelte';

import GeneralUtil from '$lib/utils/general.js';


// The relevant product info
export let product = {}



</script>


<!-- Element -->
<div class="queue-item" class:success={product.status === 'success'} class:error={product.status === 'error'} class:uploading={product.status === 'uploading'}>
    <img src={product.imageUrl} alt={product.name} />
  
    <!-- Dark contrast gradient to make the label 'pop'-->
    <div class = "pop-gradient">

    </div>
  
    <div class = "item-h">
        {GeneralUtil.truncate(product.name, 20)}
    </div>

    <div class = "price">
        ${product.price.toFixed(2)}
    </div>




    <!-- Overlays -->
    {#if product.status === 'uploading'}
        <div class="item-overlay">
        
            <div class = "spinner">
            <LoaderCircle color="white" />
            </div>
        
        </div>
    {:else if product.status === 'success'}
        <div class="item-overlay success-bg"><Check color="white" /></div>
    {:else if product.status === 'error'}
        <div class="item-overlay error-bg" title={product.error}><X color="white" /></div>
    {/if}
</div>





<style lang="scss" >


  .item-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        backdrop-filter: blur(2px);
        &.success-bg { background-color:  color-mix(in srgb, var(--success-color) 80%, transparent) ; }
        &.error-bg { background-color: color-mix(in srgb, var(--danger-color) 80%, transparent); cursor: help; }
    }

    .price{
        position: absolute;
        right: 2%;
        font-size: 0.9rem;
        font-weight: bold;
        text-shadow: 0px 3px 4px black;
        color: white;
    }

    .pop-gradient{
        position: absolute;
        background-image: linear-gradient(to top,black,transparent);
       
        width: 100%;
        height: 100%;
    }

    .queue-item {
        flex-shrink: 0;
        width: 150px;
        height: 150px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 0px;
        border: 2px solid transparent;
        border-radius: px;
        background-color: transparent;
        box-shadow: 0 1px 6px var(--text-color) ;
        position: relative;
        transition: all 0.3s ease;
        overflow: hidden;

        border-radius: 10px;
        aspect-ratio: 1 / 1;

        
        &.uploading { border-color: var(--primary-color); }
        &.error { border-color:var(--danger-color) ; }
        &.success {
            border-color: --var(--success-color) ;
            animation: slide-out 0.5s 1s ease-in-out forwards;
        }

        img { width: 100%; height: 100%; object-fit: cover; border-radius:10px;
        overflow: hidden; }

        .item-h { 
            position: absolute;
            font-size: rem; 
            margin: 0;
            top: 65%;
            line-height: 1.2; 
            text-shadow: 0px 2px 4px black;
            
            height: 50px;
       
            display: flex;
            justify-content: center; 
            align-items: center; 
            color: white;
            
        }
    }


    
</style>
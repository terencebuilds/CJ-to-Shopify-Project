<script>
//src/routes/+page.svelte
// The main page being rendered aside from the topbar


import Selector from "$lib/components/selector.svelte";

/* Views */

import UrlImportView from "$lib/views/url/+page.svelte";
import UploadView from "$lib/views/upload/+page.svelte";
import ProductsView from "$lib/views/products/+page.svelte";

/* Page variables */

let activeView = 'url';


</script>


<main> 

        <div class = "content">

            <Selector 
            options = {[
                {id :'url', label : 'URL Import'},
                {id :'products', label : 'Products'},
                {id :'upload', label : 'Upload'}
            ]} 
    
            bind:activeSelection = {activeView}
            on:select = {
                    (event) =>
                        activeView = event.detail
            }
            />


            <div class = "view">

                {#if activeView==="url"}
                    <UrlImportView/>
                {:else if activeView==="products"}
                    <ProductsView />
                {:else if activeView==="upload"}
                  <UploadView />
                {/if}


            </div>




        </div>

 

</main>



<style lang="scss">

.content{
    flex: auto;
    display: flex;
    padding-top: 40px;
    margin: 0px 35px;

    flex-direction: column;
    justify-self: center;
    justify-content: space-evenly;
    max-width: 100%;

}

.view{
    margin-top: 40px;
    background-color: rgba(0,0,0, 0.05);    
    border-radius: 40px;

}


</style>
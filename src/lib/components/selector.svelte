<script>

// @ts-nocheck
    
/* A modular selection utility 
(Multiple clickable labels within a container)
*/

import { createEventDispatcher } from "svelte";


export  let activeSelection = '';

/* array of options and labels */
export let options = [];
    
const dispatch = createEventDispatcher();

    
</script>


<div class = "selector">
    
   
   {#each options as option (option.id)}

   <!-- The option.id is the payload, which will become the event.detail  -->
    <button 
        class = "btn transparent"
        class:active = {activeSelection === option.id} 
        on:click={() => dispatch('select', option.id)} >

        {option.label}

    </button>


   {/each}
</div>



<style lang="scss">
</style>



<script>
// @ts-nocheck
//Simple API connection status indicator for the navbar


import { LLM_CONNECTED } from "$lib/stores/statusStore.js";


let llm_connected = null;

LLM_CONNECTED.subscribe((value) => {
    llm_connected = value;
});


</script>



<div class="llm-connected mini-h partial-opacity" style="gap: var(--medium-gap)">
            Status:
    
    {#if llm_connected}
    <p style = "color: var(--success-color)">
        Connected
    </p>
    {:else if llm_connected == false }
        <p style = "color: var(--danger-color)">
            Not Connected
        </p>
    {:else}
        <p>
            Pending...
        </p>

    {/if}
</div>
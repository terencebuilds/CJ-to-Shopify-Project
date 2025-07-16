<script>
    // @ts-nocheck
    // This component is used to filter AI-generated content based on criteria.
    // This is used in the Products view, to intelligently filter / query specific types of products.

    import {createEventDispatcher} from "svelte";


    import { Sparkle, Sparkles, Trash } from "lucide-svelte";
    import { onMount } from "svelte";

    const dispatch = createEventDispatcher();

    let inputProducts = ""; // Input for AI filter criteria
    let maxProducts = ""; // Input for maximum products to select

    export let AIFilterSuccess = null; // Variable to hold AI filter success message
    export let AIFilterError = null; // Variable to hold AI filter error message
    export const AIFilterResultShow = null; //used for external reference for the AI filter result show component

    let CriteriaInput = ""; // Variable to hold AI filter criteria
    export let maxProductsInput = ""; // Variable to hold maximum products input


    // Function to handle the AI Filter event fire
    // The view products.svelte will handle the rest of the process
    async function AIFIlter(){
        let Criteria = CriteriaInput;

        // convert maxProductsInput to an integer value
        let maxProducts = parseInt(maxProductsInput);

        let event_obj = {
            criteria: Criteria,
            max_products: maxProducts

        }

      console.log("sending ai filter request to parent")
        dispatch("ai_filter", event_obj);

    }

    async function ClearAISelections(){
        console.log("sending ai selection removal request to parent")
        dispatch("ai_clear");
    }




</script>


<div class="mini-container dynamic airtight"
    style="border-color: color-mix(in srgb, var(--ai-brand) 50%, transparent); padding: 0px var(--medium-gap);
    max-width: 700px; justify-self: center; margin:auto">
    <!-- compound header -->
    <div class ="mini-h dynamic airtight fill">
        <div style="display: flex; align-items: center; gap: 10px; margin: 10px; ">
            <Sparkle color="rgb(17, 192, 113)" size="20" />
            <b>AI Product Filtering</b>
        </div>
       
        <div class="powered-by">
            <b> Powered By Gemini </b>
        </div>
    </div>

     <!-- input fields -->
    <div class = "options fill airtight">
        <input type="text" bind:value={CriteriaInput} placeholder="Enter AI Filter Criteria" class="form-control line" />
        <input type="text" bind:value={maxProductsInput} placeholder="Maximum Products to Select" class="form-control line" style="min-width: 0px;" />
    </div>

     <!-- Action -->
    <div class="options no-y airtight">
       
       <div class = "options spread-x airtight">
            <button class="btn transparent thin-outline" on:click={ClearAISelections}>
                <Trash size="20" />
                Clear Selections
            </button>


            <button class="btn"
            style="--base-bg: var(--ai-brand)"
            on:click={AIFIlter}>
                <Sparkles size="20" />
                Run Filter
            </button>
        </div>

        <span class = "small partial-opacity y-centered fade-in">
            <!-- Feedback message after running the filter -->
            {#if AIFilterSuccess}
                <span class="fade-in" style="color: var(--text-color);">{AIFilterSuccess}</span>
            {:else if AIFilterError}
                <span class="fade-in" style="color: var(--danger-color);">{AIFilterError}</span>
            {:else}
                <span class="fade-in" style="color: gray;">No filter applied yet.</span>
            {/if}
        </span>

    </div>
</div>


<style lang="scss">


.powered-by {
    font-size: 0.7rem;
    font-style: italic;
    color: rgba(255,255,255,1);
    background-color: var(--ai-brand);  // Light background for the powered by text
    border-radius: 20px;
    padding: 5px 10px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
}



</style>
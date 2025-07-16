<script>
    // This is the component for the Gemini API key
    // This component will be located in the settings page

    import {Check, X, KeySquare} from "lucide-svelte";
   

    let API_Link = "https://aistudio.google.com/u/2/apikey";
    export let API_Connected = false;
    export let GeminiAPIMessage = "";

    export let USER_INPUT = "";

    let GeminiPlaceholderText = "Enter Gemini API Key";
    $: GeminiPlaceholderText = API_Connected ? "API key is configured" : "Enter Gemini API Key";

</script>


<div class = "api-container">
        <div class="mini-h" style="gap: 10px; margin: 0px; padding: 0px;">
            <h4> Gemini API Key </h4>
            <KeySquare size={24} />
        </div>

    <div class = "api-input" style="margin-top: 0px; ">
        
        <input type="password" placeholder={GeminiPlaceholderText} 
            bind:value={USER_INPUT}
        class="form-control line" />


        <div class = "small-info">
            Your Gemini API Key is required for AI product filtering. Get your key from <a class = "inline-link" href={API_Link}> Google AI Studio </a>.
        </div>

        {#if GeminiAPIMessage !== ""}
                    <div 
                class="api-feedback"
                class:success={API_Connected}
                class:error={!API_Connected}
            >
                {#if API_Connected}
                    <Check color = "var(--result-color)" />
                    <span>{GeminiAPIMessage}</span>
                {:else}
                    <X color = "var(--result-color)"/>
                    <span>{GeminiAPIMessage}</span>
                {/if}
            </div>

        {/if}
    </div>
</div>

<style lang="scss">


 







</style>

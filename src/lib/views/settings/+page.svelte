<script>
// @ts-nocheck

    // src/lib/views/settings/+page.svelte
    //This is the entire settings screen/widget component

    import {createEventDispatcher, onMount, onDestroy} from 'svelte';

    import ConfigsAPI from "$lib/utils/configs.js";
    import WebAdminsAPI from "$lib/utils/web-admins.js"

    import { X, Settings, Save, LoaderCircle} from "lucide-svelte";
    import ShopifyDestinations from "./shopify-destinations.svelte";
    import GeminiAPIKeyUI from "./gemini-api-key.svelte";


    import { LLM_CONNECTED } from "$lib/stores/statusStore.js";

    
    let GeminiAPIKeyInput = "";
    let API_Connected = false;
    let GeminiAPIMessage = "";
    


    let savingSettings = false;

    
    let localStores = [];
    let cleanStores = [];


    let screenOpen = true;
    let dispatch = createEventDispatcher();


    //console.log("Fetched stores", ConfigsAPI.fetchShopifyDestinations());


    async function loadData() {
        console.log("Attempting to fetch stores...");
        try {
            // await the promise
            const storesArray = await ConfigsAPI.fetchShopifyDestinations() || [];

            if (storesArray.length > 0) {
                console.log("First store nickname:", storesArray[0].nickname);
            }

            const llmKeyStatus = await ConfigsAPI.checkLlmApiKeyStatus()

            const apiKeyValid = await WebAdminsAPI.testGeminiKey()
            API_Connected = (llmKeyStatus.hasKey && apiKeyValid) || false

            LLM_CONNECTED.set(API_Connected);



            console.log("api key valid", apiKeyValid);
            let problemMessage = llmKeyStatus.hasKey ? "Invalid API Key" : "Enter a Gemini API key"
            GeminiAPIMessage =  API_Connected ? "API key is configured and validated" : problemMessage;
            
            console.log("LLM key status:", llmKeyStatus)

            localStores = storesArray;
            cleanStores = localStores;

        } catch (error) {
            console.error("Could not load the stores due to an error:", error);
        }
    }

    

    async function saveSettings(){
        savingSettings = true;
        // Testing delay


        console.log("Current API Key inputs:",GeminiAPIKeyInput);

        if ( GeminiAPIKeyInput !== null && GeminiAPIKeyInput !== ""  && GeminiAPIKeyInput.trim() !== ""){
            await ConfigsAPI.saveLlmApiKey(GeminiAPIKeyInput);
        }

        // Find all local stores that have a "new": true property
        let localStoresWithNewProperty = localStores.filter(store => store.new);
        // Find local stores without the new property
        let localStoresWithoutNewProperty = localStores.filter(store => !store.new);

        // Update the id of these new stores to null, and remove the new property
        localStoresWithNewProperty.forEach(store => {
            store.id = null; // Set the id to null
            delete store.new; // Remove the new property
        });
        
        console.log(localStoresWithNewProperty)

        //join the arrays
        let allStores = [...localStoresWithoutNewProperty, ...localStoresWithNewProperty];


        // Save stores
        let results =  await ConfigsAPI.saveShopifyDestinations(allStores);


        // Delete stores on the db level
        // check to see if there are stores in cleanStores that are missing in allStores
        let missingStores = cleanStores.filter(store => !allStores.some(allStore => allStore.id === store.id));

        // Get a table of the ids of the missing stores
        let missingStoreIds = missingStores.map(store => store.id);

        // Delete these stores from the database itself
       
        if (missingStoreIds.length > 0){
            console.log("stores to delete", missingStoreIds);
            await ConfigsAPI.deleteShopifyDestinations(missingStoreIds)
        }

        // Load and process the stores again
         loadData();

         console.log(results)

        setTimeout(() => {
           savingSettings = false;
        }, 1000);
    }

    function close(){
     savingSettings = true;
     screenOpen = false;
          setTimeout(() => {
          
            //Signal to the parent, that settings is being closed
             dispatch("close");
              savingSettings = false;
        }, 500);
      
    }


    // Life cycle functions
    onMount(()=>{
        loadData();
        //to disable scrolling on the settings screen
        document.body.classList.add("no-scroll")
        //to scroll to the top
        window.scrollTo(0, 0);
    })

    onDestroy(()=>{
        document.body.classList.remove("no-scroll")
    })


</script>



<div class = "settings-screen" 
class:appear = {screenOpen}
class:disappear = {!screenOpen} >
    <div class = "widget">

        <!-- Widget Header -->
        <div class="widget-header">
            <div class = "mini-h">
                <h3> Settings </h3>
                <Settings size={30}/>
            </div>
            <hr style = "border: 1px solid; width: 100%; margin: 10px 0; opacity: 0.2 "/>
        </div>

        <!-- Scrollable Content Area -->
        <div class="scrollable" class:disabled = {savingSettings}>

            <!-- API Key -->
            <GeminiAPIKeyUI bind:USER_INPUT = {GeminiAPIKeyInput}
             bind:API_Connected = {API_Connected} 
             bind:GeminiAPIMessage={GeminiAPIMessage}/>
    
            <!-- Destinations -->
            <ShopifyDestinations bind:stores = {localStores} />
        </div>

        <!-- WIDGET FOOTER  -->
        <div class="widget-footer">
            <button class="btn" style="white-space: nowrap;" on:click={saveSettings}>
                {#if savingSettings}
                    <div class="spinner">
                        <LoaderCircle/>
                    </div>
                 Saving Settings
                {:else}
                    <Save/>
                    Save Settings
                {/if}
            </button>


            <button class="btn transparent thin-outline line"
            on:click={close}>
                <X/>
                Close Settings
            </button>


        



        </div>
    </div>
</div>



<style lang="scss">

    :global(body.no-scroll) {
        overflow: hidden;

    }
  
    .widget-header {
        flex-shrink: 0; 
    }

    .scrollable {
        flex-grow: 1; 
        overflow-y: auto; 
        min-height: 0; 
        padding: 0 10px; 
        margin: 0 -10px; 
   
              &.disabled{
            pointer-events: none;
            opacity: 0.6;
        }

        
        
    }
    
    .widget-footer {

        flex-shrink: 0; 
 
        display: grid;
        flex: auto;
         grid-template-columns: 2fr 1fr;
        justify-content: flex-end;
        padding-top: 20px;
        margin-top: auto;
        gap: 40%;
    }

    .settings-screen{
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
        top: 0%;
        left: 0%;
        z-index: 100;
        background-color: rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);

        justify-content: center;
        align-items: center;

        &.appear{
            animation: fadeIn 0.5s ease-in-out forwards;
        }

        &.disappear{
            animation: fadeOut 0.5s ease-in-out forwards;
        }

    }
    
@keyframes fadeIn {
    from {opacity: 0;}
    to {opacity: 1;}
}
@keyframes fadeOut {
    from {opacity: 1;}
    to {opacity: 0;}
 }

</style>
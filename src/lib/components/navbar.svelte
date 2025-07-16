
<script>
// @ts-nocheck
// This is the nav bar component. The top heading for the website.


    import {ShoppingCart, Settings, Import} from "lucide-svelte";
    
    import SettingsScreen from "$lib/views/settings/+page.svelte";

    import {LLM_CONNECTED} from "$lib/stores/statusStore.js";

    import StatusIndicator from "./status-indicator.svelte";
    import DarkModeSwitcher from "./dark-mode-switcher.svelte";

    let settingsOpen = false;


    import { onMount } from "svelte";

    import WebAdminsAPI from "$lib/utils/web-admins";


    onMount(() => {
        let connected =  WebAdminsAPI.testGeminiKey();

        //Updated here, but also within $lib/views/settings/+page.svelte upon save
        LLM_CONNECTED.set(connected);
    })
   




</script>


<div class = "navbar">
    <div class = "logo-container">

        <ShoppingCart size={40} color = "var(--primary-color)" />
        
        <div class="masked-icon" style=" min-width: 100px; min-height: 50x; ; margin-right: 20px;"></div>
      
    </div>

    <div class="options y-centered" style="gap: var(--largest-gap);">

        <DarkModeSwitcher />

       <StatusIndicator />

        <button class = "btn transparent compact" style="font-size: 1.2rem; --base-txt: var(--text-color);"
        on:click={() => settingsOpen = true}>
        <Settings  style = "margin-right:10px; " />
            <span > <i> Settings </i> </span>
        </button>
        
    </div>

    {#if settingsOpen}

        <SettingsScreen on:close={ () => settingsOpen = false } />
    {/if}




    
</div>









    
<style lang="scss">


    .actions-container{
        margin-right:5px ;
    }
    
    .navbar{
        display: flex;
        flex: auto;
        background-color: color-mix(in srgb, var(--background-color) 95%, white);
        box-shadow: 5px 5px 5px rgba(0,0,0,0.5);
        padding: 10px 40px;
    }
    
    .logo-container{
        display: flex;
        align-items: center;
        flex: auto;
    
    }

   .masked-icon {
        width: 200px;
        height: 50px;

        mask-image: url('/assets/logo.svg');
    
        /* 2. Configure the mask */
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;

        mask-size: 200px;
        
        background-color: var(--primary-color);

}
    
</style>
    
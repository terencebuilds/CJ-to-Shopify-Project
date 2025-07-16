
<!--This will be the main structure of the site -->

<script>
// @ts-nocheck



    import { browser } from '$app/environment';

    //  import global styles and theme
    import "../styles/global.scss";
    import "../styles/theme.scss";



    import Navbar from "$lib/components/navbar.svelte";


    import { THEME } from "$lib/stores/statusStore.js";
    let theme = THEME;


    THEME.subscribe((value) => {
        theme = value;
    });


    // Apply Global theme

    $: if (browser) {
        document.body.setAttribute('data-theme', theme);
    }


</script>





<main>
    
    <Navbar />
   
    <!--page will render here-->
    <slot />

</main>


<style lang="scss">

</style>

<script>
    
// @ts-nocheck
// This is the component for dark / light mode toggling

    import { THEME } from "$lib/stores/statusStore.js";
    import { Moon, Sun } from "lucide-svelte";

    let originalTheme = false;

    //Set the original theme on loading
    THEME.subscribe((value) => {
        originalTheme = value;
    });

    let enabled = originalTheme === "dark";
    console.log("current theme is", enabled)

    function toggleTheme() {
        enabled = !enabled;
        THEME.set(enabled ? "dark" : "light");
    }
</script>

<div>
    <!-- The button itself is the main container -->
    <button
        class="toggle-theme"
        class:toggled={enabled}
        on:click={toggleTheme}
        aria-label="Toggle theme"
    >
        <!-- The sliding circle -->
        <div class="inner-circle"></div>


        <div class = "icon-container">
          
                <div class="sun">
                <Sun size = {20} color = "black" class = "sun" />
                </div> 
    
                <div class="moon">
                <Moon  size = {20}  color = "white" class = "moon"/>
                </div> 
          
        </div>

    </button>
</div>

<style lang="scss">
    $circle-size: 18px;
    $padding: 4px;
    $button-width: 50px;
    $button-height: 25px;

    .toggle-theme {
        position: relative;
        display: flex;
        align-items: center;
        width: $button-width;
        height: $button-height;
        border-radius: 50px;
        border: 1px solid var(--border-color, #ccc);
        background-color: transparent;
        cursor: pointer;
        overflow: hidden;
        transition: background-color 0.3s ease-in-out;

        // Default "day" background
        background-color: #e0f7fa;
    }

    .inner-circle {
        position: absolute;
        z-index: 1;
        width: $circle-size;
        height: $circle-size;
        border-radius: 50%;
        background-color: #fdd835; // A sun-like color
        top: 50%;
        transform: translateY(-50%);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); // Bouncy transition

        // Start position (light mode)
        left: $padding;
    }

    .sun {
        opacity: 1;
        transform: rotate(10deg) scale(1) translateY(9px) translateX(22px);
    }

    .moon {
        opacity: 0;
        transform: rotate(-90deg) scale(0);
        color: #fff; // White icon for the night mode
    }


    // --- THE "TOGGLED" STATE ---
    .toggle-theme.toggled {
        // Night background
        background-color: #263238;

        .inner-circle {
            background-color: #7e57c2; // A moon-like color
            left: calc(100% - $circle-size - $padding);
        }

        .sun {
            // Fade out and rotate the sun away
            opacity: 0;
            transform: rotate(100deg) scale(1) translateY(-0px) translateX( 20px);

        }
        
        .moon {
            // Fade in and rotate the moon into place
            opacity: 1;
            transform: rotate(10deg) scale(1) translateY(-9px) translateX( -5px);


        
        }
    }
</style>
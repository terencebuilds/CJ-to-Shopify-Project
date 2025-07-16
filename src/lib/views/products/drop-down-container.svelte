<script>
// @ts-nocheck

// This component is responsible for abstracting the drop-down container functionality, and its labels with imported data




export let label = "Select an option";
export let options = ["Default Option 1", "Default Option 2", "Default Option 3"];
export let selectedOption = null;


</script>


<div class="drop-down-container">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label>{label}</label>
    <select bind:value={selectedOption}>
        {#each options as option}
            <option value={option}>{option}</option>
        {/each}
    </select>
</div>

<style>

.drop-down-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  
    label {
        margin-right: 10px;
        font-weight: bold;
        white-space: nowrap;
    }

    select {
        padding: 5px;
        border-radius: 5px;
        border: 1px solid color-mix(in srgb, var(--text-color) 50%, transparent);
        background-color: color-mix(in srgb, var(--text-color) 0%, transparent);
        color: var(--text-color);
        cursor: pointer;
        width: 150px
    }

    select option {
       background: var(--background-color);
      
    color: var(--text-color);
    }

}

</style>
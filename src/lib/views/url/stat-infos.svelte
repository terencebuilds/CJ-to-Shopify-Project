<script>

// @ts-nocheck
// Component to handle the organization of stat blocks. Just numbers and corresponding labels in a structured way.


     export let infos = [];

</script>


<div class = "row">
    
    {#each infos as info (info.label)}

    <div class = "item stat">
        <h3 style="margin: 0px;">
        {info.stat}
        </h3>
        <h5 style="margin: 1px;">
            <i>{info.label}</i>  
        </h5>
    </div>
    
    {/each}
</div>

    
    
<style lang="scss">
    
</style>
    
    
    
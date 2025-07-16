<script>
// @ts-nocheck

// A component to help visualize parsing feedback on url imports

  

    import GeneralUtil from "$lib/utils/general.js"


   
    export let UrlsToProcess = 0;
    export let UrlsProcessed = 0;


    export let ProcessedTable = [];
    export let FailedTable = [];


   
    let lastEvent = null; // This will hold the single latest event: { text: string, type: 'success' | 'fail' }

    let prevSuccessCount = 0;
    let prevFailCount = 0;

    // Reactive block to identify the most recent change
    $: {

        if (UrlsToProcess == 0){
            prevFailCount = 0;
            prevSuccessCount = 0;
            lastEvent = null;
        }

        if (ProcessedTable.length > prevSuccessCount) {
            lastEvent = { text: ProcessedTable[ProcessedTable.length - 1], type: 'success' };
        } else if (FailedTable.length > prevFailCount) {
            lastEvent = { text: FailedTable[FailedTable.length - 1], type: 'fail' };
        }
        prevSuccessCount = ProcessedTable.length;
        prevFailCount = FailedTable.length;
    }

</script>


<div style="height: 95px;  min-width: 0; overflow: hidden;">

    <!-- Display -->
    {#if UrlsToProcess > 0}

            <!-- Show Progress -->
        <p style="white-space: nowrap;">Processing {UrlsProcessed} of {UrlsToProcess} URLs...</p>

        <meter class="progress-bar" value={UrlsProcessed} max={UrlsToProcess}>
            {#if UrlsToProcess > 0}
                {Math.round((UrlsProcessed / UrlsToProcess) * 100)}%
            {:else}
                0%
            {/if}
        </meter>


            {#if lastEvent && lastEvent.text}
            {#if lastEvent.type === 'success'}
                <p class="fade-in partial-opacity small one-line">{GeneralUtil.truncate(lastEvent.text.trim(), 10)} was parsed successfully</p>
            {:else if lastEvent.type === 'fail'}
                <p class="fade-in partial-opacity failure small one-line">{GeneralUtil.truncate(lastEvent.text.trim(), 10)} failed to parse</p>
            {/if}
        {/if}


    {:else}

            <!-- Show Results or Prompt to start -->

        <p class="fade-in partial-opacity y-centered"
            style="text-align: left;">
            {#if UrlsProcessed > 0}
                Processed {UrlsProcessed}  {UrlsProcessed>1 ? 'URLs' : 'URL'} {FailedTable.length > 0 ? 'with some failures.' : 'successfully.'}
           
           
                {:else}
                No URLs processed yet.
            {/if}
            
            No URLs to process.</p>
    {/if}

    

</div>

<style>




</style>
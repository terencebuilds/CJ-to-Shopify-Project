<script>
    import { Store, Plus, Trash, Edit, CheckCircle, AlertCircle, Save, X, Loader } from "lucide-svelte";
    import { slide } from 'svelte/transition'; // For smooth UI transitions


    import WebAdminsAPI from "$lib/utils/web-admins";


    // Sample stores data
    export let stores = [
        { id: 1, nickname: "Main Tech Store (Default)", url: "my-tech-store.myshopify.com", apiKey: "shpat_xxxxxxxxxxxx"},
        { id: 2, nickname: "Side-Hustle Apparel", url: "cool-threads.myshopify.com", apiKey: "shpat_yyyyyyyyyyyy" }
    
    
    ];

    // Current form state
    let showAddForm = false;


   
    /** @type {number | null}   */
    let editingId = null; // null for adding, an id for editing
    let newStore = { nickname: '', url: '', apiKey: ''};
    
    // State for the "Test Connection" button feedback
    let testConnectionStatus = { status: 'idle', message: '' }; // idle, testing, success, error



    // --- FUNCTIONS ---

    function handleAddNewClick() {
        editingId = null;
        newStore = { nickname: '', url: '', apiKey: '' };
        testConnectionStatus = { status: 'idle', message: '' };
        showAddForm = true;
    }

   
    /**
     * @param {any} store
     */
    function handleEditClick(store) {
        editingId = store.id;
        
        newStore = { ...store }; // Copy the store data into the form
        testConnectionStatus = { status: 'idle', message: '' };
        showAddForm = true;
    }
    
    /**
     * @param {number} idToDelete
     */
    function handleDeleteClick(idToDelete) {
        stores = stores.filter(store => store.id !== idToDelete);
    }

    function cancelForm() {
        showAddForm = false;
        editingId = null;
    }

    async function handleSaveStore() {
        if (!newStore.nickname || !newStore.url || !newStore.apiKey) {
            alert('Please fill out all fields.');
            return;
        }

        // Before allowing a save, we must check if the connection works

         await handleTestConnection();
         if (testConnectionStatus.status !== "success" ) {
            alert('A valid connection was not made. Please check your API key')
            return;
         }


        if (editingId) {
            // Update existing store
            stores = stores.map(store => store.id === editingId ? { ...newStore, id: editingId } : store);
        } else {
            // Add new store
            // @ts-ignore
            newStore.new = true;
            const newId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;
            stores = [...stores, { ...newStore, id: newId}];


        }
        
        cancelForm(); // Hide form on success
    }

    async function handleTestConnection() {
        if (!newStore.apiKey) {
            testConnectionStatus = { status: 'error', message: 'API Key cannot be empty.' };
            return;
        }
        testConnectionStatus = { status: 'testing', message: 'Testing connection...' };
        
        // Delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        const validAccessToken = await WebAdminsAPI.testShopifyAccess(newStore.url, newStore.apiKey);
     


        // In a real app, you would make a fetch request to the Shopify Admin API.
        if (newStore.apiKey.includes('fail') || !validAccessToken) {
            testConnectionStatus = { status: 'error', message: 'Connection Failed: Invalid API key.' };
        } else {

                 console.log("valid access token: ", validAccessToken);
            testConnectionStatus = { status: 'success', message: 'Connection successful!' };
        }
    }

</script>

<div class="api-contianer">
    <div class="mini-h" style="gap: 10px;">
        <h4>Shopify Destinations</h4>
        <Store size={24} />
    </div>
    <hr style="border: 1px solid; width: 100%; margin: 10px 0; opacity: 0.2 "/>

    <!-- List of existing stores -->
    <div class="list">
        {#each stores as store (store.id)}
            <div class="item regular"
                class:highlighted = {editingId == store.id}>
                <div class="options vertical compact-v">
                    <span class="mini-h">{store.nickname}</span>
                    <span class="small partial-opacity">{store.url}</span>
                </div>
            
                <div class="options">
                    <!-- Edit Button -->
                    <button class="btn compact transparent" on:click={() => handleEditClick(store)}>
                        <Edit size={16}/>
                    </button>
                    <!-- Delete Button -->
                    <button class="btn compact transparent" on:click={() => handleDeleteClick(store.id)}>
                        <Trash size={16} color="rgb(220, 53, 69)"/>
                    </button>
                </div>

            </div>
        {/each}
    </div>

    <!-- ADD/EDIT FORM -->
    {#if showAddForm}
        <div class="api-container" transition:slide>
             <h4 class="mini-h" style="font-size: 1.1rem; margin-bottom: 15px;">
                {#if editingId}Edit Destination{:else}Add New Destination{/if}
            </h4>

            <div class="api-input" style = "padding: 0px;">
                <span class="mini-h">Store Nickname</span>
                <input type="text" placeholder="e.g., My Main Tech Store" bind:value={newStore.nickname} class="form-control line" />
                <div class="small partial-opacity" style="margin: 0px 30px">A memorable name for you to identify this store.</div>
            </div>

            <div class="api-input">
                <span class="mini-h">Shopify Store URL</span>
                <input type="text" placeholder="my-store.myshopify.com" bind:value={newStore.url} class="form-control line" />
            </div>

            <div class="api-input">
                <span class="mini-h">Shopify Admin API Access Token</span>
                <input type="password" placeholder="shpat_••••••••••••••••" bind:value={newStore.apiKey} class="form-control line" />
            </div>

            <!-- TEST CONNECTION FEEDBACK -->
            <div class="options fill">
                <button class="btn compact transparent thin-outline"
                style="flex-grow: 0;" 
                    on:click={handleTestConnection} disabled={testConnectionStatus.status === 'testing'}>
                    {#if testConnectionStatus.status === 'testing'}
                        <div class = "spinner">
                        <Loader size={16} /> 
                        </div>
                        Testing...
                    {:else}
                        Test Connection
                    {/if}
                </button>
                {#if testConnectionStatus.status !== 'idle'}
                    <div class="api-feedback small compact" 
                        class:success={testConnectionStatus.status === 'success'}
                        class:error={testConnectionStatus.status === 'error'}
                    >
                        {#if testConnectionStatus.status === 'success'} <CheckCircle size={16}/> {/if}
                        {#if testConnectionStatus.status === 'error'} <AlertCircle size={16}/> {/if}
                        {testConnectionStatus.message}
                    </div>
                {/if}
            </div>

            <!-- FORM ACTIONS -->
            <div class="options line">
                 <button class="btn transparent thin-outline" 
                    on:click={cancelForm}>
                    <X size={16}/> Cancel
                </button>
                <button class="btn" on:click={handleSaveStore}>
                    <Save size={16}/> Save Destination
                </button>
            </div>
        </div>
    {:else}
        <button class="btn  transparent thin-outline" 
        on:click={handleAddNewClick}>
            <Plus size={20}/> Add New Shopify Destination
        </button>
    {/if}

</div>


<style lang="scss">

</style>
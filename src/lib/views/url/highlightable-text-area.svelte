<script>
    // @ts-nocheck
    // This component handles a text area that can highlight certain phrases as "bad" (ex. failed URLs)


    import { createEventDispatcher } from 'svelte';

    
    //The bound value of the textarea.
    export let value = '';

    //The placeholder text for the textarea.
    export let placeholder = '';

    // Array of strings that should be highlighted as "bad" (e.g., failed URLs).
    export let badPhrases = [];

     // Value tto control whether highlighting is currently visible.
    export let showHighlights = false;


    let textareaEl;
    let backdropEl;

    // Internal reactive variable for the highlighted HTML content
    let highlightedHtml = '';

    // Dispatcher for external events (e.g., if parent wants to know about focus/scroll)
    const dispatch = createEventDispatcher();

    // Syncs the backdrop's scroll position to the textarea's
    function handleScroll() {
        if (backdropEl && textareaEl) {
            backdropEl.scrollTop = textareaEl.scrollTop;
            backdropEl.scrollLeft = textareaEl.scrollLeft;
        }
        dispatch('scroll', { scrollTop: textareaEl.scrollTop, scrollLeft: textareaEl.scrollLeft });
    }

    // Hides highlights when user starts typing/focuses
    function handleFocus() {
        showHighlights = false;
        dispatch('focus');
    }

    // Reactive statement to generate the highlighted HTML
    $: {
        if (showHighlights && badPhrases.length > 0) {
            console.log("Highlighted phrases:", badPhrases);
            const failedSet = new Set(badPhrases.map(phrase => phrase.trim()));
            const lines = value.split('\n'); // Use 'value' prop, not 'urlsInput'
            highlightedHtml = lines.map(line => {
                const trimmedLine = line.trim();
                if (failedSet.has(trimmedLine)) {
                    return `<span class="bad-phrase">${escapeHtml(line)}</span>`;
                }
                return escapeHtml(line);
            }).join('\n');

        

        } else {
            highlightedHtml = escapeHtml(value); // Use 'value' prop
        }


        console.log("Highlighted HTML:", highlightedHtml);
    }

   

    function escapeHtml(text) {
        if (!text) return '';
            return String(text)
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, "\"")
            .replace(/'/g, "'"); 
    }

    
</script>

<div class="textarea-wrapper">
    <div class="textarea-backdrop" bind:this={backdropEl}>{@html highlightedHtml}</div>

    <textarea
        class="text-area"
        bind:value={value}            
        bind:this={textareaEl}         
        placeholder={placeholder}     
        on:focus={handleFocus}        
        on:scroll={handleScroll}      
        {...$$restProps}
    ></textarea>
</div>


<style lang="scss">

    %textarea-shared {
        margin: 0px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        width: 100%;
        min-height: 150px;
        box-sizing: border-box;
        resize: none; /* Prevents resizing */
        color: var(--text-color);
           };
       

    .textarea-wrapper {
        position: relative;
    }


    :global(.bad-phrase) { /* Using :global() */
        color: rgba(0,0,0,0); /* Still transparent text */
        background-color: var(--danger-color); /* A soft red background */
        border-radius: 3px;
        padding: 0 2px;
    }


    .textarea-backdrop {
        @extend %textarea-shared;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
       
        overflow: auto;
        pointer-events: none; /* Clicks pass through to the textarea */
        white-space: pre-wrap; /* Respects newlines and wrapping */
        word-wrap: break-word;
        color: transparent; /* Makes default text invisible, only spans are seen */
      
        height: 100%;
        border-color: transparent; /* Changed to transparent for a cleaner look */
       
        top: 0; 
        left: 0; 

        scrollbar-color: transparent transparent; /* Makes scrollbars invisible */
    


    }

    .text-area {
        @extend %textarea-shared;
        position: relative;
        z-index: 2;
        background: transparent; 
        caret-color: var(--text-color) ; /* Ensures the typing cursor is visible */
            color: var(--text-color);
    }
    
    .text-area::placeholder {
        color: #999;
    }
</style>
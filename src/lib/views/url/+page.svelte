<script>
// @ts-nocheck
// src/lib/views/url/+page.svelte
// This view is responsible for parsing the input of urls and adding them to the database


//Import necessary components and icons
 
import {Download, Info, CircleQuestionMark} from "lucide-svelte";

import StatInfos from "./stat-infos.svelte";
import ParsingFeedback from "./parsing-feedback.svelte";
import HighlightableTextArea from './highlightable-text-area.svelte';


let URL_PLACEHOLDER_TEXT = `(insert one URL per line)\n  
https://cjdropshipping.com/product/example-p-1234567.html\n
https://cjdropshipping.com/product/example-p-78901234.html      
    `

let ImportStats = [
    {label: "Total Successful imports", stat: 0},
    {label: "Total Failed imports", stat: 0},
];

let totalUrlsToParse = 0;
let parsedCount = 0;
let parseProgress = 0;
let isParsing = false;
let currentParsedUrl = '';
let urlsInput = '';
    

// Global variables for the parsing process

let FailedTable_Proc = []; 
let ProcessedTable_Proc = [];



let showHighlights = true; // Controls whether to show highlights in the textarea


// Hides highlights when user interacts with the textarea
function handleFocus() {
        showHighlights = false;
    }

async function parseUrls() {
        if (!urlsInput.trim()) return;

        const urls = urlsInput.split('\n').filter(url => url.trim() !== '');
        if (urls.length === 0) return;

        totalUrlsToParse = urls.length;
        parsedCount = 0;
        parseProgress = 0;
        isParsing = true;
        currentParsedUrl = '';

        ProcessedTable_Proc = [];
        FailedTable_Proc = [];

        try {
            // Use EventSource for streaming updates
            const eventSource = new EventSource('/api/parse-urls'); // GET is default for EventSource

            const response = await fetch('/api/parse-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls }),
            });

            if (!response.body) {
                throw new Error('Response body is null, cannot stream.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // This loop will continuously read from the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream complete.');
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                // Process events as they come in (each event ends with \n\n)
                let eventEnd;
                while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
                    const eventData = buffer.substring(0, eventEnd);
                    buffer = buffer.substring(eventEnd + 2);

                    const lines = eventData.split('\n');
                    let eventType = 'message';

                    /** @type {any} */
                    let data = {};

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            try {
                                data = JSON.parse(line.substring(6).trim());
                            } catch (e) {
                                console.error('Failed to parse event data:', e, line);
                            }
                        }
                    }

                    // Handle different event types
                    if (eventType === 'start') {
                        // totalUrlsToParse is already set on client
                        console.log('Parsing started:', data.message);
                    } else if (eventType === 'progress') {
                        currentParsedUrl = data.url;
                        parsedCount = data.index + 1;
                        parseProgress = (parsedCount / totalUrlsToParse) * 100;
                        if (data.status === 'success') {

                            // Add to ProcessedTable_Proc
                            ProcessedTable_Proc.push(data.name);
                            ProcessedTable_Proc = ProcessedTable_Proc
                            
                            console.log(ProcessedTable_Proc)
                            ImportStats[0].stat = ImportStats[0].stat + 1;

                        } else if (data.status === 'failed') {
                            //add to FailedTable_Proc

                      
                            FailedTable_Proc.push(data.url);
                     

                            console.log(FailedTable_Proc)
                            ImportStats[1].stat = ImportStats[1].stat + 1;

                            FailedTable_Proc = FailedTable_Proc;
                        }
                        console.log(`Processed ${data.url}: ${data.status}`);
                    } else if (eventType === 'complete') {
                        console.log('Parsing complete:', data.message);
                        console.log('Final Stats:', data.successfulCount, data.failedCount);
                    }
                }
            }
        } catch (error) {
            console.error('Error receiving stream:', error);
            // Handle connection errors
        } finally {
            isParsing = false;
            currentParsedUrl = '';

            // Highlight the failed URLs in the textarea
            showHighlights = true; 
            // Just so the progress bar resets
            totalUrlsToParse = 0;
        
        }
    }




</script>

<div style="max-width: var(--nav-width);" >

    <div class = "main-grid">

        <div class="options vertical airtight">
 
             <!-- URL Import Text field and button  -->
            <div class="mini-container">
 
             <div>
                 <div class="mini-h">
                    Import CJ-Dropshipping URLs
                </div>
                <hr class = "invisible" />
                 
                    <HighlightableTextArea 
                        bind:value={urlsInput} 
                        placeholder={URL_PLACEHOLDER_TEXT} 
                        on:focus={handleFocus}
                        showHighlights={showHighlights}
                        badPhrases={FailedTable_Proc} />
 
             </div>
 
 
             <div class="options compact fill">
                <!-- -base-bg: var(--primary-color); -->
                 <button class="btn contained line margin" 
                 style="--base-bg: var(--primary-color); --base-txt: rgba(255,255,255); width: 50%; "
                 on:click={parseUrls} disabled={isParsing} >
                     <Download/>
                     Parse Products
                 </button>
 
             </div>
 
 
            </div>
 
 
            <!-- Dynamic Parsing Feedback  -->
            <div class="mini-container dynamic compact">
                 <ParsingFeedback 
                     UrlsToProcess = {totalUrlsToParse}
                     UrlsProcessed = {parsedCount}
                     ProcessedTable = {ProcessedTable_Proc} 
                     FailedTable = {FailedTable_Proc} />
 
            </div>    
 
 
 
        </div>
 
         <div class = "options vertical airtight">
               <!-- How it works  -->
             <div class="mini-container">
 
                 <div>
                     
                     <div class="mini-h">
                         <CircleQuestionMark />
                         How it works
                     </div>
                   
                     <hr>
                        <ol class="partial-opacity">
                            <li>
                            Find a product on CJDropshipping.com
                            </li>
                            <li>
                            Copy the full link / URL from the address bar
                            </li>
                            <li>
                            Paste the URL into the field on the left
                            </li>
                            <li>
                            Click "Parse Products"
                            </li>
                        </ol>
                     </div>
                     
                     <!--additional hr for alignment-->
                     <hr class = "invisible">
     
             </div>
 
               <!-- Stats -->
             <div class="mini-container dynamic compact" >
                 <div class = "mini-h">
                     <Info />
                     Stats
                 </div>
     
                 <StatInfos
                     infos = {ImportStats}
                 />
             </div>    
 
 
         </div>
     </div>


</div>


<style lang="scss">







</style>
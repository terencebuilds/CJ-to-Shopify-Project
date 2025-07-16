// @ts-nocheck

// $lib/utils/general.js

// This is a collection of general utility functions for the application



// Function to truncate text to a maximum length

function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}

// Function to calculate the price on markup

function priceOnMarkup(originalPrice, markupRate, markupType){
        const rate = parseFloat(markupRate) || 0;
        let newPrice;
        if (markupType === '%') {
            // Percentage markup: Original Price * (1 + Markup/100)
            newPrice = originalPrice * (1 + rate / 100);
        } else { 
            // Fixed markup in $: Original Price + Markup
            newPrice =originalPrice + rate;
        }
        // Round to 2 decimal places for currency and assign
        newPrice = Math.round(newPrice * 100) / 100;
        return newPrice;
    }


const GeneralUtil = {
    truncate,
    priceOnMarkup,
};



export default GeneralUtil;
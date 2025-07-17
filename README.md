
# CJ to Shopify | AI-Powered E-Commerce Automation Tool



An intelligent, full-stack web application designed to solve a major pain point for e-commerce dropshippers: the tedious and error-prone process of importing products from CJ Dropshipping into a Shopify store.

This tool leverages a hybrid AI and code-based system to parse, sanitize, filter, and upload large batches of products, correctly harmonizing even the most complex and inconsistent product variant data.





<table>
  <tr>
    <td>
      <a href="https://www.youtube.com/watch?v=mf8yQHosJ0g">
        <img src="https://i.imgur.com/pGObdOp.png" alt="Watch the Full Demo" width="100%">
      </a>
    </td>
    <td>
      <a href="https://www.youtube.com/watch?v=2FLGLYHEa9M">
        <img src="https://i.imgur.com/oeUy1tk.png" alt="Watch the Development Timelapse" width="100%">
      </a>
    </td>
  </tr>
</table>


---

## The Problem

Dropshippers using platforms like CJ Dropshipping often face several challenges:
*   **Time-Consuming Manual Entry:** Manually creating a new Shopify product for each item is slow and inefficient.
*   **Messy & Inconsistent Data:** Product variants (e.g., size, color, style) from suppliers are often messy, inconsistent, or use cryptic codes, making them difficult to map to Shopify's structured option system.
*   **Lack of Filtering:** It's difficult to browse a supplier's catalog and select only the products that fit a specific niche (e.g., "only show me apparel" or "only show me electronic devices").

## The Solution

This application provides an end-to-end solution that automates this entire workflow. It's built around a three-stage process:

1.  **URL Import & Parsing:** Users can paste multiple CJ Dropshipping URLs. The backend scrapes each page for preliminary product data and adds them to a local database for previewing.
2.  **AI-Powered Filtering & Selection:** Users can filter the imported products using natural language queries (e.g., "masculine wear," "grooming products"). A Gemini-powered backend service analyzes the product data and intelligently selects the relevant items.
3.  **Customizable Shopify Upload:** Users can select products and upload them to their Shopify store. The system handles everything: re-scraping for full-resolution data, applying custom price markups, and—most importantly—using an AI-powered pipeline to correctly structure and harmonize complex variant data.

---

## Key Features

*   **Batch URL Parsing:** Scrapes and processes multiple product URLs in parallel.
*   **AI-Powered Semantic Filtering:** Goes beyond simple keyword search to understand user intent and categorize products.
*   **Detailed Product Previews:** A clean UI to review and manage all imported products before uploading.
*   **Customizable Upload Queue:** Full control over price markups (fixed or percentage-based) and product status (Draft/Published).
*   **AI-Powered Variant Harmonization:** The core of the application. Uses a Gemini-powered `variantMap` architecture to transform messy, inconsistent variant names into a clean, structured format that Shopify can understand.
*   **Live Progress Streaming:** The UI provides real-time feedback during the upload process, showing the status of each product.
*   **Polished UI:** Features a clean design, dark mode, and responsive layouts built with Svelte and SCSS.

---

## Tech Stack

*   **Frontend:** Svelte, SvelteKit, SCSS
*   **Backend:** Node.js (via SvelteKit server routes)
*   **Database:** SQLite
*   **APIs & Services:**
    *   **Google Gemini API:** For all AI-powered features (filtering and variant harmonization).
    *   **Shopify Admin API:** For creating products in the user's store.
    *   **Cheerio:** For web scraping product data.

---

## System Architecture & Technical Challenges

The most significant challenge was handling the unreliable and inconsistent product data from the supplier. This required moving beyond a naive approach to a more resilient, hybrid system.

### 1. The "Variant Map" Architecture

Initially, I prompted the LLM to return a large JSON array of all variants. This proved to be token-inefficient and highly prone to truncation and looping errors.

The solution was to architect a more efficient data structure: the **`variantMap`**. The LLM is now prompted to return an object where keys are the original variant names and values are the structured option arrays. This drastically reduced token usage, eliminated truncation errors, and allowed the system to scale to products with over 60 variants.

### 2. Handling Inconsistent Data & API Errors

The system was designed to be resilient to real-world problems:

*   **Problem:** Messy variant data (e.g., `"Pink-L"` vs. `"Large-Pink"`) and cryptic codes (`"ML251711441"`).
*   **Solution:** The LLM prompt was engineered to identify these codes as valid option values. A final, deterministic code-based sanitization step (`buildShopifyVariants`) runs after the AI, ensuring perfect data consistency and replacing any problematic empty strings with valid placeholders before sending the payload to Shopify.

*   **Problem:** API unreliability (transient network errors, rate limits, Cloudflare blocks).
*   **Solution:** All critical API calls are wrapped in a `fetchWithRetry` utility that implements an exponential backoff strategy, making the application far more robust.

---

## Getting Started

To run this project locally, you will need Node.js and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/terencebuilds/CJ-to-Shopify-Project.git
    cd CJ-to-Shopify-Project
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```

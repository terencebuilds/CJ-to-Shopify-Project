// src/lib/types.ts

// Type definitions


// This is deprecated, but needs to be kept around (for reference purposes)


export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    dateAdded: string;
    isSelected: number; 
    isAISelected: number;
}

export interface ShopifyDestination {
    id: number | null;
    nickname: string;
    url: string;
    encryptedKey: string;
    new?: boolean; 
}




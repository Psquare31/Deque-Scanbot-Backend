import { InferenceClient } from '@huggingface/inference';
import { Product } from '../models/Product.js';
import { PurchaseHistory } from '../models/PurchaseHistory.js';
import { ApiError } from '../utils/ApiError.js';
import dotenv from 'dotenv';
dotenv.config();
//verify last commit
class RecommendationService {
    constructor() {
        this.apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!this.apiKey) {
            throw ApiError.create(
                500,
                'HuggingFace API key is not configured',
                ['Please add HF_TOKEN to your environment variables']
            );
        }
        this.client = new InferenceClient(this.apiKey);
        this.provider = 'featherless-ai';
        this.model = 'mistralai/Magistral-Small-2506';
    }

    async generateRecommendations(userId) {
        try {
            // Get user's purchase history
            const userHistory = await PurchaseHistory.find({ userId })
                .sort({ createdAt: -1 });

            if (!userHistory.length) {
                return [];
            }

            // Get all products
            const allProducts = await Product.find({});

            if (!allProducts.length) {
                throw ApiError.create(
                    404,
                    'No products available in the database',
                    ['Please add some products before generating recommendations']
                );
            }

            // Get products user hasn't bought
            const purchasedProductIds = new Set(
                userHistory.flatMap(history => 
                    history.items.map(item => item._id.toString())
                )
            );

            const availableProducts = allProducts.filter(
                product => !purchasedProductIds.has(product._id.toString())
            );

            if (!availableProducts.length) {
                return [];
            }

            // Prepare data for recommendation
            const userPreferences = this.analyzeUserPreferences(userHistory);
            const productFeatures = this.prepareProductFeatures(availableProducts);

            console.log(userPreferences);
            console.log(productFeatures);

            // Generate recommendations using HuggingFace API
            const recommendations = await this.getAIRecommendations(
                userPreferences,
                productFeatures
            );

            return recommendations;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            
            console.error('Error generating recommendations:', error);
            throw ApiError.create(
                500,
                'Failed to generate recommendations',
                [error.message]
            );
        }
    }

    analyzeUserPreferences(userHistory) {
        const preferences = {
            categories: new Map(),
            priceRange: { min: Infinity, max: 0 },
            averageRating: 0,
            totalPurchases: 0
        };

        userHistory.forEach(history => {
            history.items.forEach(item => {
                // Track category preferences
                const category = item.category;
                preferences.categories.set(
                    category,
                    (preferences.categories.get(category) || 0) + item.quantity
                );

                // Track price range
                const price = item.price;
                preferences.priceRange.min = Math.min(preferences.priceRange.min, price);
                preferences.priceRange.max = Math.max(preferences.priceRange.max, price);

                // Track ratings
                if (item.rating) {
                    preferences.averageRating += item.rating;
                    preferences.totalPurchases++;
                }
            });
        });

        if (preferences.totalPurchases > 0) {
            preferences.averageRating /= preferences.totalPurchases;
        }

        return preferences;
    }

    prepareProductFeatures(products) {
        return products.map(product => ({
            id: product._id,
            name: product.name,
            category: product.category,
            price: product.price,
            rating: product.rating,
            tags: product.tags,
            description: product.description
        }));
    }

    async getAIRecommendations(userPreferences, products) {
        try {
            const prompt = this.createRecommendationPrompt(userPreferences, products);
            console.log(prompt);
            const chatCompletion = await this.client.chatCompletion({
                provider: this.provider,
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });
            const aiResponse = chatCompletion.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw ApiError.create(
                    500,
                    'Invalid response from AI service',
                    ['The AI service returned an empty or invalid response']
                );
            }
            const recommendations = this.processAIResponse(
                aiResponse,
                products,
                userPreferences
            );
            return recommendations;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error calling AI API:', error);
            // Fallback to basic recommendation logic if AI fails
            return this.getBasicRecommendations(userPreferences, products);
        }
    }

    createRecommendationPrompt(userPreferences, products) {
        const categories = Array.from(userPreferences.categories.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, weight]) => `${category}(${weight} purchases)`)
            .join(', ');

        const productList = products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            rating: p.rating,
            tags: p.tags
        }));

        return `Given a user's purchase history:
Categories: ${categories}
Price Range: $${userPreferences.priceRange.min} to $${userPreferences.priceRange.max}
Average Rating: ${userPreferences.averageRating.toFixed(1)}
Total Purchases: ${userPreferences.totalPurchases}

Available Products:
${JSON.stringify(productList, null, 2)}

Please analyze this data and recommend the top 5 products that would be most relevant to this user. 
Consider their category preferences, price range, and rating preferences.
Format your response as a JSON array of product IDs in order of relevance, with a brief explanation for each.
Example format:
[
    {
        "productId": "id1",
        "relevance": "high",
        "explanation": "Matches user's category preference and price range"
    }
]`;
    }

    calculateConfidenceScore(product, userPreferences, categoryWeights) {
        const weights = {
            categoryMatch: 0.35,    // How well the product matches user's category preferences
            priceMatch: 0.25,       // How well the price fits user's price range
            ratingMatch: 0.20,      // How well the rating matches user's preferences
            purchaseFrequency: 0.15, // How frequently user buys in this category
            recency: 0.05          // How recent are the purchases in this category
        };

        // 1. Category Match Score (0-1)
        const categoryWeight = categoryWeights.get(product.category) || 0;
        const maxCategoryWeight = Math.max(...Array.from(categoryWeights.values()));
        const categoryMatchScore = maxCategoryWeight > 0 ? categoryWeight / maxCategoryWeight : 0.5;

        // 2. Price Match Score (0-1)
        const priceRange = userPreferences.priceRange;
        const priceDiff = Math.abs(product.price - ((priceRange.min + priceRange.max) / 2));
        const priceRangeWidth = priceRange.max - priceRange.min;
        const priceMatchScore = Math.max(0, 1 - (priceDiff / (priceRangeWidth || 1)));

        // 3. Rating Match Score (0-1)
        const ratingDiff = Math.abs(product.rating - userPreferences.averageRating);
        const ratingMatchScore = Math.max(0, 1 - (ratingDiff / 5)); // 5 is max rating

        // 4. Purchase Frequency Score (0-1)
        const totalPurchases = userPreferences.totalPurchases;
        const categoryPurchases = categoryWeight;
        const purchaseFrequencyScore = totalPurchases > 0 ? categoryPurchases / totalPurchases : 0.5;

        // 5. Recency Score (0-1)
        // This would require tracking purchase dates per category
        // For now, we'll use a default value
        const recencyScore = 0.8; // Default value, can be improved with actual purchase dates

        // Calculate weighted confidence score
        const confidenceScore = (
            weights.categoryMatch * categoryMatchScore +
            weights.priceMatch * priceMatchScore +
            weights.ratingMatch * ratingMatchScore +
            weights.purchaseFrequency * purchaseFrequencyScore +
            weights.recency * recencyScore
        );

        // Normalize to 0.5-1.0 range (minimum 50% confidence)
        return 0.5 + (confidenceScore * 0.5);
    }

    processAIResponse(aiResponse, products, userPreferences) {
        try {
            let aiRecommendations;
            try {
                aiRecommendations = JSON.parse(aiResponse);
            } catch (e) {
                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    aiRecommendations = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Could not parse AI response as JSON');
                }
            }
            const categoryWeights = new Map();
            userPreferences.categories.forEach((weight, category) => {
                categoryWeights.set(category, weight);
            });
            const productMap = new Map(products.map(p => [p.id.toString(), p]));
            const recommendations = aiRecommendations
                .filter(rec => productMap.has(rec.productId))
                .map(rec => {
                    const product = productMap.get(rec.productId);
                    const baseConfidence = this.calculateConfidenceScore(
                        product,
                        userPreferences,
                        categoryWeights
                    );
                    const relevanceMultiplier = {
                        'high': 1.2,
                        'medium': 1.0,
                        'low': 0.8
                    }[rec.relevance?.toLowerCase()] || 1.0;
                    const adjustedConfidence = Math.min(
                        1.0,
                        Math.max(0.5, baseConfidence * relevanceMultiplier)
                    );
                    return {
                        productId: product.id,
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        rating: product.rating,
                        confidence: adjustedConfidence,
                        reasons: [
                            ...this.generateRecommendationReasons(product, userPreferences, categoryWeights),
                            rec.explanation
                        ]
                    };
                })
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 5);
            if (recommendations.length < 5) {
                const usedProductIds = new Set(recommendations.map(r => r.productId.toString()));
                const additionalProducts = products
                    .filter(p => !usedProductIds.has(p.id.toString()))
                    .map(p => ({
                        productId: p.id,
                        name: p.name,
                        category: p.category,
                        price: p.price,
                        rating: p.rating,
                        confidence: this.calculateConfidenceScore(p, userPreferences, categoryWeights),
                        reasons: this.generateRecommendationReasons(p, userPreferences, categoryWeights)
                    }))
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5 - recommendations.length);
                recommendations.push(...additionalProducts);
            }
            return recommendations;
        } catch (error) {
            console.error('Error processing AI response:', error);
            return this.getBasicRecommendations(userPreferences, products);
        }
    }

    generateRecommendationReasons(product, userPreferences, categoryWeights) {
        const reasons = [];

        // Category match reason
        const categoryWeight = categoryWeights.get(product.category) || 0;
        if (categoryWeight > 0) {
            reasons.push(`Matches your ${product.category} category preference`);
        }

        // Price match reason
        const priceRange = userPreferences.priceRange;
        const avgPrice = (priceRange.min + priceRange.max) / 2;
        const priceDiff = Math.abs(product.price - avgPrice);
        if (priceDiff <= (priceRange.max - priceRange.min) * 0.2) {
            reasons.push('Price matches your typical purchase range');
        }

        // Rating match reason
        if (product.rating >= userPreferences.averageRating) {
            reasons.push('High-rated product matching your preferences');
        }

        return reasons;
    }

    getBasicRecommendations(userPreferences, products) {
        // Calculate category weights
        const categoryWeights = new Map();
        userPreferences.categories.forEach((weight, category) => {
            categoryWeights.set(category, weight);
        });

        // Fallback recommendation logic based on user preferences
        return products
            .filter(product => {
                const categoryWeight = categoryWeights.get(product.category) || 0;
                const priceInRange = product.price >= userPreferences.priceRange.min &&
                                   product.price <= userPreferences.priceRange.max;
                return categoryWeight > 0 && priceInRange;
            })
            .map(product => ({
                productId: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                rating: product.rating,
                confidence: this.calculateConfidenceScore(product, userPreferences, categoryWeights),
                reasons: this.generateRecommendationReasons(product, userPreferences, categoryWeights)
            }))
            .sort((a, b) => {
                // First sort by confidence
                const confidenceDiff = b.confidence - a.confidence;
                if (confidenceDiff !== 0) return confidenceDiff;

                // Then by category weight
                const aCategoryWeight = categoryWeights.get(a.category) || 0;
                const bCategoryWeight = categoryWeights.get(b.category) || 0;
                return bCategoryWeight - aCategoryWeight;
            })
            .slice(0, 5);
    }
}

export const recommendationService = new RecommendationService(); 
import { recommendationService } from '../services/recommendationService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const recommendationController = {
    getRecommendations: asyncHandler(async (req, res) => {
        const { userId } = req.params;

        if (!userId) {
            throw ApiError.create(400, 'User ID is required');
        }

        const recommendations = await recommendationService.generateRecommendations(userId);

        if (!recommendations.length) {
            return res
                .status(200)
                .json(new ApiResponse(
                    200,
                    { recommendations: [], count: 0 },
                    'No recommendations available for this user'
                ));
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {
                    recommendations,
                    count: recommendations.length
                },
                'Recommendations generated successfully'
            ));
    })
}; 
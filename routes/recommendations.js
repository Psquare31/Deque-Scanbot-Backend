import express from 'express';
import { recommendationController } from '../controllers/recommendationController.js';

const router = express.Router();

router.get('/:userId', recommendationController.getRecommendations);

export default router; 
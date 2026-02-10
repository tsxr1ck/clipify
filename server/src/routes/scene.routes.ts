import { Router } from 'express';
import { sceneController, storyController } from '../controllers/scenestorage.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// SCENE ROUTES
// ============================================================================

// Create new scene
router.post('/scenes', sceneController.create);

// List scenes
router.get('/scenes', sceneController.list);

// Find similar scenes
router.get('/scenes/search/similar', sceneController.findSimilar);

// Get specific scene
router.get('/scenes/:id', sceneController.get);

// Update scene
router.put('/scenes/:id', sceneController.update);

// Mark scene as used
router.post('/scenes/:id/use', sceneController.markUsed);

// Delete scene
router.delete('/scenes/:id', sceneController.delete);

// ============================================================================
// STORY ROUTES
// ============================================================================

// Create new story
router.post('/stories', storyController.create);

// List stories
router.get('/stories', storyController.list);

// Find similar stories
router.get('/stories/search/similar', storyController.findSimilar);

// Get specific story
router.get('/stories/:id', storyController.get);

// Update story
router.put('/stories/:id', storyController.update);

// Mark story as used
router.post('/stories/:id/use', storyController.markUsed);

// Delete story
router.delete('/stories/:id', storyController.delete);

export default router;
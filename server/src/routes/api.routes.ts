import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';

// Controllers
import {
    authController,
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    refreshTokenSchema,
} from '../controllers/auth.controller.js';
import {
    apiKeyController,
    createApiKeySchema,
    updateApiKeySchema,
} from '../controllers/apiKey.controller.js';
import {
    styleController,
    createStyleSchema,
    updateStyleSchema,
    listStylesSchema,
} from '../controllers/style.controller.js';
import {
    characterController,
    createCharacterSchema,
    updateCharacterSchema,
    listCharactersSchema,
} from '../controllers/character.controller.js';
import {
    generationController,
    createGenerationSchema,
    updateGenerationSchema,
    completeGenerationSchema,
    listGenerationsSchema,
} from '../controllers/generation.controller.js';
import {
    creditsController,
    purchaseCreditsSchema,
    listTransactionsSchema,
} from '../controllers/credits.controller.js';
import {
    paymentController,
    createPreferenceSchema,
} from '../controllers/payment.controller.js';

const router = Router();

// ==================== AUTH ====================
router.post('/auth/register', validateBody(registerSchema), authController.register);
router.post('/auth/login', validateBody(loginSchema), authController.login);
router.post('/auth/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
router.post('/auth/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/auth/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);

// ==================== API KEYS ====================
router.get('/api-keys', authenticate, apiKeyController.list);
router.post('/api-keys', authenticate, validateBody(createApiKeySchema), apiKeyController.create);
router.put('/api-keys/:id', authenticate, validateBody(updateApiKeySchema), apiKeyController.update);
router.delete('/api-keys/:id', authenticate, apiKeyController.delete);
router.post('/api-keys/:id/validate', authenticate, apiKeyController.validate);

// ==================== STYLES ====================
router.get('/styles', authenticate, validateQuery(listStylesSchema), styleController.list);
router.get('/styles/:id', authenticate, styleController.get);
router.post('/styles', authenticate, validateBody(createStyleSchema), styleController.create);
router.put('/styles/:id', authenticate, validateBody(updateStyleSchema), styleController.update);
router.delete('/styles/:id', authenticate, styleController.delete);

// ==================== CHARACTERS ====================
router.get('/characters', authenticate, validateQuery(listCharactersSchema), characterController.list);
router.get('/characters/:id', authenticate, characterController.get);
router.post('/characters', authenticate, validateBody(createCharacterSchema), characterController.create);
router.put('/characters/:id', authenticate, validateBody(updateCharacterSchema), characterController.update);
router.delete('/characters/:id', authenticate, characterController.delete);

// ==================== GENERATIONS ====================
router.get('/generations', authenticate, validateQuery(listGenerationsSchema), generationController.list);
router.get('/generations/:id', authenticate, generationController.get);
router.post('/generations', authenticate, validateBody(createGenerationSchema), generationController.create);
router.put('/generations/:id', authenticate, validateBody(updateGenerationSchema), generationController.update);
router.post('/generations/:id/complete', authenticate, validateBody(completeGenerationSchema), generationController.complete);
router.post('/generations/:id/fail', authenticate, generationController.fail);
router.delete('/generations/:id', authenticate, generationController.delete);

// ==================== CREDITS ====================
router.get('/credits/balance', authenticate, creditsController.getBalance);
router.get('/credits/transactions', authenticate, validateQuery(listTransactionsSchema), creditsController.getTransactions);
router.get('/credits/packages', creditsController.getPackages);
router.post('/credits/purchase', authenticate, validateBody(purchaseCreditsSchema), creditsController.purchase);
router.get('/credits/usage-summary', authenticate, creditsController.getUsageSummary);

// ==================== PAYMENTS (Mercado Pago) ====================
router.post('/payments/create-preference', authenticate, validateBody(createPreferenceSchema), paymentController.createPreference);
router.post('/payments/process-brick', authenticate, paymentController.processBrick);
router.post('/payments/webhook', paymentController.webhook); // Public - MP calls this
router.get('/payments/:id', authenticate, paymentController.getDetails);

// ==================== ADMIN ====================
router.get('/admin/stats', authenticate, authorize('admin'), async (_req, res) => {
    // TODO: Implement admin stats
    res.json({ message: 'Admin stats endpoint' });
});

// ==================== UPLOADS ====================
import { uploadController } from '../controllers/upload.controller.js';
router.post('/upload/style-image', authenticate, uploadController.uploadStyleImage);
router.post('/upload/character-image', authenticate, uploadController.uploadCharacterImage);
router.post('/upload/generation', authenticate, uploadController.uploadGeneration);

// ==================== AI GENERATION ====================
import { aiController } from '../controllers/ai.controller.js';
router.post('/ai/analyze-character', authenticate, aiController.analyzeCharacter);
router.post('/ai/extract-style', authenticate, aiController.extractStyle);
router.post('/ai/generate-image', authenticate, aiController.generateImage);
router.post('/ai/generate-video', authenticate, aiController.generateVideo);
router.post('/ai/generate-video-with-ref', authenticate, aiController.generateVideoWithReferenceImage);
router.post('/ai/extend-video', authenticate, aiController.extendVideo); // TEST — video continuation for stories
router.post('/ai/generate-text', authenticate, aiController.generateText);

// ==================== SCENES & STORIES ====================
import sceneRoutes from './scene.routes.js';
router.use('/', sceneRoutes);

export default router;

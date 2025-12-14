/**
 * Bible Routes
 * 
 * Endpunkte für Bibelverse
 */

import { Router } from 'express';
import { 
  getVerse, 
  getChapter, 
  parseReference,
  getTranslations,
  getFavorites,
  addFavorite,
  deleteFavorite,
  updateFavoritesOrder
} from '../controllers/bible.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Öffentliche Endpunkte (auch ohne Auth nutzbar)
router.get('/verse', getVerse);
router.get('/chapter', getChapter);
router.get('/translations', getTranslations);
router.post('/parse', parseReference);

// Geschützte Endpunkte für Bibelübersetzungs-Favoriten
router.get('/favorites', authenticateToken, getFavorites);
router.post('/favorites', authenticateToken, addFavorite);
router.delete('/favorites/:translation', authenticateToken, deleteFavorite);
router.put('/favorites/order', authenticateToken, updateFavoritesOrder);

export default router;


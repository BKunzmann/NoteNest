/**
 * Bible Favorites Service
 * 
 * Verwaltet Bibelübersetzungs-Favoriten für Benutzer
 */

import db from '../config/database';

export interface BibleFavorite {
  id: number;
  user_id: number;
  translation: string;
  display_order: number;
  created_at: string;
}

/**
 * Holt alle Favoriten eines Benutzers, sortiert nach display_order
 * Die Standard-Übersetzung (display_order = 0) kommt immer zuerst
 */
export function getUserFavorites(userId: number): BibleFavorite[] {
  const favorites = db.prepare(`
    SELECT * FROM user_bible_favorites
    WHERE user_id = ?
    ORDER BY 
      CASE WHEN display_order = 0 THEN 0 ELSE 1 END,
      display_order ASC, 
      created_at ASC
  `).all(userId) as BibleFavorite[];
  
  return favorites;
}

/**
 * Fügt eine Übersetzung zu den Favoriten hinzu
 * @param userId - Benutzer-ID
 * @param translation - Übersetzungs-Code
 * @param isDefault - Wenn true, wird display_order auf 0 gesetzt (Standard-Übersetzung)
 */
export function addFavorite(userId: number, translation: string, isDefault: boolean = false): BibleFavorite {
  // Prüfe, ob bereits vorhanden
  const existing = db.prepare(`
    SELECT * FROM user_bible_favorites
    WHERE user_id = ? AND translation = ?
  `).get(userId, translation) as BibleFavorite | undefined;
  
  if (existing) {
    // Wenn es die Standard-Übersetzung ist, stelle sicher, dass display_order = 0 ist
    if (isDefault && existing.display_order !== 0) {
      db.prepare(`
        UPDATE user_bible_favorites
        SET display_order = 0
        WHERE user_id = ? AND translation = ?
      `).run(userId, translation);
      return { ...existing, display_order: 0 };
    }
    // Bereits vorhanden, gib es zurück
    return existing;
  }
  
  // Wenn es die Standard-Übersetzung ist, verwende display_order = 0
  // Sonst: Finde die höchste display_order für diesen Benutzer
  let nextOrder: number;
  if (isDefault) {
    nextOrder = 0;
    // Verschiebe alle anderen Favoriten um 1 nach unten
    db.prepare(`
      UPDATE user_bible_favorites
      SET display_order = display_order + 1
      WHERE user_id = ?
    `).run(userId);
  } else {
    const maxOrder = db.prepare(`
      SELECT MAX(display_order) as max_order
      FROM user_bible_favorites
      WHERE user_id = ?
    `).get(userId) as { max_order: number | null } | undefined;
    
    nextOrder = (maxOrder?.max_order ?? -1) + 1;
  }
  
  // Füge hinzu
  const result = db.prepare(`
    INSERT INTO user_bible_favorites (user_id, translation, display_order)
    VALUES (?, ?, ?)
  `).run(userId, translation, nextOrder);
  
  const favorite = db.prepare(`
    SELECT * FROM user_bible_favorites
    WHERE id = ?
  `).get(result.lastInsertRowid) as BibleFavorite;
  
  return favorite;
}

/**
 * Entfernt eine Übersetzung aus den Favoriten
 */
export function removeFavorite(userId: number, translation: string): boolean {
  const result = db.prepare(`
    DELETE FROM user_bible_favorites
    WHERE user_id = ? AND translation = ?
  `).run(userId, translation);
  
  return result.changes > 0;
}

/**
 * Aktualisiert die Reihenfolge der Favoriten
 * @param userId - Benutzer-ID
 * @param favorites - Array mit Übersetzungen und neuen display_order Werten
 * @param defaultTranslation - Standard-Übersetzung (wird immer auf order 0 gesetzt)
 */
export function updateFavoritesOrder(
  userId: number,
  favorites: Array<{ translation: string; order: number }>,
  defaultTranslation?: string
): void {
  // Beginne Transaktion
  const transaction = db.transaction((favorites: Array<{ translation: string; order: number }>) => {
    const updateStmt = db.prepare(`
      UPDATE user_bible_favorites
      SET display_order = ?
      WHERE user_id = ? AND translation = ?
    `);
    
    for (const fav of favorites) {
      // Wenn es die Standard-Übersetzung ist, setze immer order = 0
      const order = (defaultTranslation && fav.translation === defaultTranslation) ? 0 : fav.order;
      updateStmt.run(order, userId, fav.translation);
    }
  });
  
  transaction(favorites);
}

/**
 * Prüft, ob eine Übersetzung in den Favoriten ist
 */
export function isFavorite(userId: number, translation: string): boolean {
  const favorite = db.prepare(`
    SELECT id FROM user_bible_favorites
    WHERE user_id = ? AND translation = ?
  `).get(userId, translation) as { id: number } | undefined;
  
  return !!favorite;
}


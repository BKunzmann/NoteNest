/**
 * Unit Tests für auth.service.ts
 * 
 * Beispiel-Tests für Authentifizierungs-Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as authService from '../../services/auth.service';

describe('Auth Service', () => {
  beforeEach(() => {
    // Setup vor jedem Test
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);
      
      // Argon2 sollte unterschiedliche Hashes produzieren (wegen Salt)
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });
});


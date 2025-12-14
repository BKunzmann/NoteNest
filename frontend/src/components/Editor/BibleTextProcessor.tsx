/**
 * Bible Text Processor
 * 
 * Verarbeitet Text und erkennt Bibelstellen, um sie mit BibleReference zu wrappen
 */

import React from 'react';
import { findBibleReferences } from '../../utils/bibleReference';
import BibleReference from './BibleReference';

interface BibleTextProcessorProps {
  text: string;
  translation?: string;
}

/**
 * Verarbeitet Text und erkennt Bibelstellen
 */
export function processBibleReferences(text: string, translation?: string): React.ReactNode[] {
  const references = findBibleReferences(text);
  
  if (references.length === 0) {
    return [text];
  }
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  references.forEach((ref, index) => {
    // Text vor der Bibelstelle
    if (ref.start > lastIndex) {
      parts.push(text.substring(lastIndex, ref.start));
    }
    
    // Bibelstelle
    parts.push(
      <BibleReference key={`bible-ref-${index}`} reference={ref.reference} translation={translation}>
        {ref.text}
      </BibleReference>
    );
    
    lastIndex = ref.end;
  });
  
  // Restlicher Text nach der letzten Bibelstelle
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}

/**
 * Komponente, die Text verarbeitet und Bibelstellen erkennt
 */
export default function BibleTextProcessor({ text, translation }: BibleTextProcessorProps) {
  const processed = processBibleReferences(text, translation);
  return <>{processed}</>;
}


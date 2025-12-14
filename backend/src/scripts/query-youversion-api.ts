/**
 * Script zum Abfragen der YouVersion API
 * 
 * Findet alle verfügbaren deutschen Übersetzungen, insbesondere "Neues Leben"
 */

import axios from 'axios';

const BIBLE_API_URL = process.env.BIBLE_API_URL || 'https://rest.api.bible';
const BIBLE_API_KEY = process.env.BIBLE_API_KEY || '';

// Alternative YouVersion API URLs zum Testen
const ALTERNATIVE_APIS = [
  'https://rest.api.bible',
  'https://api.scripture.api.bible',
  'https://api.bible'
];

async function queryYouVersionAPI(apiUrl?: string) {
  if (!BIBLE_API_KEY) {
    console.error('❌ BIBLE_API_KEY nicht gesetzt in .env');
    process.exit(1);
  }

  const baseUrl = apiUrl || BIBLE_API_URL;
  const finalApiUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  const url = `${finalApiUrl}/bibles`;

  console.log(`📡 Abfrage der YouVersion API: ${url}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   API Key: ${BIBLE_API_KEY.substring(0, 10)}...`);

  try {
    const headers: Record<string, string> = {};
    if (finalApiUrl.includes('api.scripture.api.bible') || finalApiUrl.includes('rest.api.bible')) {
      headers['api-key'] = BIBLE_API_KEY;
    } else {
      headers['Authorization'] = `Bearer ${BIBLE_API_KEY}`;
    }

    const response = await axios.get(url, {
      headers,
      timeout: 30000
    });

    console.log(`✅ API-Antwort erhalten: ${response.status}`);
    console.log(`   Anzahl Bibeln: ${response.data?.data?.length || 'unbekannt'}\n`);

    const bibles = response.data?.data || [];
    
    // Filtere deutsche Übersetzungen
    const germanBibles = bibles.filter((bible: any) => {
      const language = bible.language?.name?.toLowerCase() || '';
      const languageId = bible.language?.id?.toLowerCase() || '';
      return language.includes('german') || 
             language.includes('deutsch') || 
             languageId === 'deu' ||
             languageId === 'de';
    });

    // Suche auch in ALLEN Bibeln nach "Neues Leben" (unabhängig von Sprache)
    const allNeuesLeben = bibles.filter((bible: any) => {
      const name = bible.name?.toLowerCase() || '';
      const abbreviation = bible.abbreviation?.toLowerCase() || '';
      const description = bible.description?.toLowerCase() || '';
      return name.includes('neues leben') || 
             name.includes('neue leben') ||
             name.includes('neues leben') ||
             abbreviation.includes('nl') ||
             description.includes('neues leben') ||
             description.includes('neue leben');
    });

    console.log(`📚 Gefundene deutsche Übersetzungen: ${germanBibles.length}\n`);

    // Suche speziell nach "Neues Leben" in deutschen Übersetzungen
    const neuesLebenGerman = germanBibles.filter((bible: any) => {
      const name = bible.name?.toLowerCase() || '';
      const abbreviation = bible.abbreviation?.toLowerCase() || '';
      const description = bible.description?.toLowerCase() || '';
      return name.includes('neues leben') || 
             name.includes('neue leben') ||
             abbreviation.includes('nl') ||
             description.includes('neues leben');
    });

    if (neuesLebenGerman.length > 0) {
      console.log('🎯 "Neues Leben" Übersetzung(en) in deutschen Bibeln gefunden:');
      neuesLebenGerman.forEach((bible: any) => {
        console.log(`\n   Name: ${bible.name}`);
        console.log(`   Abkürzung: ${bible.abbreviation || 'N/A'}`);
        console.log(`   ID: ${bible.id}`);
        console.log(`   Sprache: ${bible.language?.name || 'N/A'}`);
        console.log(`   Beschreibung: ${bible.description?.substring(0, 100) || 'N/A'}...`);
      });
      console.log('\n');
    } else {
      console.log('⚠️ "Neues Leben" Übersetzung nicht in deutschen Bibeln gefunden');
    }

    // Zeige auch Ergebnisse aus allen Sprachen
    if (allNeuesLeben.length > 0 && allNeuesLeben.length !== neuesLebenGerman.length) {
      console.log('🌍 "Neues Leben" Übersetzung(en) in anderen Sprachen gefunden:');
      allNeuesLeben.forEach((bible: any) => {
        if (!neuesLebenGerman.find((b: any) => b.id === bible.id)) {
          console.log(`\n   Name: ${bible.name}`);
          console.log(`   Abkürzung: ${bible.abbreviation || 'N/A'}`);
          console.log(`   ID: ${bible.id}`);
          console.log(`   Sprache: ${bible.language?.name || 'N/A'} (${bible.language?.id || 'N/A'})`);
          console.log(`   Beschreibung: ${bible.description?.substring(0, 100) || 'N/A'}...`);
        }
      });
      console.log('\n');
    } else if (allNeuesLeben.length === 0) {
      console.log('⚠️ "Neues Leben" Übersetzung nicht in der gesamten API gefunden\n');
    }

    // Zeige alle deutschen Übersetzungen
    console.log('📖 Alle deutschen Übersetzungen:');
    console.log('─'.repeat(80));
    
    germanBibles.forEach((bible: any, index: number) => {
      console.log(`\n${index + 1}. ${bible.name}`);
      console.log(`   Abkürzung: ${bible.abbreviation || 'N/A'}`);
      console.log(`   ID: ${bible.id}`);
      console.log(`   Sprache: ${bible.language?.name || 'N/A'} (${bible.language?.id || 'N/A'})`);
      if (bible.description) {
        console.log(`   Beschreibung: ${bible.description.substring(0, 150)}...`);
      }
      console.log(`   Copyright: ${bible.copyright || 'N/A'}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\n✅ Insgesamt ${germanBibles.length} deutsche Übersetzung(en) gefunden`);

    // Erstelle Mapping-Vorschlag
    console.log('\n📝 Vorschlag für API_BIBLE_TRANSLATION_MAP:');
    console.log('const API_BIBLE_TRANSLATION_MAP: Record<string, string> = {');
    
    // Bekannte Mappings
    const knownMappings: Record<string, string[]> = {
      'ELB': ['elberfelder', 'elb'],
      'LUT': ['luther', 'lut'],
      'HFA': ['hoffnung', 'hfa'],
      'NGÜ': ['genfer', 'ngü', 'ngu'],
      'BasisBibel': ['basis', 'basisbibel'],
      'Neues Leben': ['neues leben', 'neue leben', 'nl'],
      'SCH': ['schlachter', 'sch']
    };

    for (const [code, keywords] of Object.entries(knownMappings)) {
      const match = germanBibles.find((bible: any) => {
        const name = bible.name?.toLowerCase() || '';
        const abbreviation = bible.abbreviation?.toLowerCase() || '';
        return keywords.some(keyword => name.includes(keyword) || abbreviation.includes(keyword));
      });
      
      if (match) {
        console.log(`  '${code}': '${match.id}',  // ${match.name}`);
      }
    }
    
    console.log('};');

  } catch (error: any) {
    if (error.response) {
      console.error(`❌ API-Fehler: ${error.response.status} ${error.response.statusText}`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Response: ${JSON.stringify(error.response.data).substring(0, 500)}`);
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('\n⚠️ Authentifizierung fehlgeschlagen!');
        console.error('   Prüfe deinen BIBLE_API_KEY in der .env Datei');
      }
    } else if (error.request) {
      console.error(`❌ Netzwerk-Fehler: Keine Antwort von der API`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Fehler: ${error.message}`);
    } else {
      console.error(`❌ Fehler: ${error.message}`);
    }
    process.exit(1);
  }
}

// Führe das Script aus
async function main() {
  // Teste zuerst die konfigurierte API
  console.log('🔍 Teste konfigurierte API...\n');
  await queryYouVersionAPI();
  
  // Teste alternative APIs
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 Teste alternative YouVersion APIs...\n');
  
  for (const altApi of ALTERNATIVE_APIS) {
    if (altApi === BIBLE_API_URL) {
      continue; // Bereits getestet
    }
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📡 Teste: ${altApi}`);
    console.log('─'.repeat(80) + '\n');
    
    try {
      await queryYouVersionAPI(altApi);
    } catch (error: any) {
      console.error(`❌ Fehler bei ${altApi}: ${error.message}`);
    }
    
    // Kurze Pause zwischen API-Calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch((error) => {
  console.error('Unerwarteter Fehler:', error);
  process.exit(1);
});


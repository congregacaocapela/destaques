export const BIBLE = {
  'Antigo Testamento': {
    Gênesis: 50, Êxodo: 40, Levítico: 27, Números: 36, Deuteronômio: 34, Josué: 24,
    Juízes: 21, Rute: 4, '1 Samuel': 31, '2 Samuel': 24, '1 Reis': 22, '2 Reis': 25,
    '1 Crônicas': 29, '2 Crônicas': 36, Esdras: 10, Neemias: 13, Ester: 10, Jó: 42,
    Salmos: 150, Provérbios: 31, Eclesiastes: 12, 'Cântico de Salomão': 8, Isaías: 66,
    Jeremias: 52, Lamentações: 5, Ezequiel: 48, Daniel: 12, Oseias: 14, Joel: 3,
    Amós: 9, Obadias: 1, Jonas: 4, Miqueias: 7, Naum: 3, Habacuque: 3, Sofonias: 3,
    Ageu: 2, Zacarias: 14, Malaquias: 4,
  },
  'Novo Testamento': {
    Mateus: 28, Marcos: 16, Lucas: 24, João: 21, Atos: 28, Romanos: 16,
    '1 Coríntios': 16, '2 Coríntios': 13, Gálatas: 6, Efésios: 6, Filipenses: 4,
    Colossenses: 4, '1 Tessalonicenses': 5, '2 Tessalonicenses': 3, '1 Timóteo': 6,
    '2 Timóteo': 4, Tito: 3, Filemom: 1, Hebreus: 13, Tiago: 5, '1 Pedro': 5,
    '2 Pedro': 3, '1 João': 5, '2 João': 1, '3 João': 1, Judas: 1, Apocalipse: 22,
  },
};

export const ALL_BOOKS = Object.values(BIBLE).flatMap((testament) => Object.keys(testament));
export const CHAPTER_COUNTS = Object.assign({}, ...Object.values(BIBLE));
export const TOTAL_CHAPTERS = Object.values(CHAPTER_COUNTS).reduce((sum, count) => sum + count, 0);

export const SPEECH_TYPES = [
  'Assembleia', 'Congresso', 'Especiais', 'Familia de Betel', 'Servos Ministeriais',
  '5 ou 10min', 'Publicos', 'Extras', 'Necessidades Locais', 'Pré assembleia',
];

export const STUDY_TABS = [
  ['inicio', 'Início', 'home'], ['livros', 'Joias', 'book'], ['pesquisas', 'Pesquisas', 'file'],
  ['adicionar', 'Adicionar', 'plus'], ['buscar', 'Buscar', 'search'],
];

export const SPEECH_TABS = [
  ['discursos', 'Discursos', 'folder'], ['adicionar', 'Adicionar', 'plus'], ['buscar', 'Buscar', 'search'],
];

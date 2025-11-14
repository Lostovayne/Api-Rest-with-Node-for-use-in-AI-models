import { logger as mainLogger } from "../../api/middlewares/logger";
import pool from "../../db";
import { generateImageFromGroq } from "../../services/grokService";

const taskLogger = mainLogger.child({ context: "GenerateImagesTask" });

interface TaskPayload {
  studyPathId: number;
}

interface ModuleRecord {
  id: number;
  study_path_id: number;
  title: string;
  description: string;
  subtopics: string[] | null;
  image_url: string | null;
  topic: string | null;
}

type ClassificationType =
  | "game-character"
  | "game-map"
  | "game-item"
  | "game-generic"
  | "programming-language"
  | "concept"
  | "fallback";

interface ClassificationResult {
  detail: string;
  classification: ClassificationType;
}

interface ProgrammingLanguageDefinition {
  name: string;
  keywords: string[];
}

interface ConceptMapping {
  keywords: string[];
  metaphor: string;
}

interface GameDefinition {
  name: string;
  keywords: string[];
}

const CHARACTER_KEYWORDS = [
  "campeon",
  "campeona",
  "champion",
  "personaje",
  "character",
  "agente",
  "agent",
  "heroe",
  "heroina",
  "hero",
  "avatar",
];

const CHARACTER_EXTRACTION_KEYWORDS = [
  "Campeon",
  "Campeona",
  "Champion",
  "Personaje",
  "Character",
  "Agente",
  "Agent",
  "Heroe",
  "Heroina",
  "Hero",
  "Avatar",
];

const MAP_KEYWORDS = ["mapa", "escenario", "arena", "nivel", "map"];
const MAP_EXTRACTION_KEYWORDS = ["Mapa", "Escenario", "Arena", "Nivel", "Map"];

const ITEM_KEYWORDS = ["objeto", "item", "arma", "artefacto", "equipo", "herramienta"];
const ITEM_EXTRACTION_KEYWORDS = [
  "Objeto",
  "Item",
  "Arma",
  "Artefacto",
  "Equipo",
  "Herramienta",
];

const PROGRAMMING_LANGUAGES: ProgrammingLanguageDefinition[] = [
  { name: "Python", keywords: ["python"] },
  { name: "JavaScript", keywords: ["javascript", "js"] },
  { name: "TypeScript", keywords: ["typescript", "ts"] },
  { name: "Java", keywords: ["java"] },
  { name: "C#", keywords: ["c#", "c sharp", "csharp"] },
  { name: "C++", keywords: ["c++", "c plus plus"] },
  { name: "Go", keywords: ["go", "golang"] },
  { name: "Rust", keywords: ["rust"] },
  { name: "Ruby", keywords: ["ruby"] },
  { name: "PHP", keywords: ["php"] },
  { name: "Swift", keywords: ["swift"] },
  { name: "Kotlin", keywords: ["kotlin"] },
  { name: "SQL", keywords: ["sql"] },
  { name: "HTML", keywords: ["html"] },
  { name: "CSS", keywords: ["css"] },
];

const CONCEPT_MAPPINGS: ConceptMapping[] = [
  {
    keywords: ["algoritmo", "algorithm"],
    metaphor:
      "un adorable buho chibi con gafas sujetando un pequeno lapiz mientras bloques numerados pastel flotan a su alrededor, todos suspendidos en el aire",
  },
  {
    keywords: [
      "estructura de datos",
      "estructuras de datos",
      "data structure",
      "data structures",
    ],
    metaphor:
      "bloques modulares apilados con caritas sonrientes y conectores suaves en colores pastel, configurados como una torre flotante",
  },
  {
    keywords: ["base de datos", "bases de datos", "database"],
    metaphor:
      "contenedores cilindricos pastel apilados como servidores chibi, con etiquetas felices y luces suaves flotando juntos",
  },
  {
    keywords: [
      "matematicas",
      "matematico",
      "calculo",
      "algebra",
      "geometria",
      "estadistica",
    ],
    metaphor:
      "una calculadora chibi rodeada de simbolos matematicos pastel flotando en el aire con brillo sutil",
  },
  {
    keywords: [
      "seguridad",
      "ciberseguridad",
      "cybersecurity",
      "criptografia",
      "encriptacion",
    ],
    metaphor:
      "un escudo vinilo con rostro simpatico sujetando un candado brillante, flotando con destellos suaves",
  },
  {
    keywords: [
      "machine learning",
      "aprendizaje automatico",
      "inteligencia artificial",
      "ia",
      "deep learning",
    ],
    metaphor:
      "un robotito chibi analizando graficas holograficas con particulas de datos pastel flotando a su alrededor",
  },
  {
    keywords: ["redes neuronales", "neural networks"],
    metaphor:
      "una nube vinilo con carita feliz conectada a nodos brillantes en forma de red flotante",
  },
  {
    keywords: ["cloud", "nube", "cloud computing", "computacion en la nube"],
    metaphor:
      "nube esponjosa con ojos brillantes sosteniendo pequenos servidores chibi, todo flotando con destellos",
  },
  {
    keywords: ["project management", "gestion de proyectos", "scrum", "kanban", "agile"],
    metaphor:
      "una libreta adorable con post-its pastel y reloj sonriente, acompanados de lapices chibi flotando cerca",
  },
];

const GAME_DEFINITIONS: GameDefinition[] = [
  { name: "League of Legends", keywords: ["league of legends", "lol"] },
  { name: "Valorant", keywords: ["valorant"] },
  { name: "Minecraft", keywords: ["minecraft"] },
  { name: "Fortnite", keywords: ["fortnite"] },
  { name: "Overwatch", keywords: ["overwatch"] },
  { name: "Genshin Impact", keywords: ["genshin impact", "genshin"] },
  { name: "Roblox", keywords: ["roblox"] },
  { name: "Call of Duty", keywords: ["call of duty", "cod"] },
  { name: "Apex Legends", keywords: ["apex legends", "apex"] },
];

const FALLBACK_DETAIL =
  "un adorable libro de estudio abierto estilo vinilo chibi, con un lapiz pastel y una bombilla brillante emergiendo, aislado sin plataforma";

const buildPromptFromDetail = (detail: string) =>
  `Diseno de icono animado 3D de alta calidad, estilo tierno y agradable tipo figura vinilo chibi. El elemento central representa ${detail} y aparece aislado, sin elementos extra, sin plataforma ni escenario. Los colores son suaves, pasteles y vibrantes, con bordes ligeramente redondeados, reflejos pulidos y una textura vinilo premium. Solo se permite una sombra extremadamente suave pegada al personaje para dar profundidad. El fondo debe ser completamente blanco puro (#FFFFFF) como si fuera un PNG sobre fondo blanco, sin degradados ni decoraciones.`;

const FALLBACK_PROMPT = buildPromptFromDetail(FALLBACK_DETAIL);

const normalizeText = (value: string | null | undefined) =>
  value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSubtopics = (module: ModuleRecord) => {
  if (Array.isArray(module.subtopics)) {
    return module.subtopics;
  }
  if (!module.subtopics) {
    return [];
  }
  if (typeof module.subtopics === "string") {
    return [module.subtopics];
  }
  return [];
};

const buildNormalizedCorpus = (module: ModuleRecord) => {
  const subtopics = getSubtopics(module);
  const parts = [module.title, module.description, module.topic, subtopics.join(" ")];
  return parts
    .filter((part): part is string => Boolean(part))
    .map((part) => normalizeText(part))
    .join(" ");
};

const cleanSubjectName = (subject: string, gameName: string) => {
  const pattern = new RegExp(`\\b${escapeRegExp(gameName)}\\b`, "i");
  return subject.replace(pattern, "").replace(/\s+/g, " ").trim();
};

const detectProgrammingLanguage = (
  normalizedCorpus: string
): ClassificationResult | null => {
  for (const language of PROGRAMMING_LANGUAGES) {
    if (language.keywords.some((keyword) => normalizedCorpus.includes(keyword))) {
      return {
        classification: "programming-language",
        detail: `El logo oficial de ${language.name}, extruido como figura vinilo chibi flotante en tonos pastel, con destellos suaves y pequenos simbolos de codigo alrededor.`,
      };
    }
  }
  return null;
};

const detectGame = (
  module: ModuleRecord,
  normalizedCorpus: string
): ClassificationResult | null => {
  for (const game of GAME_DEFINITIONS) {
    if (!game.keywords.some((keyword) => normalizedCorpus.includes(keyword))) {
      continue;
    }

    const hasCharacter = CHARACTER_KEYWORDS.some((keyword) =>
      normalizedCorpus.includes(keyword)
    );
    const hasMap = MAP_KEYWORDS.some((keyword) => normalizedCorpus.includes(keyword));
    const hasItem = ITEM_KEYWORDS.some((keyword) => normalizedCorpus.includes(keyword));

    if (hasCharacter) {
      const subjectRaw =
        extractSubjectFromTitle(module.title, CHARACTER_EXTRACTION_KEYWORDS) ||
        module.title;
      const subject = cleanSubjectName(subjectRaw, game.name) || module.title;
      return {
        classification: "game-character",
        detail: `El personaje ${subject} de ${game.name}, representado como figura chibi vinilo 3D con cabeza grande y ojos brillantes, en pose amigable sosteniendo su arma iconica pastel, flotando sobre el fondo blanco.`,
      };
    }

    if (hasMap) {
      const subjectRaw =
        extractSubjectFromTitle(module.title, MAP_EXTRACTION_KEYWORDS) || module.title;
      const subject = cleanSubjectName(subjectRaw, game.name) || module.title;
      return {
        classification: "game-map",
        detail: `Un mini diorama isometrico flotante del mapa ${subject} de ${game.name}, con caminos suaves, torres chibi y naturaleza pastel con brillo delicado.`,
      };
    }

    if (hasItem) {
      const subjectRaw =
        extractSubjectFromTitle(module.title, ITEM_EXTRACTION_KEYWORDS) || module.title;
      const subject = cleanSubjectName(subjectRaw, game.name) || module.title;
      return {
        classification: "game-item",
        detail: `Una figura vinilo chibi del objeto ${subject} de ${game.name}, con ojos grandes brillantes y detalles heroicos en tonos pastel, flotando sin plataforma.`,
      };
    }

    return {
      classification: "game-generic",
      detail: `Un simbolo iconico de ${game.name} convertido en pieza coleccionable chibi de vinilo, con formas suaves, gradientes pastel y halo luminoso flotante.`,
    };
  }

  return null;
};

const detectConcept = (
  module: ModuleRecord,
  normalizedCorpus: string
): ClassificationResult | null => {
  for (const concept of CONCEPT_MAPPINGS) {
    if (concept.keywords.some((keyword) => normalizedCorpus.includes(keyword))) {
      const subject = module.title || module.topic || "el concepto";
      return {
        classification: "concept",
        detail: `Una figura vinilo chibi de ${subject}, representada por ${concept.metaphor}.`,
      };
    }
  }

  return null;
};

const buildDetailedDescription = (module: ModuleRecord): ClassificationResult => {
  const normalizedCorpus = buildNormalizedCorpus(module);

  const programming = detectProgrammingLanguage(normalizedCorpus);
  if (programming) {
    return programming;
  }

  const game = detectGame(module, normalizedCorpus);
  if (game) {
    return game;
  }

  const concept = detectConcept(module, normalizedCorpus);
  if (concept) {
    return concept;
  }

  return {
    classification: "fallback",
    detail: FALLBACK_DETAIL,
  };
};

const buildPromptForModule = (
  module: ModuleRecord
): ClassificationResult & { prompt: string } => {
  const result = buildDetailedDescription(module);
  if (result.classification === "fallback") {
    return { ...result, prompt: FALLBACK_PROMPT };
  }
  return { ...result, prompt: buildPromptFromDetail(result.detail) };
};

export const handleGenerateImages = async (payload: TaskPayload) => {
  const { studyPathId } = payload;
  taskLogger.info({ studyPathId }, `Processing task: Generate images for study path`);

  const client = await pool.connect();
  try {
    taskLogger.info({ studyPathId }, "Fetching modules for image generation.");
    const modulesResult = await client.query(
      `SELECT m.*, sp.topic
       FROM study_path_modules m
       INNER JOIN study_paths sp ON sp.id = m.study_path_id
       WHERE m.study_path_id = $1`,
      [studyPathId]
    );
    const modules = modulesResult.rows;
    taskLogger.info(
      { studyPathId, moduleCount: modules.length },
      `Found ${modules.length} modules.`
    );

    for (const module of modules) {
      if (!module.image_url) {
        const moduleRecord = module as ModuleRecord;
        const { prompt: imagePrompt, classification } =
          buildPromptForModule(moduleRecord);
        const promptPreview = `${imagePrompt.slice(0, 120)}${
          imagePrompt.length > 120 ? "..." : ""
        }`;
        taskLogger.info(
          { moduleId: module.id, classification, promptPreview },
          `Generating image for module: "${module.title}"`
        );

        try {
          const imageUrl = await generateImageFromGroq(imagePrompt);
          taskLogger.info(
            { moduleId: module.id, imageUrl },
            "Image generated successfully."
          );

          await client.query(
            "UPDATE study_path_modules SET image_url = $1 WHERE id = $2",
            [imageUrl, module.id]
          );
          taskLogger.info(
            { moduleId: module.id },
            "Database updated with new image URL."
          );
        } catch (e) {
          taskLogger.error(
            { err: e, moduleId: module.id },
            `Failed to generate or save image for module.`
          );
          // Continue to the next module even if one fails
        }
      } else {
        taskLogger.info(
          { moduleId: module.id },
          `Image for module "${module.title}" already exists. Skipping.`
        );
      }
    }
    taskLogger.info({ studyPathId }, "Finished image generation task for study path.");
  } catch (error) {
    taskLogger.error(
      { err: error, studyPathId },
      `Failed to process image generation task.`
    );
    throw error; // Rethrow to let the consumer know the task failed
  } finally {
    client.release();
  }
};

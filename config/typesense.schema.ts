import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const studyModulesSchema: CollectionCreateSchema = {
  name: 'study_modules',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'study_path_id', type: 'int32' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'subtopics', type: 'string[]' },
    { name: 'image_url', type: 'string', optional: true },
  ],
  default_sorting_field: 'study_path_id',
};
import { defineConfig } from 'orval';

export default defineConfig({
  humanwrites: {
    input: {
      target: '../schema/openapi.yaml',
    },
    output: {
      target: './packages/api-client/src/generated/endpoints.ts',
      schemas: './packages/api-client/src/generated/models',
      client: 'react-query',
      mode: 'tags-split',
      prettier: true,
      override: {
        mutator: {
          path: './packages/api-client/src/axios-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3003'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready in',
      startServerReadyTimeout: 10000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'categories:pwa': ['error', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

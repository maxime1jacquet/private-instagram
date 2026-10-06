/// <reference path="../pb_data/types.d.ts" />

// Specific PocketBase API routes take precedence over this catch-all.
// Keep unknown API URLs out of the public directory's SPA fallback.
routerAdd("GET", "/api/{path...}", () => {
    throw new NotFoundError("API endpoint not found.");
});

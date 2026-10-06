/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    users.manageRule = null;
    users.passwordAuth.enabled = true;
    users.passwordAuth.identityFields = ["email"];
    users.fields.getByName("password").min = 10;
    app.save(users);
    const settings = app.settings();
    settings.meta.appName = "PocketBase Angular Starter";
    settings.rateLimits.enabled = true;
    app.save(settings);
});
// Forward-only: reverting auth rules could expose user records.

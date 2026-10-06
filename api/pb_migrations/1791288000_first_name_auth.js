/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.getByName("name").required = true;
    users.addIndex("idx_users_name_identity", true, "name COLLATE NOCASE", "name != ''");
    users.passwordAuth.enabled = true;
    users.passwordAuth.identityFields = ["name"];
    app.save(users);
});
// Forward-only: existing accounts keep their names, emails and passwords.
// Empty legacy names are excluded from the index and must be filled in before login.

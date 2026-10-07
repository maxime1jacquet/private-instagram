/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users.fields.getByName("comment")) return;
  // The dashboard's superuser can grant this right; users cannot grant it to themselves.
  const createRule = users.createRule == null ? null : String(users.createRule);
  const updateRule = users.updateRule == null ? null : String(users.updateRule);
  if (createRule !== null) {
    const existing = createRule ? "(" + createRule + ") && " : "";
    users.createRule = existing + '(@request.body.comment:isset = false || @request.body.comment = false)';
  }
  if (updateRule !== null) {
    const existing = updateRule ? "(" + updateRule + ") && " : "";
    users.updateRule = existing + '@request.body.comment:changed = false';
  }
  app.save(users);
});

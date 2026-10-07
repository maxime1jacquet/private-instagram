/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let likes;
  let comments;
  try { likes = app.findCollectionByNameOrId("likes"); } catch (_) {}
  try { comments = app.findCollectionByNameOrId("comments"); } catch (_) {}
  if (likes) {
    likes.createRule = '@request.auth.collectionName = "users" && author = @request.auth.id && post != ""';
    likes.updateRule = null;
    likes.deleteRule = '@request.auth.collectionName = "users" && author = @request.auth.id';
    likes.fields.getByName("author").required = true;
    likes.fields.getByName("post").required = true;
    // Preserve historical empty records. Do not delete any existing duplicate data.
    likes.addIndex("idx_likes_post_author", true, "post, author", "post != '' AND author != ''");
    app.save(likes);
  }
  if (comments) {
    comments.createRule = '@request.auth.collectionName = "users" && @request.auth.comment = true && author = @request.auth.id && post != ""';
    comments.fields.getByName("author").required = true;
    comments.fields.getByName("post").required = true;
    comments.fields.getByName("message").required = true;
    app.save(comments);
  }
  // Expose only display names, without widening access to private user records.
  app.save(new Collection({
    name: "album_authors", type: "view", viewQuery: "SELECT id, name FROM users",
    listRule: '@request.auth.collectionName = "users"',
    viewRule: '@request.auth.collectionName = "users"',
  }));
});
// Forward-only; no existing account, post, like or comment is replaced or deleted.

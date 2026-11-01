const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    try {
      // GET /api/posts
      if (path === "/api/posts" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, slug, title, created_at FROM posts ORDER BY created_at DESC"
        ).all();
        return json(results);
      }

      // GET /api/posts/:slug
      if (path.startsWith("/api/posts/") && request.method === "GET") {
        const slug = decodeURIComponent(path.split("/")[3]);
        const post = await env.DB.prepare(
          "SELECT * FROM posts WHERE slug = ?"
        ).bind(slug).first();
        if (!post) return json({ error: "Not found" }, 404);
        return json(post);
      }

      // GET /api/comments?slug=xxx
      if (path === "/api/comments" && request.method === "GET") {
        const slug = url.searchParams.get("slug");
        if (!slug) return json({ error: "Missing slug" }, 400);
        const { results } = await env.DB.prepare(
          "SELECT * FROM comments WHERE post_slug = ? ORDER BY created_at DESC"
        ).bind(slug).all();
        return json(results);
      }

      // POST /api/comments
      if (path === "/api/comments" && request.method === "POST") {
        const { slug, author, body } = await request.json();
        if (!slug || !author?.trim() || !body?.trim()) {
          return json({ error: "Missing fields" }, 400);
        }
        await env.DB.prepare(
          "INSERT INTO comments (post_slug, author, body) VALUES (?, ?, ?)"
        ).bind(slug, author.trim(), body.trim()).run();
        return json({ ok: true }, 201);
      }

      return json({ error: "Not Found" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

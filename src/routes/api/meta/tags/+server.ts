import { json } from '@sveltejs/kit';
import { setTags } from '$lib/server/db';

export async function PATCH({ url, request }) {
  const path = decodeURIComponent(url.searchParams.get('path') ?? '');
  const { tags } = await request.json() as { tags: string[] };
  setTags(path, tags);
  return json({ ok: true });
}

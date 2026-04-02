const BUFFER_GRAPHQL_URL = 'https://api.buffer.com/graphql';
const ORGANIZATION_ID = '67dafe21c453882020852a9a';
const INSTAGRAM_CAPTION_LIMIT = 2200;

async function bufferRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.BUFFER_API;
  if (!apiKey) throw new Error('BUFFER_API env var not set');

  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok) {
    const detail = JSON.stringify(json);
    throw new Error(`Buffer API error: ${res.status} ${res.statusText} — ${detail}`);
  }
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

function truncateCaption(text: string): string {
  if (text.length <= INSTAGRAM_CAPTION_LIMIT) return text;
  return text.slice(0, INSTAGRAM_CAPTION_LIMIT - 1).trimEnd() + '\u2026';
}

export async function getInstagramChannelId(): Promise<string> {
  const data = await bufferRequest<{
    channels: { id: string; service: string; name: string }[];
  }>(`
    query GetChannels {
      channels(input: { organizationId: "${ORGANIZATION_ID}" }) {
        id
        service
        name
      }
    }
  `);

  const channel = data.channels.find((c) => c.service === 'instagram');
  if (!channel) {
    throw new Error('No Instagram channel connected in Buffer. Connect Instagram at buffer.com first.');
  }
  return channel.id;
}

export async function introspectCreatePostInput(): Promise<unknown> {
  return bufferRequest(`{
    __type(name: "CreatePostInput") {
      name
      inputFields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }`);
}

export async function scheduleVideoToInstagram(
  channelId: string,
  tweetText: string,
  videoUrl: string
): Promise<{ id: string }> {
  const data = await bufferRequest<{
    createPost: { post?: { id: string }; message?: string };
  }>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id }
        }
        ... on NotFoundError { message }
        ... on UnauthorizedError { message }
        ... on UnexpectedError { message }
        ... on RestProxyError { message }
        ... on LimitReachedError { message }
        ... on InvalidInputError { message }
      }
    }`,
    {
      input: {
        channelId,
        schedulingType: 'automatic',
        mode: 'addToQueue',
        text: truncateCaption(tweetText),
        postType: 'reel',
        assets: {
          videos: [{ url: videoUrl }],
        },
      },
    }
  );

  const result = data.createPost;
  if ('message' in result && result.message) throw new Error(result.message);
  if (!result.post) throw new Error('Unexpected response from Buffer API');
  return result.post;
}

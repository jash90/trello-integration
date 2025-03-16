export const BASE_URL = 'https://api.trello.com/1';

export async function getBoards(apiKey: string, token: string): Promise<TrelloBoard[]> {
  const response = await fetch(
    `${BASE_URL}/members/me/boards?key=${apiKey}&token=${token}`
  );
  return response.json();
}

export async function getLists(boardId: string, apiKey: string, token: string): Promise<TrelloList[]> {
  const response = await fetch(
    `${BASE_URL}/boards/${boardId}/lists?key=${apiKey}&token=${token}`
  );
  return response.json();
}

export async function getBoardMembers(boardId: string, apiKey: string, token: string): Promise<TrelloMember[]> {
  const response = await fetch(
    `${BASE_URL}/boards/${boardId}/members?key=${apiKey}&token=${token}`
  );
  return response.json();
}

export interface TrelloBoard {
  id: string;
  name: string;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idMembers: string[];
  shortUrl?: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
}
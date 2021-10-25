export interface Tag {
  id: number,
  title: string;
  order: number;
}

export interface List {
  id: number;
  title: string;
  order: number;
}

export interface Task {
  id: number;
  title: string;
  list_id: number;
  tag_ids: Array<number>;
  list: List;
  tags: Array<Tag>;
  order: number;
  review_at: string;
  remind_me_at: string;
  prioritize_at: string;
  deadline_at: string;
  completed_at: string;
  prereqs: Array<any>;
}

export interface TimeZone {
  name: string;
  value: string;
}

export interface User {
  id: number;
  nickname: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

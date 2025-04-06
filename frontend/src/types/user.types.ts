export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  avatar?: string;
}

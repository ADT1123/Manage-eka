export type UserRole = 'superadmin' | 'admin' | 'member';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  department?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName?: string;
  assignedBy: string;
  assignedByName?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  attendees: string[];
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'meeting' | 'user' | 'general';
  read: boolean;
  createdAt: Date;
}

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  upcomingMeetings: number;
  teamMembers: number;
}

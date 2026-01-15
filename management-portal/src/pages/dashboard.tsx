import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { CheckSquare, Users, Calendar, TrendingUp, Clock } from 'lucide-react';
import type { Stats } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface DashboardTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: Date | null;
  createdAt?: Date | null;
}

interface DashboardMeeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  location?: string;
  attendees?: string[];
}

export const Dashboard = () => {
  const { currentUser, userRole, userData } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    upcomingMeetings: 0,
    teamMembers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<DashboardTask[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<DashboardMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser, userRole]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      // Fetch tasks based on role
      const tasksQuery = userRole === 'member'
        ? query(collection(db, 'tasks'), where('assignedTo', '==', currentUser.uid))
        : query(collection(db, 'tasks'));
      
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
      })) as DashboardTask[];
      
      // Fetch recent tasks
      const recentTasksQuery = query(
        collection(db, 'tasks'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentTasksSnapshot = await getDocs(recentTasksQuery);
      const recentTasksData = recentTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
      })) as DashboardTask[];
      
      // Fetch meetings
      const meetingsSnapshot = await getDocs(collection(db, 'meetings'));
      const meetings = meetingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as DashboardMeeting[];
      
      // Filter upcoming meetings
      const now = new Date();
      const upcoming = meetings
        .filter(m => m.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 5);
      
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        upcomingMeetings: upcoming.length,
        teamMembers: usersSnapshot.docs.length,
      });

      setRecentTasks(recentTasksData);
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-600';
      case 'in-progress': return 'bg-blue-100 text-blue-600';
      case 'pending': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userData?.displayName}! 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your projects today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          change="+12% from last month"
          icon={CheckSquare}
          trend="up"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          change={`${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion rate`}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          icon={Calendar}
        />
        <StatCard
          title="Team Members"
          value={stats.teamMembers}
          icon={Users}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
            <a href="/tasks" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </a>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No tasks yet</p>
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <a href="/tasks" className="text-primary-600 text-sm font-medium mt-2 inline-block">
                  Create your first task
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      {task.priority && (
                        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      {task.createdAt && (
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(task.createdAt, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
            <a href="/meetings" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </a>
          </div>
          
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No upcoming meetings</p>
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <a href="/meetings" className="text-primary-600 text-sm font-medium mt-2 inline-block">
                  Schedule a meeting
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">{meeting.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {meeting.date?.toLocaleDateString()} at {meeting.date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meeting.location && (
                        <span className="truncate">📍 {meeting.location}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {(userRole === 'superadmin' || userRole === 'admin') && (
        <div className="mt-6 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/tasks"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Task</p>
                <p className="text-xs text-gray-500">Assign new task to team</p>
              </div>
            </a>
            <a
              href="/meetings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Schedule Meeting</p>
                <p className="text-xs text-gray-500">Plan team meeting</p>
              </div>
            </a>
            <a
              href="/team"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Add Team Member</p>
                <p className="text-xs text-gray-500">Invite new member</p>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createNotification, notifyAllUsers } from '../utils/notifications';
import { Plus, Calendar as CalendarIcon, MapPin, Users, Trash2, Edit2, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  attendees: string[];
  attendeesData?: Array<{uid: string, name: string, timestamp: Date}>;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export const Meetings = () => {
  const { currentUser, userRole, userData } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
  });

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, []);

  const fetchMeetings = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'meetings'));
      const meetingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Meeting[];
      
      // Sort by date (newest first)
      meetingsData.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setMeetings(meetingsData);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Failed to load meetings');
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!currentUser || !formData.title || !formData.date || !formData.time) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const meetingDateTime = new Date(`${formData.date}T${formData.time}`);
      
      await addDoc(collection(db, 'meetings'), {
        title: formData.title,
        description: formData.description,
        date: Timestamp.fromDate(meetingDateTime),
        location: formData.location,
        attendees: [],
        attendeesData: [],
        status: 'scheduled',
        createdBy: currentUser.uid,
        createdByName: userData?.displayName || '',
        createdAt: Timestamp.now(),
      });

      // Notify all users
      const allUserIds = users.map(u => u.uid);
      await notifyAllUsers(
        allUserIds,
        'New Meeting Scheduled 📅',
        `${formData.title} on ${format(meetingDateTime, 'PPP p')}`,
        'meeting'
      );

      setSuccess('Meeting scheduled successfully!');
      setShowModal(false);
      resetForm();
      fetchMeetings();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMeeting = async () => {
    if (!editingMeeting) return;

    setLoading(true);
    try {
      const meetingDateTime = new Date(`${formData.date}T${formData.time}`);
      
      await updateDoc(doc(db, 'meetings', editingMeeting.id), {
        title: formData.title,
        description: formData.description,
        date: Timestamp.fromDate(meetingDateTime),
        location: formData.location,
      });

      setSuccess('Meeting updated successfully!');
      setShowModal(false);
      setEditingMeeting(null);
      resetForm();
      fetchMeetings();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating meeting:', error);
      setError('Failed to update meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      setSuccess('Meeting deleted successfully!');
      fetchMeetings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setError('Failed to delete meeting');
    }
  };

  const handleMarkAttendance = async (meetingId: string, userId: string, userName: string) => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meeting = meetings.find(m => m.id === meetingId);
      
      if (!meeting) return;

      const attendeesData = meeting.attendeesData || [];
      const alreadyMarked = attendeesData.some((a: any) => a.uid === userId);

      if (alreadyMarked) {
        setError('Attendance already marked!');
        setTimeout(() => setError(''), 3000);
        return;
      }

      const newAttendee = {
        uid: userId,
        name: userName,
        timestamp: Timestamp.now(),
      };

      await updateDoc(meetingRef, {
        attendees: [...meeting.attendees, userId],
        attendeesData: [...attendeesData, newAttendee],
      });

      setSuccess('Attendance marked successfully!');
      fetchMeetings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('Failed to mark attendance');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
    });
  };

  const openEditModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    const date = meeting.date.toISOString().split('T')[0];
    const time = meeting.date.toTimeString().slice(0, 5);
    setFormData({
      title: meeting.title,
      description: meeting.description,
      date,
      time,
      location: meeting.location || '',
    });
    setShowModal(true);
  };

  const getStatusColor = (meeting: Meeting) => {
    if (meeting.status === 'completed') return 'bg-green-100 text-green-700';
    if (meeting.status === 'cancelled') return 'bg-red-100 text-red-700';
    if (isPast(meeting.date)) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusText = (meeting: Meeting) => {
    if (meeting.status === 'completed') return 'Completed';
    if (meeting.status === 'cancelled') return 'Cancelled';
    if (isPast(meeting.date)) return 'Missed';
    return 'Upcoming';
  };

  const canEdit = (meeting: Meeting) => {
    return userRole === 'superadmin' || 
           (userRole === 'admin' && meeting.createdBy === currentUser?.uid);
  };

  const hasMarkedAttendance = (meeting: Meeting) => {
    return meeting.attendees?.includes(currentUser?.uid || '');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600 mt-1">Schedule and manage team meetings</p>
        </div>
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Schedule Meeting
          </button>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  {meeting.title}
                </h3>
                <p className="text-sm text-gray-600">{meeting.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting)} ml-2 flex-shrink-0`}>
                {getStatusText(meeting)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span>{format(meeting.date, 'PPP')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span>{format(meeting.date, 'p')}</span>
              </div>
              {meeting.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{meeting.location}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span>{meeting.attendees?.length || 0} attendee{meeting.attendees?.length !== 1 ? 's' : ''}</span>
                </div>
                {userRole === 'superadmin' && meeting.attendees?.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedMeeting(meeting);
                      setShowAttendanceModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    View Attendance
                  </button>
                )}
              </div>
              {meeting.createdByName && (
                <div className="text-xs text-gray-500 mt-2">
                  Created by {meeting.createdByName}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
              {currentUser && !hasMarkedAttendance(meeting) && isFuture(meeting.date) && meeting.status === 'scheduled' && (
                <button
                  onClick={() => handleMarkAttendance(meeting.id, currentUser.uid, userData?.displayName || 'User')}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Attendance
                </button>
              )}
              {hasMarkedAttendance(meeting) && (
                <div className="flex-1 flex items-center justify-center px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Attendance Marked
                </div>
              )}
              {canEdit(meeting) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(meeting)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit meeting"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete meeting"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {meetings.length === 0 && (
        <div className="card text-center py-12">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No meetings scheduled</p>
          {(userRole === 'superadmin' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-primary-600 font-medium">
              Schedule your first meeting
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Team Standup, Sprint Planning, etc."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Meeting agenda and details"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Conference Room A or Zoom Link"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingMeeting(null);
                  setError('');
                  resetForm();
                }}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={editingMeeting ? handleUpdateMeeting : handleCreateMeeting}
                className="flex-1 btn-primary disabled:opacity-50"
                disabled={loading || !formData.title || !formData.date || !formData.time}
              >
                {loading ? 'Saving...' : editingMeeting ? 'Update Meeting' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal (Super Admin Only) */}
      {showAttendanceModal && selectedMeeting && userRole === 'superadmin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Attendance - {selectedMeeting.title}
            </h2>
            
            {selectedMeeting.attendeesData && selectedMeeting.attendeesData.length > 0 ? (
              <div className="space-y-3">
                {selectedMeeting.attendeesData.map((attendee: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center mr-3">
                        <span className="text-white font-semibold">
                          {attendee.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{attendee.name}</p>
                        <p className="text-xs text-gray-500">
                          {attendee.timestamp?.toDate?.().toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No attendance marked yet</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowAttendanceModal(false);
                setSelectedMeeting(null);
              }}
              className="w-full mt-6 btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  where,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createNotification } from '../utils/notifications';
import { Plus, Trash2, Edit2, CheckCircle, MessageSquare, Send } from 'lucide-react';

interface TaskNote {
  text: string;
  author: string;
  authorName: string;
  timestamp: Date;
}

interface Task {
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
  notes?: TaskNote[];
}

export const Tasks = () => {
  const { currentUser, userRole, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [noteText, setNoteText] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed',
  });

  useEffect(() => {
    fetchTasks();
    if (userRole !== 'member') {
      fetchUsers();
    }
  }, [currentUser, userRole]);

  const fetchTasks = async () => {
    if (!currentUser) return;

    try {
      const tasksQuery = userRole === 'member'
        ? query(collection(db, 'tasks'), where('assignedTo', '==', currentUser.uid))
        : query(collection(db, 'tasks'));
      
      const snapshot = await getDocs(tasksQuery);
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          notes: data.notes?.map((note: any) => ({
            ...note,
            timestamp: note.timestamp?.toDate() || new Date(),
          })) || [],
        };
      }) as Task[];
      
      tasksData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
      setTimeout(() => setError(''), 3000);
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

  const handleCreateTask = async () => {
    if (!currentUser || !formData.title || !formData.assignedTo || !formData.dueDate) {
      setError('Please fill all required fields');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const assignedUser = users.find(u => u.uid === formData.assignedTo);
      
      await addDoc(collection(db, 'tasks'), {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        assignedToName: assignedUser?.displayName || '',
        assignedBy: currentUser.uid,
        assignedByName: userData?.displayName || '',
        status: 'pending',
        priority: formData.priority,
        dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
        createdAt: Timestamp.now(),
        notes: [],
      });

      await createNotification(
        formData.assignedTo,
        'New Task Assigned 📋',
        `You have been assigned: ${formData.title}`,
        'task'
      );

      setSuccess('Task created successfully!');
      setShowModal(false);
      resetForm();
      fetchTasks();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating task:', error);
      setError('Failed to create task');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    setLoading(true);
    setError('');
    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
      };

      if (userRole !== 'member' && formData.assignedTo) {
        const assignedUser = users.find(u => u.uid === formData.assignedTo);
        updateData.assignedTo = formData.assignedTo;
        updateData.assignedToName = assignedUser?.displayName || '';
      }

      await updateDoc(doc(db, 'tasks', editingTask.id), updateData);

      setSuccess('Task updated successfully!');
      setShowModal(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setSuccess('Task deleted successfully!');
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuickStatusUpdate = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      setSuccess('Status updated!');
      fetchTasks();
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTask || !noteText.trim() || !currentUser) return;

    try {
      const newNote = {
        text: noteText.trim(),
        author: currentUser.uid,
        authorName: userData?.displayName || 'User',
        timestamp: Timestamp.now(),
      };

      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        notes: arrayUnion(newNote),
      });

      // Notify the task creator about the note
      if (selectedTask.assignedBy !== currentUser.uid) {
        await createNotification(
          selectedTask.assignedBy,
          'New Task Note 💬',
          `${userData?.displayName} added a note to: ${selectedTask.title}`,
          'task'
        );
      }

      // Notify the assigned person if note is from task creator
      if (selectedTask.assignedTo !== currentUser.uid && userRole !== 'member') {
        await createNotification(
          selectedTask.assignedTo,
          'Task Update 💬',
          `${userData?.displayName} added a note to: ${selectedTask.title}`,
          'task'
        );
      }

      setNoteText('');
      setSuccess('Note added successfully!');
      fetchTasks();
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note');
      setTimeout(() => setError(''), 2000);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      dueDate: '',
      status: 'pending',
    });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate.toISOString().split('T')[0],
      status: task.status,
    });
    setShowModal(true);
  };

  const openNotesModal = (task: Task) => {
    setSelectedTask(task);
    setShowNotesModal(true);
    setNoteText('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canEditTask = (task: Task) => {
    // Only SuperAdmin and Admin can edit task details
    return userRole === 'superadmin' || userRole === 'admin';
  };

  const canDeleteTask = (task: Task) => {
    return userRole === 'superadmin' || userRole === 'admin';
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'member' 
              ? 'View and update your assigned tasks' 
              : 'Manage and track team tasks'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {(userRole === 'superadmin' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              New Task
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex-1">{task.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} ml-2 flex-shrink-0`}>
                {task.priority}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assigned to:</span>
                <span className="font-medium text-gray-900">{task.assignedToName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assigned by:</span>
                <span className="font-medium text-gray-900">{task.assignedByName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Due date:</span>
                <span className="font-medium text-gray-900">
                  {task.dueDate.toLocaleDateString()}
                </span>
              </div>
              {task.notes && task.notes.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Notes:</span>
                  <span className="font-medium text-primary-600">{task.notes.length} message{task.notes.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              {/* Status dropdown for members on their own tasks */}
              {userRole === 'member' && task.assignedTo === currentUser?.uid ? (
                <select
                  value={task.status}
                  onChange={(e) => handleQuickStatusUpdate(task.id, e.target.value as any)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg ${getStatusColor(task.status)} border-0 cursor-pointer focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              ) : (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              )}
              
              <div className="flex items-center space-x-2">
                {/* Notes button - visible to all */}
                <button
                  onClick={() => openNotesModal(task)}
                  className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors relative"
                  title="View/Add notes"
                >
                  <MessageSquare className="h-4 w-4" />
                  {task.notes && task.notes.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {task.notes.length}
                    </span>
                  )}
                </button>
                
                {/* Edit button - only for admin/superadmin */}
                {canEditTask(task) && (
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit task"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                
                {/* Delete button - only for admin/superadmin */}
                {canDeleteTask(task) && (
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filterStatus === 'all' ? 'No tasks found' : `No ${filterStatus} tasks`}
          </p>
          {(userRole === 'superadmin' || userRole === 'admin') && filterStatus === 'all' && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-primary-600 font-medium">
              Create your first task
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter task title"
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
                  placeholder="Enter task description"
                  disabled={loading}
                />
              </div>

              {userRole !== 'member' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To *
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loading}
                  >
                    <option value="">Select a team member</option>
                    {users.map((user) => (
                      <option key={user.uid} value={user.uid}>
                        {user.displayName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loading}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {editingTask && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={loading}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                  setError('');
                  resetForm();
                }}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                className="flex-1 btn-primary disabled:opacity-50"
                disabled={loading || !formData.title || (!editingTask && !formData.assignedTo) || !formData.dueDate}
              >
                {loading ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Task Notes
            </h2>
            <p className="text-sm text-gray-600 mb-4">{selectedTask.title}</p>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-96">
              {selectedTask.notes && selectedTask.notes.length > 0 ? (
                selectedTask.notes.map((note, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      note.author === currentUser?.uid
                        ? 'bg-primary-50 ml-8'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-gray-900">
                        {note.authorName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {note.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{note.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No notes yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Add note input */}
            <div className="border-t pt-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Add a note (progress update, feedback, etc.)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="btn-primary px-4 py-2 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowNotesModal(false);
                setSelectedTask(null);
                setNoteText('');
              }}
              className="w-full mt-4 btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'task' | 'meeting' | 'user' | 'general' = 'general'
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const notifyAllUsers = async (
  userIds: string[],
  title: string,
  message: string,
  type: 'task' | 'meeting' | 'user' | 'general' = 'general'
) => {
  try {
    const promises = userIds.map(userId =>
      createNotification(userId, title, message, type)
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Error notifying users:', error);
  }
};

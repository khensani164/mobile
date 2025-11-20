// hooks/organiser/useOrgaDash.js
import API_URL from '@/config';
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import axios from 'axios';
import { useEffect, useState } from 'react';

// Define the initial state structure for clarity
const initialData = {
  stats: {
    totalEvents: { value: '0', change: { amount: '0', type: 'increase' } },
    totalAttendance: { value: '0', change: { amount: '0', type: 'increase' } },
    resourceUtilized: { value: '0%', change: { amount: '0', type: 'decrease' } },
    averageRating: { value: '0', change: { amount: '0', type: 'increase' } },
  },
  notifications: [],
};

/**
 * 🎣 Custom hook for fetching Organizer Dashboard statistics.
 */
export const useOrgaDash = () => {

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizerStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // --- 1. Token Retrieval from AsyncStorage ---
        // Use the exact key stored in handleSignin
        const token = await AsyncStorage.getItem("ORGANISER_JWT_TOKEN");

        if (!token) {
          setError(new Error("No authentication token found. Please log in again."));
          setLoading(false);
          return;
        }

        // --- 2. Fetch Stats from Backend API ---
        const statsResponse = await axios.get(
          `${API_URL}/organizer/stats/dashboard`,
          {
            headers: {
              // Attach the token to the Authorization header
              'Authorization': `Bearer ${token}`,
            }
          }
        );

        // The statsResponse.data contains: { totalEvents, totalTicketsSold, totalRevenue, upcomingEvents } 
        const backendStats = statsResponse.data;

        // --- 3. Map Backend Data to Frontend Structure ---
        const mappedStats = {

          totalEvents: {
            value: String(backendStats.totalEvents || 0),
            change: { amount: '0', type: 'increase' }
          },
          totalAttendance: {
            // Mapping totalTicketsSold from backend to totalAttendance on frontend
            value: String(backendStats.totalTicketsSold || 0),
            change: { amount: '0', type: 'increase' }
          },
          // Stats not provided by current backend service (resource, rating)
          resourceUtilized: {
            value: '0',
            change: { amount: '0', type: 'decrease' }
          },
          averageRating: {
            value: '0',
            change: { amount: '0', type: 'increase' }
          },
        };


        // --- 4. Set the state with the fetched data ---
        setData(prevData => ({
          ...prevData,
          stats: mappedStats,
        }));


      } catch (err) {
        console.error('Error fetching organizer dashboard data:', err.response?.data || err.message);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerStats();
  }, []);

  return { ...data, loading, error };
};
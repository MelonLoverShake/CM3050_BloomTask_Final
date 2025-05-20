import { supabase } from '../lib/superbase';

/**
 * Calculate the distance between two geographical coordinates in meters
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Calculate distance using Haversine formula
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; 
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a user's current location is within the proximity of stored locations
 * @param {Object} userLocation - Current user location with latitude and longitude
 * @param {string} userId - ID of the current user (optional)
 * @param {number} proximityThreshold - Threshold distance in meters
 * @returns {Promise<Array<string>>} Array of location IDs that are within the proximity threshold
 */
export const checkLocationProximity = async (userLocation, userId = null, proximityThreshold = 15) => {
  if (!userLocation || !userLocation.coords) {
    return [];
  }

  // Check if the userId is a valid UUID
  const isValidUUID = (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  };

  try {
    // Create base query
    let query = supabase
      .from('user_locations')
      .select('id, latitude, longitude, user_id, label');
    
    // Only add filter if userId is a valid UUID
    if (userId && isValidUUID(userId)) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    const nearbyLocationIds = data
      .filter(location => {
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          location.latitude,
          location.longitude
        );
        return distance <= proximityThreshold;
      })
      .map(location => location.id);
    
    return nearbyLocationIds;
  } catch (err) {
    console.error('Error checking location proximity:', err);
    return [];
  }
};

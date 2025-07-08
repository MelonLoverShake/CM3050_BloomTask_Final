import { Linking, Alert } from 'react-native';

class SpotifyDeepLinkService {
  // Hardcoded playlists for different location types
  static locationPlaylists = {
    'Home Office': {
      id: 'focus_work',
      name: 'Focus & Flow',
      description: 'Deep work and concentration music',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      image: 'https://i.scdn.co/image/ab67706f00000003ca5a7517156021292e5663a6'
    },
    'Gym': {
      id: 'workout_energy',
      name: 'Beast Mode',
      description: 'High-energy workout playlist',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP',
      deep_link: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP',
      image: 'https://i.scdn.co/image/ab67706f00000003d6038d2ac1469417e9c4d27b'
    },
    'Kitchen': {
      id: 'cooking_vibes',
      name: 'Cooking Vibes',
      description: 'Feel-good music for cooking',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XM0sGLJ6kI',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XM0sGLJ6kI',
      image: 'https://i.scdn.co/image/ab67706f00000003fe24d7084be472288cd6ee6c'
    },
    'Living Room': {
      id: 'chill_lounge',
      name: 'Chill Lounge',
      description: 'Relaxing background music',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6',
      deep_link: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6',
      image: 'https://i.scdn.co/image/ab67706f00000003c6e329c8e5c4f2ddf6d98455'
    },
    'Bedroom': {
      id: 'sleep_relax',
      name: 'Sleep & Relax',
      description: 'Peaceful music for winding down',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
      deep_link: 'spotify:playlist:37i9dQZF1DX3Ogo9pFvBkY',
      image: 'https://i.scdn.co/image/ab67706f00000003a8b6e3d2fe4e4a0e7f4f5b29'
    },
    'Car': {
      id: 'road_trip',
      name: 'Road Trip Hits',
      description: 'Perfect driving playlist',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM',
      image: 'https://i.scdn.co/image/ab67706f00000003c13d3c2e7c6b0f4a1e3b2d8f'
    },
    'Coffee Shop': {
      id: 'coffee_acoustic',
      name: 'Coffee Shop Acoustic',
      description: 'Mellow acoustic vibes',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM',
      image: 'https://i.scdn.co/image/ab67706f00000003b8b5d2e7c4b3f6a9e2d1c5f8'
    },
    'Park': {
      id: 'outdoor_chill',
      name: 'Outdoor Chill',
      description: 'Nature-inspired relaxing music',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX6ziVCJnEm59',
      deep_link: 'spotify:playlist:37i9dQZF1DX6ziVCJnEm59',
      image: 'https://i.scdn.co/image/ab67706f00000003d7e2c5f8b4a6e1d9c3f7a2b8'
    }
  };

  // Additional curated playlists for specific moods/activities
  static activityPlaylists = {
    'Study': {
      id: 'study_focus',
      name: 'Deep Focus',
      description: 'Instrumental music for studying',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6',
      deep_link: 'spotify:playlist:37i9dQZF1DX8NTLI2TtZa6',
      image: 'https://i.scdn.co/image/ab67706f00000003c6e329c8e5c4f2ddf6d98455'
    },
    'Cleaning': {
      id: 'cleaning_energy',
      name: 'Cleaning Power Hour',
      description: 'Upbeat music for cleaning',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM',
      image: 'https://i.scdn.co/image/ab67706f00000003fe24d7084be472288cd6ee6c'
    },
    'Morning': {
      id: 'morning_motivation',
      name: 'Morning Motivation',
      description: 'Start your day right',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
      deep_link: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM',
      image: 'https://i.scdn.co/image/ab67706f00000003ca5a7517156021292e5663a6'
    },
    'Evening': {
      id: 'evening_wind_down',
      name: 'Evening Wind Down',
      description: 'Relaxing evening music',
      spotify_url: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
      deep_link: 'spotify:playlist:37i9dQZF1DX3Ogo9pFvBkY',
      image: 'https://i.scdn.co/image/ab67706f00000003a8b6e3d2fe4e4a0e7f4f5b29'
    }
  };

  // Get suggested playlist based on location
  static getPlaylistForLocation(locationLabel) {
    const normalizedLocation = locationLabel.toLowerCase();
    
    // Direct match
    if (this.locationPlaylists[locationLabel]) {
      return this.locationPlaylists[locationLabel];
    }
    
    // Fuzzy matching for common keywords
    const locationKeywords = {
      'office': this.locationPlaylists['Home Office'],
      'work': this.locationPlaylists['Home Office'],
      'gym': this.locationPlaylists['Gym'],
      'workout': this.locationPlaylists['Gym'],
      'kitchen': this.locationPlaylists['Kitchen'],
      'living': this.locationPlaylists['Living Room'],
      'bedroom': this.locationPlaylists['Bedroom'],
      'car': this.locationPlaylists['Car'],
      'coffee': this.locationPlaylists['Coffee Shop'],
      'cafe': this.locationPlaylists['Coffee Shop'],
      'park': this.locationPlaylists['Park'],
      'outdoor': this.locationPlaylists['Park']
    };

    for (const [keyword, playlist] of Object.entries(locationKeywords)) {
      if (normalizedLocation.includes(keyword)) {
        return playlist;
      }
    }

    // Default fallback
    return this.locationPlaylists['Living Room'];
  }

  // Get all available playlists (location + activity)
  static getAllPlaylists() {
    return [
      ...Object.values(this.locationPlaylists),
      ...Object.values(this.activityPlaylists)
    ];
  }

  // Open playlist in Spotify app
  static async openPlaylist(playlist) {
    try {
      const canOpenSpotify = await Linking.canOpenURL(playlist.deep_link);
      
      if (canOpenSpotify) {
        await Linking.openURL(playlist.deep_link);
      } else {
        // Fallback to web version if app is not installed
        Alert.alert(
          'Spotify Not Found',
          'Spotify app is not installed. Open in browser?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open in Browser', onPress: () => Linking.openURL(playlist.spotify_url) }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening Spotify:', error);
      Alert.alert('Error', 'Failed to open Spotify playlist');
    }
  }

  // Check if Spotify is installed
  static async isSpotifyInstalled() {
    try {
      return await Linking.canOpenURL('spotify:');
    } catch (error) {
      return false;
    }
  }
}

export default SpotifyDeepLinkService;


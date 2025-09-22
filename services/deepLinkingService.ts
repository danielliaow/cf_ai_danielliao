import { Linking, Alert } from 'react-native';

export interface DeepLinkAction {
  name: string;
  description: string;
  keywords: string[];
  execute: (query: string) => Promise<boolean>;
}


export class DeepLinkingService {
  private static actions: DeepLinkAction[] = [
    // Phone & Contacts
    // {
    //   name: 'Make Phone Call',
    //   description: 'Make a phone call to a contact or number',
    //   keywords: ['call', 'phone', 'dial', 'ring'],
    //   execute: async (query: string) => {
    //     const phoneMatch = query.match(/(\+?\d[\d\s\-()]+)/);
    //     const phoneNumber = phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : null;
        
    //     if (phoneNumber) {
    //       const url = `tel:${phoneNumber}`;
    //       const canOpen = await Linking.canOpenURL(url);
    //       if (canOpen) {
    //         await Linking.openURL(url);
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },
    // {
    //   name: 'Open Contacts',
    //   description: 'Open the contacts app',
    //   keywords: ['contacts', 'phonebook', 'address book'],
    //   execute: async (query: string) => {
    //     try {
    //       await Linking.openURL('contacts://');
    //       return true;
    //     } catch {
    //       // Fallback for different platforms
    //       try {
    //         await Linking.openURL('contact://');
    //         return true;
    //       } catch {
    //         return false;
    //       }
    //     }
    //   }
    // },
    
    // // Amazon Shopping
    {
      name: 'Amazon Search',
      description: 'Search for products on Amazon',
      keywords: ['amazon'],
      execute: async (query: string) => {
        // Extract search terms
        const searchMatch = query.match(/(?:amazon|shop|buy|purchase|order)\s+(.+?)(?:\s+under\s+|\s+below\s+|\s*$)/i);
        let searchTerm = searchMatch ? searchMatch[1] : '';
        
        // Extract price if mentioned
        const priceMatch = query.match(/under\s+(?:\$|₹|rs\.?\s*)?(\d+(?:k|,?\d{3})*)/i);
        if (priceMatch) {
          const price = priceMatch[1].replace(/k$/i, '000').replace(/,/g, '');
          searchTerm += ` under ${price}`;
        }
        
        if (!searchTerm.trim()) {
          // If no specific search term, extract from context
          const contextMatch = query.match(/show\s+me\s+(.+)|find\s+(.+)|(.+)\s+on\s+amazon/i);
          searchTerm = contextMatch ? (contextMatch[1] || contextMatch[2] || contextMatch[3]) : 'products';
        }
        
        const encodedSearch = encodeURIComponent(searchTerm.trim());
        const amazonUrl = `https://www.amazon.com/s?k=${encodedSearch}`;
        
        const canOpen = await Linking.canOpenURL(amazonUrl);
        if (canOpen) {
          await Linking.openURL(amazonUrl);
          return true;
        }
        return false;
      }
    },
    
    // // Spotify Music
    {
      name: 'Spotify Play',
      description: 'Play music on Spotify',
      keywords: ['spotify'],
      execute: async (query: string) => {
        // Extract song/artist name
        const musicMatch = query.match(/(?:play|song|music)\s+(.+?)(?:\s+on\s+spotify|\s*$)/i);
        let searchTerm = musicMatch ? musicMatch[1] : '';
        
        if (!searchTerm.trim()) {
          // Try different patterns
          const altMatch = query.match(/spotify\s+(.+)/i);
          searchTerm = altMatch ? altMatch[1] : 'music';
        }
        
        const encodedSearch = encodeURIComponent(searchTerm.trim());
        
        // Try to open in Spotify app first
        const spotifyAppUrl = `spotify:search:${encodedSearch}`;
        try {
          const canOpenApp = await Linking.canOpenURL(spotifyAppUrl);
          if (canOpenApp) {
            await Linking.openURL(spotifyAppUrl);
            return true;
          }
        } catch (error) {
          console.log('Spotify app not available, trying web version');
        }
        
        // Fallback to web version
        const spotifyWebUrl = `https://open.spotify.com/search/${encodedSearch}`;
        const canOpenWeb = await Linking.canOpenURL(spotifyWebUrl);
        if (canOpenWeb) {
          await Linking.openURL(spotifyWebUrl);
          return true;
        }
        
        return false;
      }
    },
    
    // // Maps & Navigation
    // {
    //   name: 'Open Maps',
    //   description: 'Open maps and navigate to a location',
    //   keywords: ['maps', 'navigate', 'directions', 'location', 'go to'],
    //   execute: async (query: string) => {
    //     const locationMatch = query.match(/(?:maps|navigate|directions|go to)\s+(.+)/i);
    //     const location = locationMatch ? locationMatch[1] : '';
        
    //     if (location.trim()) {
    //       const encodedLocation = encodeURIComponent(location.trim());
    //       const mapsUrl = `https://maps.google.com/maps?q=${encodedLocation}`;
          
    //       const canOpen = await Linking.canOpenURL(mapsUrl);
    //       if (canOpen) {
    //         await Linking.openURL(mapsUrl);
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },
    
    // // YouTube
    {
      name: 'YouTube Search',
      description: 'Search for videos on YouTube',
      keywords: ['youtube'],
      execute: async (query: string) => {
        const videoMatch = query.match(/(?:youtube|video|watch|tutorial)\s+(.+)/i);
        let searchTerm = videoMatch ? videoMatch[1] : '';
        
        if (!searchTerm.trim()) {
          searchTerm = 'videos';
        }
        
        const encodedSearch = encodeURIComponent(searchTerm.trim());
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedSearch}`;
        
        const canOpen = await Linking.canOpenURL(youtubeUrl);
        if (canOpen) {
          await Linking.openURL(youtubeUrl);
          return true;
        }
        return false;
      }
    },
    
    // // Messages
    // {
    //   name: 'Send Message',
    //   description: 'Send a text message',
    //   keywords: ['message', 'text', 'sms', 'send'],
    //   execute: async (query: string) => {
    //     const phoneMatch = query.match(/(?:message|text|sms)\s+(\+?\d[\d\s\-()]+)/);
    //     const phoneNumber = phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : null;
        
    //     if (phoneNumber) {
    //       const url = `sms:${phoneNumber}`;
    //       const canOpen = await Linking.canOpenURL(url);
    //       if (canOpen) {
    //         await Linking.openURL(url);
    //         return true;
    //       }
    //     } else {
    //       // Open messages app without specific number
    //       try {
    //         await Linking.openURL('sms:');
    //         return true;
    //       } catch {
    //         return false;
    //       }
    //     }
    //     return false;
    //   }
    // },
    
    // // Email
   
    
    // // Settings
    // {
    //   name: 'Open Settings',
    //   description: 'Open device settings',
    //   keywords: ['settings', 'preferences', 'config'],
    //   execute: async (query: string) => {
    //     try {
    //       await Linking.openSettings();
    //       return true;
    //     } catch {
    //       return false;
    //     }
    //   }
    // },

    // // Social Media - Instagram
    // {
    //   name: 'Open Instagram',
    //   description: 'Open Instagram app or search for users/hashtags',
    //   keywords: ['instagram'],
    //   execute: async (query: string) => {
    //     const userMatch = query.match(/(?:instagram|insta|ig)\s+(.+)/i);
    //     const searchTerm = userMatch ? userMatch[1].trim() : '';
        
    //     if (searchTerm) {
    //       // Try to open specific user profile or hashtag
    //       const isHashtag = searchTerm.startsWith('#');
    //       const cleanTerm = searchTerm.replace(/[@#]/g, '');
    //       const encodedTerm = encodeURIComponent(cleanTerm);
          
    //       const instagramUrl = isHashtag 
    //         ? `https://www.instagram.com/explore/tags/${encodedTerm}/`
    //         : `https://www.instagram.com/${encodedTerm}/`;
          
    //       const canOpen = await Linking.canOpenURL(instagramUrl);
    //       if (canOpen) {
    //         await Linking.openURL(instagramUrl);
    //         return true;
    //       }
    //     } else {
    //       // Just open Instagram
    //       try {
    //         await Linking.openURL('instagram://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://instagram.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Social Media - Twitter/X
    {
      name: 'Open Twitter/X',
      description: 'Open Twitter/X app or search for users/topics',
      keywords: ['twitter', 'tweet', 'x.com'],
      execute: async (query: string) => {
        const userMatch = query.match(/(?:twitter|tweet|x)\s+(.+)/i);
        const searchTerm = userMatch ? userMatch[1].trim() : '';
        
        if (searchTerm) {
          const isUser = searchTerm.startsWith('@');
          const cleanTerm = searchTerm.replace(/@/g, '');
          const encodedTerm = encodeURIComponent(cleanTerm);
          
          const twitterUrl = isUser 
            ? `https://twitter.com/${encodedTerm}`
            : `https://twitter.com/search?q=${encodedTerm}`;
          
          const canOpen = await Linking.canOpenURL(twitterUrl);
          if (canOpen) {
            await Linking.openURL(twitterUrl);
            return true;
          }
        } else {
          try {
            await Linking.openURL('twitter://');
            return true;
          } catch {
            await Linking.openURL('https://twitter.com');
            return true;
          }
        }
        return false;
      }
    },

    // // Social Media - WhatsApp
    {
      name: 'Open WhatsApp',
      description: 'Open WhatsApp or send message to contact',
      keywords: ['whatsapp', 'message on whatsapp'],
      execute: async (query: string) => {
        const phoneMatch = query.match(/whatsapp\s+(\+?\d[\d\s\-()]+)/i);
        const phoneNumber = phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : null;
        
        if (phoneNumber) {
          const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;
          try {
            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
              await Linking.openURL(whatsappUrl);
              return true;
            }
          } catch {
            const webUrl = `https://wa.me/${phoneNumber}`;
            await Linking.openURL(webUrl);
            return true;
          }
        } else {
          try {
            await Linking.openURL('whatsapp://');
            return true;
          } catch {
            await Linking.openURL('https://web.whatsapp.com');
            return true;
          }
        }
        return false;
      }
    },

    // // Social Media - TikTok
    // {
    //   name: 'Open TikTok',
    //   description: 'Open TikTok app or search for content',
    //   keywords: ['tiktok', 'tik tok', 'tt', 'short videos'],
    //   execute: async (query: string) => {
    //     const searchMatch = query.match(/tiktok\s+(.+)/i);
    //     const searchTerm = searchMatch ? searchMatch[1].trim() : '';
        
    //     if (searchTerm) {
    //       const encodedSearch = encodeURIComponent(searchTerm);
    //       const tiktokUrl = `https://www.tiktok.com/search?q=${encodedSearch}`;
          
    //       const canOpen = await Linking.canOpenURL(tiktokUrl);
    //       if (canOpen) {
    //         await Linking.openURL(tiktokUrl);
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('tiktok://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://tiktok.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Productivity - Google Drive
    // {
    //   name: 'Open Google Drive',
    //   description: 'Open Google Drive or search for files',
    //   keywords: ['drive', 'google drive', 'gdrive', 'cloud storage'],
    //   execute: async (query: string) => {
    //     const searchMatch = query.match(/(?:drive|gdrive)\s+(.+)/i);
    //     const searchTerm = searchMatch ? searchMatch[1].trim() : '';
        
    //     if (searchTerm) {
    //       const encodedSearch = encodeURIComponent(searchTerm);
    //       const driveUrl = `https://drive.google.com/drive/search?q=${encodedSearch}`;
          
    //       const canOpen = await Linking.canOpenURL(driveUrl);
    //       if (canOpen) {
    //         await Linking.openURL(driveUrl);
    //         return true;
    //       }
    //     } else {
    //       const canOpen = await Linking.canOpenURL('https://drive.google.com');
    //       if (canOpen) {
    //         await Linking.openURL('https://drive.google.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Productivity - Slack
    // {
    //   name: 'Open Slack',
    //   description: 'Open Slack workspace or channel',
    //   keywords: ['slack', 'workspace', 'team chat'],
    //   execute: async (query: string) => {
    //     const channelMatch = query.match(/slack\s+(.+)/i);
    //     const channel = channelMatch ? channelMatch[1].trim() : '';
        
    //     if (channel) {
    //       const slackUrl = `slack://channel?team=&id=${encodeURIComponent(channel)}`;
    //       try {
    //         const canOpen = await Linking.canOpenURL(slackUrl);
    //         if (canOpen) {
    //           await Linking.openURL(slackUrl);
    //           return true;
    //         }
    //       } catch {
    //         await Linking.openURL('https://slack.com');
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('slack://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://slack.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Entertainment - Netflix
    // {
    //   name: 'Open Netflix',
    //   description: 'Open Netflix app or search for shows/movies',
    //   keywords: ['netflix', 'shows', 'movies', 'streaming', 'watch'],
    //   execute: async (query: string) => {
    //     const searchMatch = query.match(/(?:netflix|watch)\s+(.+)/i);
    //     const searchTerm = searchMatch ? searchMatch[1].trim() : '';
        
    //     if (searchTerm) {
    //       const encodedSearch = encodeURIComponent(searchTerm);
    //       const netflixUrl = `https://www.netflix.com/search?q=${encodedSearch}`;
          
    //       try {
    //         const canOpen = await Linking.canOpenURL('netflix://');
    //         if (canOpen) {
    //           await Linking.openURL('netflix://');
    //           return true;
    //         }
    //       } catch {
    //         await Linking.openURL(netflixUrl);
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('netflix://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://netflix.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Food Delivery - Uber Eats
    // {
    //   name: 'Open Uber Eats',
    //   description: 'Open Uber Eats to order food',
    //   keywords: ['uber eats', 'ubereats', 'food delivery', 'order food'],
    //   execute: async (query: string) => {
    //     const restaurantMatch = query.match(/(?:uber eats|ubereats|order food)\s+(.+)/i);
    //     const restaurant = restaurantMatch ? restaurantMatch[1].trim() : '';
        
    //     if (restaurant) {
    //       const encodedSearch = encodeURIComponent(restaurant);
    //       const uberEatsUrl = `https://www.ubereats.com/search?q=${encodedSearch}`;
          
    //       try {
    //         const canOpen = await Linking.canOpenURL('ubereats://');
    //         if (canOpen) {
    //           await Linking.openURL('ubereats://');
    //           return true;
    //         }
    //       } catch {
    //         await Linking.openURL(uberEatsUrl);
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('ubereats://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://ubereats.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Transportation - Uber
    {
      name: 'Book Uber',
      description: 'Open Uber app to book a ride',
      keywords: ['uber', 'ride', 'taxi', 'cab', 'book ride'],
      execute: async (query: string) => {
        const destinationMatch = query.match(/(?:uber|ride|taxi|cab)\s+(?:to\s+)?(.+)/i);
        const destination = destinationMatch ? destinationMatch[1].trim() : '';
        
        if (destination) {
          const encodedDestination = encodeURIComponent(destination);
          const uberUrl = `uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodedDestination}`;
          
          try {
            const canOpen = await Linking.canOpenURL(uberUrl);
            if (canOpen) {
              await Linking.openURL(uberUrl);
              return true;
            }
          } catch {
            const webUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodedDestination}`;
            await Linking.openURL(webUrl);
            return true;
          }
        } else {
          try {
            await Linking.openURL('uber://');
            return true;
          } catch {
            await Linking.openURL('https://uber.com');
            return true;
          }
        }
        return false;
      }
    },

    // // Shopping - Flipkart (Popular in India)
    // {
    //   name: 'Flipkart Search',
    //   description: 'Search for products on Flipkart',
    //   keywords: ['flipkart', 'shop flipkart', 'buy on flipkart'],
    //   execute: async (query: string) => {
    //     const searchMatch = query.match(/(?:flipkart|shop flipkart|buy on flipkart)\s+(.+)/i);
    //     const searchTerm = searchMatch ? searchMatch[1].trim() : 'products';
        
    //     const encodedSearch = encodeURIComponent(searchTerm);
    //     const flipkartUrl = `https://www.flipkart.com/search?q=${encodedSearch}`;
        
    //     const canOpen = await Linking.canOpenURL(flipkartUrl);
    //     if (canOpen) {
    //       await Linking.openURL(flipkartUrl);
    //       return true;
    //     }
    //     return false;
    //   }
    // },

    // // News - Google News
    // {
    //   name: 'Open Google News',
    //   description: 'Open Google News or search for specific topics',
    //   keywords: ['news', 'google news', 'latest news', 'breaking news'],
    //   execute: async (query: string) => {
    //     const topicMatch = query.match(/(?:news|google news)\s+(.+)/i);
    //     const topic = topicMatch ? topicMatch[1].trim() : '';
        
    //     if (topic) {
    //       const encodedTopic = encodeURIComponent(topic);
    //       const newsUrl = `https://news.google.com/search?q=${encodedTopic}`;
          
    //       const canOpen = await Linking.canOpenURL(newsUrl);
    //       if (canOpen) {
    //         await Linking.openURL(newsUrl);
    //         return true;
    //       }
    //     } else {
    //       const canOpen = await Linking.canOpenURL('https://news.google.com');
    //       if (canOpen) {
    //         await Linking.openURL('https://news.google.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Banking - GPay (Google Pay)
    // {
    //   name: 'Open Google Pay',
    //   description: 'Open Google Pay for payments',
    //   keywords: ['gpay', 'google pay', 'payment', 'send money', 'pay'],
    //   execute: async (query: string) => {
    //     try {
    //       await Linking.openURL('gpay://');
    //       return true;
    //     } catch {
    //       try {
    //         await Linking.openURL('https://pay.google.com');
    //         return true;
    //       } catch {
    //         return false;
    //       }
    //     }
    //   }
    // },

    // // Camera & Photos
    // {
    //   name: 'Open Camera',
    //   description: 'Open device camera',
    //   keywords: ['camera', 'photo', 'picture', 'take photo'],
    //   execute: async (query: string) => {
    //     try {
    //       await Linking.openURL('camera://');
    //       return true;
    //     } catch {
    //       return false;
    //     }
    //   }
    // },

    // // App Store
    // {
    //   name: 'Open App Store',
    //   description: 'Open App Store or search for apps',
    //   keywords: ['app store', 'download app', 'install app'],
    //   execute: async (query: string) => {
    //     const appMatch = query.match(/(?:app store|download|install)\s+(.+)/i);
    //     const appName = appMatch ? appMatch[1].trim() : '';
        
    //     if (appName) {
    //       const encodedApp = encodeURIComponent(appName);
    //       const appStoreUrl = `https://apps.apple.com/search?term=${encodedApp}`;
          
    //       const canOpen = await Linking.canOpenURL(appStoreUrl);
    //       if (canOpen) {
    //         await Linking.openURL(appStoreUrl);
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('itms-apps://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://apps.apple.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // },

    // // Calculator
    // {
    //   name: 'Open Calculator',
    //   description: 'Open device calculator',
    //   keywords: ['calculator', 'calc', 'calculate'],
    //   execute: async (query: string) => {
    //     try {
    //       await Linking.openURL('calc://');
    //       return true;
    //     } catch {
    //       return false;
    //     }
    //   }
    // },

    // Weather
    // {
    //   name: 'Check Weather',
    //   description: 'Open weather app or search weather for location',
    //   keywords: ['weather', 'forecast', 'temperature'],
    //   execute: async (query: string) => {
    //     const locationMatch = query.match(/weather\s+(?:in\s+|for\s+)?(.+)/i);
    //     const location = locationMatch ? locationMatch[1].trim() : '';
        
    //     if (location) {
    //       const encodedLocation = encodeURIComponent(location);
    //       const weatherUrl = `https://weather.com/weather/today/l/${encodedLocation}`;
          
    //       const canOpen = await Linking.canOpenURL(weatherUrl);
    //       if (canOpen) {
    //         await Linking.openURL(weatherUrl);
    //         return true;
    //       }
    //     } else {
    //       try {
    //         await Linking.openURL('weather://');
    //         return true;
    //       } catch {
    //         await Linking.openURL('https://weather.com');
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // }
  ];


  /**
   * Process a natural language query and execute appropriate deep link action (original keyword-based method)
   */
  static async processDeepLinkQuery(query: string): Promise<{ success: boolean; action?: string; message?: string }> {
    const normalizedQuery = query.toLowerCase().trim();

    // Find matching actions
    const matches = this.actions.filter(action =>
      action.keywords.some(keyword => normalizedQuery.includes(keyword))
    );

    if (matches.length === 0) {
      return {
        success: false,
        message: 'No matching app or action found for your request.'
      };
    }

    // Try the best match first (most keywords matched)
    const bestMatch = matches.reduce((best, current) => {
      const bestScore = best.keywords.filter(k => normalizedQuery.includes(k)).length;
      const currentScore = current.keywords.filter(k => normalizedQuery.includes(k)).length;
      return currentScore > bestScore ? current : best;
    });

    try {
      const success = await bestMatch.execute(query);

      if (success) {
        return {
          success: true,
          action: bestMatch.name,
          message: `✅ Opened ${bestMatch.name}`
        };
      } else {
        return {
          success: false,
          action: bestMatch.name,
          message: `❌ Could not open ${bestMatch.name}. Make sure the app is installed.`
        };
      }
    } catch (error) {
      console.error('Deep link error:', error);
      return {
        success: false,
        action: bestMatch.name,
        message: `❌ Error opening ${bestMatch.name}: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Get all available deep link actions
   */
  static getAvailableActions(): DeepLinkAction[] {
    return this.actions;
  }

  /**
   * Check if a query might be a deep link request
   */
  static isDeepLinkQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    return this.actions.some(action =>
      action.keywords.some(keyword => normalizedQuery.includes(keyword))
    );
  }


  /**
   * Get suggestions for deep link actions
   */
  static getSuggestions(): string[] {
    return [
      // Communication
      "Call John at +1234567890",
      "Send a text to +1234567890",
      "WhatsApp +1234567890",
      "Email john@example.com subject Meeting body Let's discuss the project",
      "Open contacts",
      
      // Shopping
      "Show me shoes under $100 on Amazon",
      "Buy iPhone on Flipkart",
      
      // Entertainment
      "Play some jazz music on Spotify",
      "Watch cooking tutorials on YouTube",
      "Netflix Breaking Bad",
      "TikTok dance videos",
      
      // Social Media
      "Instagram @username",
      "Twitter #trending",
      
      // Navigation & Travel
      "Navigate to Central Park",
      "Uber to airport",
      "Order food from McDonald's",
      
      // Productivity
      "Google Drive project files",
      "Slack #general",
      "Open camera",
      "Calculator",
      
      // News & Weather
      "News about technology",
      "Weather in New York",
      
      // Payments & Apps
      "Google Pay",
      "Download Instagram app",
      "Open settings"
    ];
  }
}
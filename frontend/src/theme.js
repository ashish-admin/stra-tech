// Centralised theme definitions for the LokDarpan dashboard.
// Defining colours in a single file ensures consistency across
// components and makes it easy to update the palette in the future.

const emotionColors = {
  Joy: '#10B981',        // Green – positive / joy
  Positive: '#10B981',   // Same as Joy
  Anger: '#EF4444',      // Red – anger / frustration
  Frustration: '#EF4444',
  Sadness: '#3B82F6',    // Blue – sadness
  Fear: '#8B5CF6',       // Purple – fear
  Surprise: '#F59E0B',   // Amber – surprise
  Neutral: '#6B7280'     // Gray – neutral
};

export default emotionColors;

// Colour definitions for political parties used in the competitive analysis.
// Mapping from author/party names to brand colours helps stakeholders
// quickly identify which bar belongs to which party.  If a party is
// missing here, charts will fall back to emotion colours.
export const partyColors = {
  'BJP Telangana': '#F57C00',      // orange for BJP
  'BRS Party': '#E91E63',          // pink for BRS
  AIMIM: '#4CAF50',                // green for AIMIM
  'Telangana Congress': '#2196F3', // blue for Congress
  'Others': '#9CA3AF'              // grey for any other party
};
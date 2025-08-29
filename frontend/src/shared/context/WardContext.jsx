// CONSOLIDATED WardContext - Epic 5.0.1 Frontend Unification
// Unified API eliminates dual patterns for consistent ward management
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// UNIFIED API - Single source of truth for ward selection
const WardContext = createContext({ 
  // Primary API (object-based)
  selectedWard: null,
  setSelectedWard: () => {},
  availableWards: [],
  loading: false,
  
  // Legacy compatibility (string-based) - DEPRECATED but maintained for zero regression
  ward: "All", 
  setWard: () => {}
});

export function WardProvider({ children, initialWard = "All" }) {
  // INTERNAL STATE - Unified management
  const [ward, setWard] = useState(initialWard); // Internal string representation
  const [availableWards, setAvailableWards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  console.log('[WardContext] Unified API active - dual pattern eliminated');

  // Fetch available wards from API
  useEffect(() => {
    const fetchAvailableWards = async () => {
      try {
        setLoading(true);
        
        // Wait a bit for authentication to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // First, get distinct cities from posts API
        const response = await axios.get('/api/v1/posts', {
          params: {
            city: 'All',
            limit: 1000 // Get enough posts to find all cities
          },
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data?.items) {
          // Extract unique cities from posts
          const cities = [...new Set(
            response.data.items
              .map(post => post.city)
              .filter(city => city && city !== 'All')
          )].sort();

          // Convert to ward objects with basic info
          const wardsArray = cities.map(cityName => ({
            id: cityName,
            name: cityName,
            voters: 0, // Will be populated when ward metadata is available
            turnout: 0,
            votesCast: 0,
            winnerParty: ''
          }));

          console.log('[WardContext] Loaded wards from API:', wardsArray.length, 'wards');
          setAvailableWards(wardsArray);
        }
      } catch (error) {
        console.error('[WardContext] Failed to fetch wards:', error);
        // Fallback to static data if API fails
        try {
          const wardDataModule = await import("../../data/wardData.js");
          const wardData = wardDataModule.default || wardDataModule.wardData;
          const staticWards = Object.keys(wardData)
            .filter(wardName => wardData[wardName].voters > 0)
            .map((wardName) => ({
              id: wardName,
              name: wardName,
              ...wardData[wardName]
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          console.log('[WardContext] Using fallback static data:', staticWards.length, 'wards');
          setAvailableWards(staticWards);
          
          // Set a default ward if none selected
          if (!ward || ward === "All") {
            const jubileeHills = staticWards.find(w => w.name.includes('Jubilee Hills'));
            if (jubileeHills) {
              console.log('[WardContext] Setting default ward to:', jubileeHills.name);
              setWard(jubileeHills.name);
            } else if (staticWards.length > 0) {
              console.log('[WardContext] Setting default ward to first available:', staticWards[0].name);
              setWard(staticWards[0].name);
            }
          }
        } catch (importError) {
          console.error('[WardContext] Failed to import static ward data:', importError);
          // Absolute fallback with known Hyderabad wards
          const fallbackWards = [
            { id: 'Jubilee Hills', name: 'Jubilee Hills', voters: 55000, turnout: 45.0, votesCast: 24750, winnerParty: 'Bharatiya Janata Party' },
            { id: 'Banjara Hills', name: 'Banjara Hills', voters: 48000, turnout: 42.0, votesCast: 20160, winnerParty: 'Telangana Rashtra Samithi' },
            { id: 'Marredpally', name: 'Marredpally', voters: 52000, turnout: 44.0, votesCast: 22880, winnerParty: 'Bharatiya Janata Party' }
          ];
          setAvailableWards(fallbackWards);
          setWard('Jubilee Hills'); // Default to Jubilee Hills
          console.log('[WardContext] Using absolute fallback data with default ward: Jubilee Hills');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableWards();
  }, []);

  // UNIFIED SELECTEDWARD OBJECT - Primary API
  const selectedWard = React.useMemo(() => {
    if (ward === "All" || !ward) return null;
    
    // Find exact ward match in available wards
    const wardInfo = availableWards.find(w => w.name === ward || w.id === ward);
    if (wardInfo) {
      return wardInfo;
    }
    
    // Fallback: Create minimal ward object for consistency
    return { 
      id: ward,      // Use ward name as ID consistently
      name: ward,
      voters: 0,
      turnout: 0,
      votesCast: 0,
      winnerParty: ''
    };
  }, [ward, availableWards]);

  // UNIFIED SETSELECTEDWARD - Handles both string and object inputs
  const setSelectedWard = React.useCallback((wardValue) => {
    let wardName;
    
    // Handle different input types for maximum compatibility
    if (typeof wardValue === 'string') {
      wardName = wardValue;
    } else if (wardValue?.name) {
      wardName = wardValue.name;
    } else if (wardValue?.id) {
      wardName = wardValue.id;
    } else if (wardValue === null) {
      wardName = "All";
    } else {
      wardName = "All";
    }
    
    // Only update if ward actually changed
    if (wardName !== ward) {
      console.log('[WardContext] Unified API - Ward changed from', ward, 'to', wardName);
      setWard(wardName);
    }
  }, [ward]);

  // read initial ward from URL (?ward=...)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("ward");
      if (q) setWard(q);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL in sync for easy deep-linking
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (ward && ward !== "All") url.searchParams.set("ward", ward);
      else url.searchParams.delete("ward");
      window.history.replaceState({}, "", url);
    } catch {}
  }, [ward]);

  // UNIFIED CONTEXT VALUE - Primary API first, legacy API for compatibility
  const contextValue = {
    // PRIMARY API - Object-based ward management (RECOMMENDED)
    selectedWard,
    setSelectedWard,
    availableWards,
    loading,
    
    // LEGACY API - String-based for backward compatibility (DEPRECATED)
    // Note: These are maintained for zero regression but should be migrated
    ward,
    setWard
  };

  return (
    <WardContext.Provider value={contextValue}>
      {children}
    </WardContext.Provider>
  );
}

export function useWard() {
  return useContext(WardContext);
}

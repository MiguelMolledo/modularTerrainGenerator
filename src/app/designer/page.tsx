'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapDesigner } from '@/components/map-designer';
import { useMapStore } from '@/store/mapStore';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { getLastMapId } from '@/components/map-designer/UnsavedChangesGuard';

function MapLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mapId = searchParams.get('mapId');
  const [checkedLastMap, setCheckedLastMap] = useState(false);

  const { loadMapData, currentMapId, setAvailablePieces, setTerrainTypes, resetToNewMap } = useMapStore();
  const { loadMap } = useMapInventoryStore();
  const { terrainTypes, shapes, fetchTerrainTypes, fetchShapes, getModularPieces } = useInventoryStore();

  // Check for last map on initial load (no mapId in URL)
  useEffect(() => {
    if (!mapId && !checkedLastMap) {
      const lastMapId = getLastMapId();
      if (lastMapId) {
        // Redirect to the last map
        router.replace(`/designer?mapId=${lastMapId}`);
      } else {
        resetToNewMap();
      }
      setCheckedLastMap(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, checkedLastMap]); // Check only on mount and when mapId changes

  // Load inventory data on mount
  useEffect(() => {
    fetchTerrainTypes();
    fetchShapes();
  }, [fetchTerrainTypes, fetchShapes]);

  // Update available pieces when inventory changes
  useEffect(() => {
    if (terrainTypes.length > 0 && shapes.length > 0) {
      const pieces = getModularPieces();
      if (pieces.length > 0) {
        setAvailablePieces(pieces);
        // Also update terrain types for the sidebar
        // Include both UUID and slug so we can look up by either
        const simpleTerrainTypes = terrainTypes.map(t => ({
          id: t.id, // Use actual UUID for custom piece cellColors lookup
          slug: t.slug, // Keep slug for regular piece terrainTypeId lookup
          name: t.name,
          color: t.color,
          icon: t.icon,
        }));
        setTerrainTypes(simpleTerrainTypes);
      }
    }
  }, [terrainTypes, shapes, getModularPieces, setAvailablePieces, setTerrainTypes]);

  useEffect(() => {
    // Load map if mapId is in URL and different from current
    if (mapId && mapId !== currentMapId) {
      loadMap(mapId).then((map) => {
        if (map) {
          loadMapData(
            {
              name: map.name,
              description: map.description,
              mapWidth: map.mapWidth,
              mapHeight: map.mapHeight,
              levels: map.levels,
              placedPieces: map.placedPieces,
              gridConfig: map.gridConfig,
            },
            map.id
          );
        }
      });
    }
  }, [mapId, currentMapId, loadMap, loadMapData]);

  return <MapDesigner />;
}

export default function DesignerPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-3rem)] bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
      <MapLoader />
    </Suspense>
  );
}

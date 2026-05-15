import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Filtre global d'agence (visible uniquement pour ADMIN qui voit tout)
//   selectedAgencyId === null  -> "Toutes les agences"
//   selectedAgencyId === 'xxx' -> filtre toutes les données sur cette agence

export const useAgencyFilterStore = create(persist(
  (set) => ({
    selectedAgencyId: null,
    selectedAgencyName: 'Toutes les agences',
    setSelectedAgency: (id, name) => set({
      selectedAgencyId: id || null,
      selectedAgencyName: name || 'Toutes les agences',
    }),
  }),
  { name: 'gtsr-agency-filter' },
));

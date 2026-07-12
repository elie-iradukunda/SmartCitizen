export const kacyiruLocation = {
  province: 'Kigali City',
  district: 'Gasabo',
  sector: 'Kacyiru',
  cells: [
    {
      name: 'Kamatamu',
      villages: ['Kamatamu', 'Kamuhire', 'Nyagacyamo', 'Umucyo']
    },
    {
      name: 'Kamutwa',
      villages: ['Kamutwa', 'Rugando', 'Kacyiru', 'Ubumwe']
    },
    {
      name: 'Kibaza',
      villages: ['Kibaza', 'Virunga', 'Agatare', 'Ubumwe']
    }
  ]
};

export const defaultKacyiruCell = kacyiruLocation.cells[0].name;
export const defaultKacyiruVillage = kacyiruLocation.cells[0].villages[0];

export const villagesForCell = (cellName) => (
  kacyiruLocation.cells.find((cell) => cell.name === cellName)?.villages || []
);

export const kacyiruDefaults = {
  province: kacyiruLocation.province,
  district: kacyiruLocation.district,
  sector: kacyiruLocation.sector,
  cell: defaultKacyiruCell,
  village: defaultKacyiruVillage
};

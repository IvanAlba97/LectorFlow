const COLORS = {
  primary: '#4A6B7C',
  secondary: '#D9C7B0',
  background: '#F8F5ED',
  text: '#3A3A3A',
  lightText: '#8C8C8C',
  white: '#FFFFFF',
  black: '#000000',
  error: '#FF0000',
  success: '#4CAF50',
  pieChart: ['#6B8E23', '#CD853F', '#8A2BE2', '#A52A2A', '#5F9EA0', '#D2691E', '#FF7F50', '#6495ED', '#DC143C', '#00FFFF'],
};

const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
};

const FONTS = {
  bold: 'SpaceMono',
  regular: 'SpaceMono',
  medium: 'SpaceMono',
};

const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.29,
    shadowRadius: 4.65,
    elevation: 7,
  },
};

export { COLORS, SIZES, FONTS, SHADOWS };
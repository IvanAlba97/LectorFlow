import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';

import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const AnimatedReadingGridItem = ({
  item,
  index,
  handleBookPress,
  screenWidth,
  numColumns,
  itemWidth,
}) => {

  return (
    <TouchableOpacity onPress={() => handleBookPress(item.bookId)} style={[styles.gridBookItem, { width: itemWidth, height: itemWidth * 1.5 }]}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl.replace('http://', 'https://') }} style={styles.gridBookCover} />
      ) : (
        <Image source={require('../assets/images/icon.png')} style={styles.gridBookCover} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridBookItem: {
    marginBottom: SIZES.medium,
    borderRadius: SIZES.small / 2,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gridBookCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default AnimatedReadingGridItem;
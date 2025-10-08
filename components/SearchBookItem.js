import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const AnimatedSearchBookItem = ({ item, index, handleBookPress }) => {
  return (
    <View>
      <TouchableOpacity onPress={() => handleBookPress(item.key)} style={styles.bookItem}>
        {item.coverUrl && <Image source={{ uri: item.coverUrl.replace('http://', 'https://') }} style={styles.coverImage} />}
        <View style={styles.bookDetails}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.author}>{item.author}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bookItem: {
    padding: SIZES.medium,
    borderBottomColor: COLORS.lightText,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginBottom: SIZES.small,
    borderRadius: SIZES.small,
    ...SHADOWS.light,
  },
  coverImage: {
    width: 80,
    height: 120,
    marginRight: SIZES.medium,
    resizeMode: 'contain',
    borderRadius: SIZES.small,
  },
  bookDetails: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  author: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
  },
});

export default AnimatedSearchBookItem;
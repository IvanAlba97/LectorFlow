import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const AnimatedReadingListItem = ({
  item,
  index,
  listName,
  handleBookPress,
  handleOpenProgressModal,
  handleDeleteBook,
}) => {
  const progressText = () => {
    if (item.progressType === 'percentage') {
      return `Progreso: ${item.currentPage}%`;
    } else {
      const percentage = item.totalPages > 0 ? ((item.currentPage / item.totalPages) * 100).toFixed(0) : 0;
      return `Progreso: ${item.currentPage} / ${item.totalPages} (${percentage}%)`;
    }
  };

  const progressBarWidth = () => {
    if (item.progressType === 'percentage') {
      return `${item.currentPage}%`;
    } else {
      return item.totalPages > 0 ? `${(item.currentPage / item.totalPages) * 100}%` : '0%';
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => handleBookPress(item.bookId)} style={styles.bookItem}>
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl.replace('http://', 'https://') }} style={styles.bookCover} />
        ) : (
          <Image source={require('../assets/images/icon.png')} style={styles.bookCover} />
        )}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1} ellipsizeMode="tail">
            {item.author}
          </Text>
          {listName === 'Leyendo' && item.currentPage !== null && (
            <>
              <Text style={styles.progressText}>{progressText()}</Text>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: progressBarWidth() },
                  ]}
                />
              </View>
            </>
          )}
        </View>
        <View style={styles.actionButtonsContainer}>
          {listName === 'Leyendo' && (
            <TouchableOpacity
              onPress={() => handleOpenProgressModal(item)}
              style={styles.updateProgressButton}
            >
              <MaterialCommunityIcons name="pencil" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteBook(item.id);
            }}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bookItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    marginBottom: SIZES.small,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
    width: '100%',
    padding: SIZES.small,
    ...SHADOWS.medium,
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: SIZES.small / 2,
    marginRight: SIZES.small,
    resizeMode: 'cover',
  },
  bookInfo: {
    flex: 1,
    flexShrink: 1,
    overflow: 'hidden',
    minWidth: 0,
  },
  bookTitle: {
    color: COLORS.text,
    fontSize: SIZES.medium,
    fontFamily: FONTS.semiBold,
  },
  bookAuthor: {
    color: COLORS.lightText,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    marginBottom: SIZES.tiny,
  },
  progressText: {
    color: COLORS.lightText,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    marginTop: SIZES.tiny,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.medium,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.small,
  },
  updateProgressButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBackground: {
    height: 5,
    width: '100%',
    backgroundColor: COLORS.lightText,
    borderRadius: SIZES.small,
    marginTop: SIZES.tiny,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.small,
  },
});

export default AnimatedReadingListItem;